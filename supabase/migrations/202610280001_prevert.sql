-- Pré Vert Engraissement — run once as project administrator in SQL Editor.
-- Creates new pv_* objects only; does not import or overwrite local application data.
begin;
create table public.pv_farms (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 160),
 created_at timestamptz not null default now()
);
create table public.pv_members (
 farm_id uuid not null references public.pv_farms(id),
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('admin','editor','viewer')),
 primary key (farm_id,user_id)
);
create index pv_members_user on public.pv_members(user_id);
create function public.pv_member_role(p_farm uuid) returns text
 language sql stable security definer set search_path = ''
 as $$ select m.role from public.pv_members m where m.farm_id=p_farm and m.user_id=(select auth.uid()) $$;
revoke all on function public.pv_member_role(uuid) from public,anon;
grant execute on function public.pv_member_role(uuid) to authenticated;

create table public.pv_records (
 farm_id uuid not null references public.pv_farms(id),
 kind text not null check (kind in ('animal','lot','weight','score','treatment','ration')),
 id text not null check (length(id) between 1 and 200),
 subject_kind text,
 subject_id text,
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 version bigint not null check (version>0),
 deleted boolean not null default false,
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id),
 primary key (farm_id,kind,id),
 foreign key(farm_id,subject_kind,subject_id) references public.pv_records(farm_id,kind,id),
 check (coalesce((kind in ('animal','lot') and subject_kind is null and subject_id is null)
 or (kind in ('weight','score','treatment') and subject_kind='animal' and subject_id is not null)
 or (kind='ration' and subject_kind in ('animal','lot') and subject_id is not null),false)),
 check (kind<>'animal' or coalesce((jsonb_typeof(payload->'number')='string' and length(trim(payload->>'number'))>0),false)),
 check (kind not in ('animal','lot') or not (payload ?| array['weights','scores','treatments','rations']))
);
create unique index pv_animal_number on public.pv_records(farm_id,upper(regexp_replace(payload->>'number','\s','','g'))) where kind='animal' and not deleted;
create index pv_records_subject on public.pv_records(farm_id,subject_kind,subject_id);
create table public.pv_operations (
 farm_id uuid not null references public.pv_farms(id),
 operation_id uuid not null,
 actor_id uuid not null references auth.users(id),
 request jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default now(),
 primary key(farm_id,operation_id)
);

alter table public.pv_farms enable row level security;
alter table public.pv_members enable row level security;
alter table public.pv_records enable row level security;
alter table public.pv_operations enable row level security;
revoke all on public.pv_farms,public.pv_members,public.pv_records,public.pv_operations from public,anon,authenticated;
grant select on public.pv_farms,public.pv_members,public.pv_records,public.pv_operations to authenticated;
create policy pv_farms_read on public.pv_farms for select to authenticated using (public.pv_member_role(id) is not null);
create policy pv_members_read on public.pv_members for select to authenticated using (user_id=(select auth.uid()));
create policy pv_records_read on public.pv_records for select to authenticated using (public.pv_member_role(farm_id) is not null);
create policy pv_operations_read on public.pv_operations for select to authenticated using (actor_id=(select auth.uid()) and public.pv_member_role(farm_id) is not null);

-- All application writes go through compare-and-swap, never a blind upsert.
create function public.pv_apply_operation(
 p_farm uuid,p_operation uuid,p_kind text,p_id text,p_expected bigint,
 p_payload jsonb,p_deleted boolean default false,p_subject_kind text default null,p_subject_id text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := auth.uid();
 role_name text;
 request_data jsonb;
 previous public.pv_operations;
 current_row public.pv_records;
 response_data jsonb;
begin
 role_name := public.pv_member_role(p_farm);
 if actor is null or role_name is null or role_name not in ('admin','editor') then
  raise exception 'Accès en écriture refusé' using errcode='42501';
 end if;
 if p_operation is null or p_id is null or p_kind is null or p_expected is null or p_expected<0 or p_payload is null or p_deleted is null then
  raise exception 'Opération incomplète' using errcode='22023';
 end if;
 request_data:=jsonb_build_object('kind',p_kind,'id',p_id,'expected',p_expected,'payload',p_payload,'deleted',p_deleted,'subject_kind',p_subject_kind,'subject_id',p_subject_id);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_farm::text||p_operation::text,0));
 select * into previous from public.pv_operations where farm_id=p_farm and operation_id=p_operation;
 if found then
  if previous.actor_id<>actor or previous.request is distinct from request_data then
   raise exception 'Identifiant opération déjà utilisé' using errcode='22023';
  end if;
  return previous.response;
 end if;
 -- Lock the logical record also when it does not yet exist.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_farm::text||':'||p_kind||':'||p_id,0));
 select * into current_row from public.pv_records where farm_id=p_farm and kind=p_kind and id=p_id for update;
 if (not found and p_expected<>0) or (found and current_row.version<>p_expected) then
  response_data:=jsonb_build_object('status','conflict','current',case when current_row.id is null then null else to_jsonb(current_row) end);
 elsif current_row.id is null then
  if p_deleted then raise exception 'Impossible de supprimer un enregistrement absent' using errcode='22023'; end if;
  insert into public.pv_records(farm_id,kind,id,subject_kind,subject_id,payload,version,deleted,updated_by)
   values(p_farm,p_kind,p_id,p_subject_kind,p_subject_id,p_payload,1,false,actor) returning * into current_row;
  response_data:=jsonb_build_object('status','applied','record',to_jsonb(current_row));
 else
  if current_row.subject_kind is distinct from p_subject_kind or current_row.subject_id is distinct from p_subject_id then
   raise exception 'Le parent d’un événement ne peut pas être modifié' using errcode='22023';
  end if;
  update public.pv_records set payload=p_payload,deleted=p_deleted,version=version+1,updated_at=clock_timestamp(),updated_by=actor
   where farm_id=p_farm and kind=p_kind and id=p_id returning * into current_row;
  response_data:=jsonb_build_object('status','applied','record',to_jsonb(current_row));
 end if;
 insert into public.pv_operations(farm_id,operation_id,actor_id,request,response) values(p_farm,p_operation,actor,request_data,response_data);
 return response_data;
end $$;
revoke all on function public.pv_apply_operation(uuid,uuid,text,text,bigint,jsonb,boolean,text,text) from public,anon;
grant execute on function public.pv_apply_operation(uuid,uuid,text,text,bigint,jsonb,boolean,text,text) to authenticated;
commit;
