-- Application snapshots: no Auth passwords or roles are restored.
begin;
create table pv_private.backups (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null,
 created_at timestamptz not null default clock_timestamp(), reason text not null,
 document jsonb not null, archived_at timestamptz, archive_path text, archive_error text
);
create index backups_farm_time on pv_private.backups(farm_id,created_at desc);
alter table pv_private.backups enable row level security;
revoke all on pv_private.backups from public,anon,authenticated;
create table pv_private.restorations (
 request_id uuid primary key, farm_id uuid not null, actor_id uuid not null,
 created_at timestamptz not null default now(), source_checksum text not null, result jsonb not null
);
alter table pv_private.restorations enable row level security;
revoke all on pv_private.restorations from public,anon,authenticated;
create function pv_private.backup_records(p_farm uuid) returns jsonb
language sql set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.kind,r.id),'[]'::jsonb) from public.pv_records r where farm_id=p_farm
$$;
create function pv_private.backup_hash(p_records jsonb) returns text
language sql immutable set search_path='' as $$select encode(sha256(convert_to(p_records::text,'UTF8')),'hex')$$;
create function pv_private.capture_backup(p_farm uuid,p_reason text) returns uuid
language plpgsql set search_path='' as $$
declare rows jsonb; result uuid;
begin
 perform 1 from public.pv_farms where id=p_farm for update;
 rows:=pv_private.backup_records(p_farm);
 insert into pv_private.backups(farm_id,reason,document) values(p_farm,p_reason,
 jsonb_build_object('format','prevert-backup','schemaVersion',1,'farmId',p_farm,'createdAt',clock_timestamp(),'records',rows,'checksum',pv_private.backup_hash(rows))) returning id into result;
 return result;
end $$;
-- Every successful change retains the previous full state. A failed write rolls it back.
create function pv_private.before_record_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('pv.restoring',true) is distinct from 'yes' then
  perform pv_private.capture_backup(coalesce(new.farm_id,old.farm_id),'before-change');
 end if;
 return coalesce(new,old);
