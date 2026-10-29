import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('team administration: server authorization, default standard user, isolation and self-protection',async()=>{
 const db=new PGlite();const a='10000000-0000-0000-0000-000000000001',u='10000000-0000-0000-0000-000000000002',o='10000000-0000-0000-0000-000000000003',f='20000000-0000-0000-0000-000000000001',g='20000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${a}','admin@example.invalid'),('${u}','user@example.invalid'),('${o}','other@example.invalid');`);
 for(const name of ['202610280001_prevert.sql','202610290001_team_admin.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.exec(`insert into public.pv_farms(id,name) values('${f}','Test'),('${g}','Autre');insert into public.pv_members values('${f}','${a}','admin'),('${g}','${o}','admin');`);
 const login=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role)};
 const list=()=>db.query('select * from public.pv_admin_list_members($1)',[f]);const add=(email='user@example.invalid',role='editor')=>db.query('select public.pv_admin_add_member($1,$2,$3)',[f,email,role]);const change=(id,role)=>db.query('select public.pv_admin_change_member($1,$2,$3)',[f,id,role]);
 await login(null,'anon');await assert.rejects(list,/permission denied/);await assert.rejects(()=>add(),/permission denied/);
 await login(u);await assert.rejects(list,/réservée/);await assert.rejects(()=>add('user@example.invalid','admin'),/réservée/);
 await login(o);await assert.rejects(list,/réservée/);await assert.rejects(()=>change(a,'editor'),/réservée/);
 await login(a);assert.equal((await list()).rows.length,1);await db.query('select public.pv_admin_add_member($1,$2)',[f,' USER@example.invalid ']);assert.equal((await list()).rows.find(r=>r.user_id===u).role,'editor');
 await assert.rejects(()=>add(),/déjà membre/);await assert.rejects(()=>add('missing@example.invalid'),/introuvable/);await assert.rejects(()=>add('other@example.invalid'),/autre élevage/);await assert.rejects(()=>add('user@example.invalid','owner'),/Rôle invalide/);await assert.rejects(()=>change(a,null),/propre accès/);await assert.rejects(()=>change(a,'editor'),/propre accès/);
 await login(u);await assert.rejects(list,/réservée/);await assert.rejects(()=>change(u,'admin'),/réservée/);await assert.rejects(()=>db.exec(`update public.pv_members set role='admin' where user_id='${u}'`),/permission denied/);
 await login(a);await change(u,'viewer');await login(u);await assert.rejects(()=>db.query('select * from public.pv_admin_list_members($1)',[f]),/réservée/);
 await login(a);await change(u,'admin');await login(u);assert.equal((await list()).rows.length,2);await assert.rejects(()=>db.query('select * from public.pv_admin_list_members($1)',[g]),/réservée/);
 await login(a);await change(u,null);assert.equal((await list()).rows.length,1);await login(u);await assert.rejects(list,/réservée/);assert.equal((await db.query('select * from public.pv_farms')).rows.length,0);
 await db.exec('reset role');assert.equal((await db.query('select * from auth.users')).rows.length,3,'removing access does not delete accounts');
 }finally{await db.close()}
});
