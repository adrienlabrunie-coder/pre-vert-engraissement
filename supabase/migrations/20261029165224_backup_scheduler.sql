begin;
create extension if not exists pg_cron with schema pg_catalog;
-- Entirely internal scheduling: no HTTP endpoint, service credential or external access.
create function pv_private.run_backup_schedule() returns void
language plpgsql security definer set search_path='' as $$
declare f record;
begin
 for f in select id from public.pv_farms order by id loop
  perform 1 from public.pv_farms where id=f.id for update;
  if not exists(select 1 from pv_private.backups where farm_id=f.id and reason='hourly' and created_at>=date_trunc('hour',now())) then
   perform pv_private.capture_backup(f.id,'hourly');
  end if;
 end loop;
 delete from pv_private.backups where created_at<now()-interval '30 days';
end $$;
revoke all on function pv_private.run_backup_schedule() from public,anon,authenticated;
select cron.schedule('prevert-hourly-backups','0 * * * *','select pv_private.run_backup_schedule();');
select pv_private.run_backup_schedule();
commit;
