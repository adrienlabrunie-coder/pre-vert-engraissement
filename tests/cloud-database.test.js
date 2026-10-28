import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const admin='10000000-0000-0000-0000-000000000001',editor='10000000-0000-0000-0000-000000000002',outsider='10000000-0000-0000-0000-000000000003',viewer='10000000-0000-0000-0000-000000000004';
const farm='20000000-0000-0000-0000-000000000001',other='20000000-0000-0000-0000-000000000002';
test('Base cloud : droits réels PostgreSQL, isolation, conflits, répétition et événements indépendants',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${admin}'),('${editor}'),('${outsider}'),('${viewer}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202610280001_prevert.sql',import.meta.url),'utf8'));
 await db.exec(`insert into public.pv_farms(id,name) values('${farm}','Test'),('${other}','Autre');insert into public.pv_members values('${farm}','${admin}','admin'),('${farm}','${editor}','editor'),('${farm}','${viewer}','viewer'),('${other}','${outsider}','admin');`);
 const login=async(user,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('set role '+role)};
 let count=0;const apply=async({id='a1',kind='animal',expected=0,payload={number:'FR 1234567890'},operation,deleted=false,subjectKind=null,subjectId=null,farmId=farm}={})=>{
 const op=operation||'30000000-0000-0000-0000-'+String(++count).padStart(12,'0');
 const r=await db.query('select public.pv_apply_operation($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',[farmId,op,kind,id,expected,JSON.stringify(payload),deleted,subjectKind,subjectId]);return r.rows[0].result;
 };
 await login(null,'anon');await assert.rejects(()=>db.query('select * from public.pv_records'),/permission denied/);await assert.rejects(()=>apply(),/permission denied/);
 await login(outsider);assert.equal((await db.query('select * from public.pv_farms')).rows.length,1);assert.equal((await db.query('select * from public.pv_records')).rows.length,0);await assert.rejects(()=>apply(),/refusé/);
 await login(admin);const op='40000000-0000-0000-0000-000000000001';const first=await apply({operation:op});assert.equal(first.record.version,1);assert.deepEqual(await apply({operation:op}),first);
 await assert.rejects(()=>apply({operation:op,payload:{number:'FR 9999999999'}}),/déjà utilisé/);
 await assert.rejects(()=>db.exec("update public.pv_records set payload='{}'"),/permission denied/);await assert.rejects(()=>db.exec("delete from public.pv_records"),/permission denied/);await assert.rejects(()=>db.exec(`insert into public.pv_members values('${farm}','${outsider}','admin')`),/permission denied/);
 await assert.rejects(()=>apply({id:'bad',payload:{}}),/check constraint/);await assert.rejects(()=>apply({id:'bad',kind:'weight',payload:{kg:400,date:'2026-10-28'}}),/check constraint/);
 await assert.rejects(()=>apply({id:'duplicate',payload:{number:'fr1234567890'}}),/unique constraint/);
 await assert.rejects(()=>apply({id:'nested',payload:{number:'FR 9876543210',weights:[]}}),/check constraint/);
 await login(editor);const second=await apply({expected:1,payload:{number:'FR 1234567890',race:'Limousine'}});assert.equal(second.record.version,2);assert.equal(second.record.updated_by,editor);
 const conflict=await apply({expected:1,payload:{number:'FR 1234567890',race:'Charolaise'}});assert.equal(conflict.status,'conflict');assert.equal(conflict.current.payload.race,'Limousine');
 await apply({id:'w1',kind:'weight',payload:{kg:400},subjectKind:'animal',subjectId:'a1'});await apply({id:'w2',kind:'weight',payload:{kg:410},subjectKind:'animal',subjectId:'a1'});assert.equal((await db.query("select * from public.pv_records where kind='weight'")).rows.length,2);
 await assert.rejects(()=>apply({farmId:other,id:'w3',kind:'weight',payload:{kg:410},subjectKind:'animal',subjectId:'a1'}),/refusé/);
 await login(viewer);assert.equal((await db.query('select * from public.pv_records')).rows.length,3);await assert.rejects(()=>apply(),/refusé/);
 await login(outsider);assert.equal((await db.query('select * from public.pv_records')).rows.length,0);
 await login(admin);const tombstone=await apply({expected:2,payload:{number:'FR 1234567890'},deleted:true});assert.equal(tombstone.record.deleted,true);assert.equal(tombstone.record.version,3);
 await db.exec('reset role');await db.exec(`delete from public.pv_members where user_id='${editor}'`);await login(editor);await assert.rejects(()=>apply(),/refusé/);assert.equal((await db.query('select * from public.pv_records')).rows.length,0);
 }finally{await db.close()}
});
