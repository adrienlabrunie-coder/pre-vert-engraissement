-- Additive archive setup. No deletion or change to the internal backup schedule.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Dedicated random scheduler credential remains encrypted in Vault, never in the client or git.
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'pv_backup_scheduler')
where not exists(select 1 from vault.secrets where name='pv_backup_scheduler');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pv-backups','pv-backups',false,52428800,array['application/json']) on conflict(id) do nothing;
create function pv_private.backup_worker(p_token text,p_action text,p_id uuid default null,p_error text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f record; b pv_private.backups; result jsonb;
begin
 if p_token is null or not exists(select 1 from vault.decrypted_secrets where name='pv_backup_scheduler' and decrypted_secret=p_token) then
  raise exception 'Invalid scheduler credential' using errcode='42501'; end if;
 if p_action='capture' then
  for f in select id from public.pv_farms order by id loop
   perform 1 from public.pv_farms where id=f.id for update;
   if not exists(select 1 from pv_private.backups where farm_id=f.id and reason='hourly' and created_at>=date_trunc('hour',now())) then perform pv_private.capture_backup(f.id,'hourly'); end if;
  end loop;
  return coalesce((select jsonb_agg(x) from (select id,farm_id from pv_private.backups where reason<>'before-change' and archived_at is null order by created_at limit 10) x),'[]'::jsonb);
 elsif p_action='document' then
  return (select document from pv_private.backups where id=p_id);
 elsif p_action='archived' then
  update pv_private.backups set archived_at=clock_timestamp(),archive_path=farm_id::text||'/'||id::text||'.json',archive_error=null where id=p_id;
  return jsonb_build_object('ok',true);
 elsif p_action='error' then
  update pv_private.backups set archive_error=left(p_error,300) where id=p_id;
  return jsonb_build_object('ok',true);

 end if;
 raise exception 'Invalid worker action' using errcode='22023';
end $$;
create function public.pv_backup_worker(p_token text,p_action text,p_id uuid default null,p_error text default null) returns jsonb
language sql security invoker set search_path='' as $$select pv_private.backup_worker(p_token,p_action,p_id,p_error)$$;
revoke all on function public.pv_backup_worker(text,text,uuid,text),pv_private.backup_worker(text,text,uuid,text) from public,anon,authenticated;
grant usage on schema pv_private to service_role;
grant execute on function public.pv_backup_worker(text,text,uuid,text),pv_private.backup_worker(text,text,uuid,text) to service_role;
create function pv_private.dispatch_backup() returns bigint language sql security definer set search_path='' as $$
 select net.http_post(url:='https://lzufwduwpngrshkzayaz.supabase.co/functions/v1/prevert-backups',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dWZ3ZHV3cG5ncnNoa3pheWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTA4MDAsImV4cCI6MjEwODc2NjgwMH0.ONCapRcYUBvHUjxTEtBzPSwK1TAGE-EaRugzk5q2sfY','x-backup-token',(select decrypted_secret from vault.decrypted_secrets where name='pv_backup_scheduler')),body:='{}'::jsonb,timeout_milliseconds:=60000)
$$;
revoke all on function pv_private.dispatch_backup() from public,anon,authenticated;
-- No schedule is changed by this proposal. Enable only after an authenticated end-to-end archive verification.
commit;
