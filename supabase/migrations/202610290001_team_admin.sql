-- Install once as the Supabase project owner; no existing membership is changed.
begin;
create schema if not exists pv_private;
revoke all on schema pv_private from public,anon;
grant usage on schema pv_private to authenticated;
create function pv_private.admin_list_members(p_farm uuid)
returns table(user_id uuid,email text,role text)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.pv_member_role(p_farm) is distinct from 'admin' then
  raise exception 'Gestion des utilisateurs réservée aux administrateurs' using errcode='42501';
 end if;
 return query select m.user_id,u.email::text,m.role from public.pv_members m
 join auth.users u on u.id=m.user_id where m.farm_id=p_farm order by lower(u.email),m.user_id;
end $$;
create function pv_private.admin_add_member(p_farm uuid,p_email text,p_role text default 'editor')
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 -- Serialize membership mutations for an élevage, then check current authority.
 perform 1 from public.pv_farms where id=p_farm for update;
 if auth.uid() is null or public.pv_member_role(p_farm) is distinct from 'admin' then
  raise exception 'Gestion des utilisateurs réservée aux administrateurs' using errcode='42501';
 end if;
 if p_role is null or p_role not in ('admin','editor','viewer') then raise exception 'Rôle invalide' using errcode='22023'; end if;
 if p_email is null or length(trim(p_email))=0 then raise exception 'Adresse e-mail requise' using errcode='22023'; end if;
 if (select count(*) from auth.users u where lower(u.email)=lower(trim(p_email)))>1 then raise exception 'Plusieurs comptes correspondent à cette adresse. Vérifiez Authentication.' using errcode='22023'; end if;
 select u.id into target from auth.users u where lower(u.email)=lower(trim(p_email));
 if target is null then raise exception 'Compte introuvable. Créez d’abord le compte dans Supabase Authentication.' using errcode='22023'; end if;
 -- Lock the target too: concurrent additions to different farms cannot break login.
 perform 1 from auth.users where id=target for update;
 if exists(select 1 from public.pv_members where user_id=target and farm_id<>p_farm) then
  raise exception 'Ce compte est déjà rattaché à un autre élevage.' using errcode='22023';
 end if;
 if exists(select 1 from public.pv_members where user_id=target and farm_id=p_farm) then
  raise exception 'Ce compte est déjà membre de cet élevage.' using errcode='22023';
 end if;
 insert into public.pv_members(farm_id,user_id,role) values(p_farm,target,p_role);
end $$;
create function pv_private.admin_change_member(p_farm uuid,p_user uuid,p_role text default null)
returns void language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.pv_farms where id=p_farm for update;
 if auth.uid() is null or public.pv_member_role(p_farm) is distinct from 'admin' then
  raise exception 'Gestion des utilisateurs réservée aux administrateurs' using errcode='42501';
 end if;
 if p_user=auth.uid() then raise exception 'Vous ne pouvez pas retirer ou modifier votre propre accès.' using errcode='22023'; end if;
 if p_role is not null and p_role not in ('admin','editor','viewer') then raise exception 'Rôle invalide' using errcode='22023'; end if;
 select role into old_role from public.pv_members where farm_id=p_farm and user_id=p_user;
 if old_role is null then raise exception 'Membre introuvable' using errcode='22023'; end if;
 if old_role='admin' and p_role is distinct from 'admin' and
  (select count(*) from public.pv_members where farm_id=p_farm and role='admin')<=1 then
  raise exception 'Conservez au moins un administrateur.' using errcode='22023';
 end if;
 if p_role is null then delete from public.pv_members where farm_id=p_farm and user_id=p_user;
 else update public.pv_members set role=p_role where farm_id=p_farm and user_id=p_user;end if;
end $$;
revoke all on function pv_private.admin_list_members(uuid),pv_private.admin_add_member(uuid,text,text),pv_private.admin_change_member(uuid,uuid,text) from public,anon;
grant execute on function pv_private.admin_list_members(uuid),pv_private.admin_add_member(uuid,text,text),pv_private.admin_change_member(uuid,uuid,text) to authenticated;
create function public.pv_admin_list_members(p_farm uuid)
returns table(user_id uuid,email text,role text)
language sql security invoker set search_path='' as $$ select * from pv_private.admin_list_members(p_farm) $$;
create function public.pv_admin_add_member(p_farm uuid,p_email text,p_role text default 'editor')
returns void language sql security invoker set search_path='' as $$ select pv_private.admin_add_member(p_farm,p_email,p_role) $$;
create function public.pv_admin_change_member(p_farm uuid,p_user uuid,p_role text default null)
returns void language sql security invoker set search_path='' as $$ select pv_private.admin_change_member(p_farm,p_user,p_role) $$;
revoke all on function public.pv_admin_list_members(uuid),public.pv_admin_add_member(uuid,text,text),public.pv_admin_change_member(uuid,uuid,text) from public,anon;
grant execute on function public.pv_admin_list_members(uuid),public.pv_admin_add_member(uuid,text,text),public.pv_admin_change_member(uuid,uuid,text) to authenticated;
commit;