end $$;
create trigger pv_backup_before_change before update or delete on public.pv_records
for each row execute function pv_private.before_record_change();
create function pv_private.backup_admin(p_farm uuid,p_action text,p_id uuid default null,p_document jsonb default null,p_expected text default null,p_request uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc jsonb; rows jsonb; restore_row jsonb; prior pv_private.restorations; before_id uuid; result jsonb; current_hash text;
begin
 perform 1 from public.pv_farms where id=p_farm for update;
 if auth.uid() is null or public.pv_member_role(p_farm) is distinct from 'admin' then
  raise exception 'Sauvegardes réservées aux administrateurs' using errcode='42501';
 end if;
 current_hash:=pv_private.backup_hash(pv_private.backup_records(p_farm));
 if p_action='list' then
  return jsonb_build_object('fingerprint',current_hash,'backups',coalesce((select jsonb_agg(x order by x.created_at desc) from
   (select id,created_at,reason,archived_at,archive_error,
    (select count(*) from jsonb_array_elements(document->'records') r where r->>'kind'='animal' and not (r->>'deleted')::boolean) animals,
    (select count(*) from jsonb_array_elements(document->'records') r where r->>'kind'='weight' and not (r->>'deleted')::boolean) weights,
    (select count(*) from jsonb_array_elements(document->'records') r where r->>'kind'='score' and not (r->>'deleted')::boolean) scores
    from pv_private.backups where farm_id=p_farm order by created_at desc limit 1000) x),'[]'::jsonb),
    'lastArchive',(select max(archived_at) from pv_private.backups where farm_id=p_farm));
 end if;
 if p_action not in ('download','restore') then raise exception 'Action inconnue' using errcode='22023'; end if;
 if p_id is not null then select document into doc from pv_private.backups where id=p_id and farm_id=p_farm;
 else doc:=p_document; end if;
 if doc is null then raise exception 'Sauvegarde introuvable' using errcode='22023'; end if;
 if p_action='download' then return doc; end if;
 if p_request is null then raise exception 'Identifiant de restauration requis' using errcode='22023'; end if;
 rows:=doc->'records';
 if (doc->>'format') is distinct from 'prevert-backup' or (doc->>'schemaVersion') is distinct from '1'
 or (doc->>'farmId') is distinct from p_farm::text or jsonb_typeof(rows) is distinct from 'array' then
  raise exception 'Format ou élevage de la sauvegarde incorrect' using errcode='22023'; end if;
 if octet_length(doc::text)>40000000 or jsonb_array_length(rows)>50000 then raise exception 'Sauvegarde trop volumineuse' using errcode='22023'; end if;
 if doc ? 'checksum' and doc->>'checksum' is distinct from pv_private.backup_hash(rows) then raise exception 'Intégrité de la sauvegarde incorrecte' using errcode='22023'; end if;
 select * into prior from pv_private.restorations where request_id=p_request;
 if found then
  if prior.farm_id<>p_farm or prior.actor_id<>auth.uid() or prior.source_checksum<>pv_private.backup_hash(rows) then raise exception 'Identifiant déjà utilisé' using errcode='22023'; end if;
  return prior.result;
 end if;
 if p_expected is distinct from current_hash then raise exception 'Les données ont changé. Actualisez les sauvegardes avant de confirmer.' using errcode='40001'; end if;
 if exists(select 1 from jsonb_array_elements(rows) r where jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'payload') is distinct from 'object'
  or coalesce(r->>'kind','') not in ('animal','lot','weight','score','treatment','ration') or coalesce(length(r->>'id'),0) not between 1 and 200
  or jsonb_typeof(r->'deleted') is distinct from 'boolean'
  or (r->>'kind' in ('animal','lot') and (r->'payload'->>'id') is distinct from (r->>'id')))
 then raise exception 'Enregistrements invalides dans la sauvegarde' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(rows) r group by r->>'kind',r->>'id' having count(*)>1) then raise exception 'Identifiants dupliqués' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(rows) r where r->>'kind' not in ('animal','lot') and not exists
  (select 1 from jsonb_array_elements(rows) p where p->>'kind'=r->>'subject_kind' and p->>'id'=r->>'subject_id'))
 then raise exception 'Historique sans fiche parent dans la sauvegarde' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(rows) r join public.pv_records p on p.farm_id=p_farm and p.kind=r->>'kind' and p.id=r->>'id'
  where p.subject_kind is distinct from r->>'subject_kind' or p.subject_id is distinct from r->>'subject_id')
 then raise exception 'Parent d’un historique incohérent' using errcode='22023'; end if;
 before_id:=pv_private.capture_backup(p_farm,'before-restore');
 perform set_config('pv.restoring','yes',true);
 -- Keep tombstones and increment versions: offline devices cannot silently overwrite restored rows.
 update public.pv_records set deleted=true,version=version+1,updated_at=clock_timestamp(),updated_by=auth.uid() where farm_id=p_farm;
 for restore_row in select value from jsonb_array_elements(rows) order by case when value->>'kind' in ('animal','lot') then 0 else 1 end loop
  insert into public.pv_records(farm_id,kind,id,subject_kind,subject_id,payload,deleted,version,updated_by)
  values(p_farm,restore_row->>'kind',restore_row->>'id',restore_row->>'subject_kind',restore_row->>'subject_id',restore_row->'payload',(restore_row->>'deleted')::boolean,1,auth.uid())
  on conflict(farm_id,kind,id) do update set payload=excluded.payload,deleted=excluded.deleted,version=public.pv_records.version+1,updated_at=clock_timestamp(),updated_by=auth.uid();
 end loop;
 perform set_config('pv.restoring','no',true);
 perform pv_private.capture_backup(p_farm,'after-restore');
 result:=jsonb_build_object('beforeBackup',before_id,'records',pv_private.backup_records(p_farm));
 insert into pv_private.restorations(request_id,farm_id,actor_id,source_checksum,result) values(p_request,p_farm,auth.uid(),pv_private.backup_hash(rows),result);
 return result;
end $$;
create function public.pv_backup_admin(p_farm uuid,p_action text,p_id uuid default null,p_document jsonb default null,p_expected text default null,p_request uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select pv_private.backup_admin(p_farm,p_action,p_id,p_document,p_expected,p_request)$$;
revoke all on function pv_private.backup_records(uuid),pv_private.backup_hash(jsonb),pv_private.capture_backup(uuid,text),pv_private.before_record_change(),pv_private.backup_admin(uuid,text,uuid,jsonb,text,uuid),public.pv_backup_admin(uuid,text,uuid,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function pv_private.backup_admin(uuid,text,uuid,jsonb,text,uuid),public.pv_backup_admin(uuid,text,uuid,jsonb,text,uuid) to authenticated;
create or replace function public.pv_apply_operation(
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
 perform 1 from public.pv_farms where id=p_farm for update;
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

select pv_private.capture_backup(id,'initial') from public.pv_farms;
commit;
