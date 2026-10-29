import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('backups: restore round trip, admin-only, integrity, stale writes and atomic rollback',async()=>{
 const db=new PGlite();const a='10000000-0000-0000-0000-000000000001',u='10000000-0000-0000-0000-000000000002',f='20000000-0000-0000-0000-000000000001',g='20000000-0000-0000-0000-000000000002';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${a}','admin@example.invalid'),('${u}','user@example.invalid');`);
 for(const name of ['202610280001_prevert.sql','202610290001_team_admin.sql','20261029165024_automatic_backups.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.exec(`insert into public.pv_farms(id,name) values('${f}','Test'),('${g}','Other');insert into public.pv_members values('${f}','${a}','admin'),('${f}','${u}','editor');`);
 const login=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role)};
 const api=async(action,id=null,doc=null,hash=null,request=null,farm=f)=>(await db.query('select public.pv_backup_admin($1,$2,$3,$4,$5,$6) as result',[farm,action,id,doc,hash,request])).rows[0].result;
 const op=async(kind,id,payload,expected=0,deleted=false,parent=null)=>(await db.query('select public.pv_apply_operation($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',[f,crypto.randomUUID(),kind,id,expected,payload,deleted,parent?'animal':null,parent])).rows[0].result;
 await login(a);
 await op('animal','a',{id:'a',number:'FR1',lot:'l'});await op('lot','l',{id:'l',name:'Box 1'});
 await op('weight','a:w',{id:'w',kg:540,date:'2026-10-29'},0,false,'a');await op('score','a:s',{id:'s',ARC:7},0,false,'a');
 await op('animal','a',{id:'a',number:'FR1',lot:'l',comment:'changed'},1);
 let listing=await api('list');assert.equal(listing.backups[0].animals,1);assert.equal(listing.backups[0].weights,1);assert.equal(listing.backups[0].scores,1);
 const id=listing.backups[0].id,doc=await api('download',id);assert.equal(doc.records.length,4);assert.equal(doc.records.find(r=>r.kind==='animal').payload.comment,undefined);
 await login(u);await assert.rejects(()=>api('list'),/réservées/);await assert.rejects(()=>api('restore',id,null,listing.fingerprint,crypto.randomUUID()),/réservées/);await assert.rejects(()=>db.query('select * from pv_private.backups'),/permission denied/);
 await login(null,'anon');await assert.rejects(()=>api('list'),/permission denied/);
 await login(a);await assert.rejects(()=>api('list',null,null,null,null,g),/réservées/);
 const bad=structuredClone(doc);bad.records[0].payload.bad=true;await assert.rejects(()=>api('restore',null,bad,listing.fingerprint,crypto.randomUUID()),/Intégrité/);
 await op('animal','a',{id:'a',number:'FR1',lot:'l',comment:'deleted'},2,true);
 await assert.rejects(()=>api('restore',id,null,listing.fingerprint,crypto.randomUUID()),/ont changé/);
 listing=await api('list');const req=crypto.randomUUID();const restored=await api('restore',id,null,listing.fingerprint,req);assert.equal(restored.records.find(r=>r.kind==='animal').deleted,false);assert.equal(restored.records.find(r=>r.kind==='weight').payload.kg,540);assert.ok(restored.beforeBackup);
 const version=restored.records.find(r=>r.kind==='animal').version;assert.ok(version>3);assert.equal((await op('animal','a',{id:'a',number:'FR1',comment:'offline stale'},2)).status,'conflict');
 assert.deepEqual(await api('restore',id,null,listing.fingerprint,req),restored,'idempotent retry');
 listing=await api('list');const broken=structuredClone(doc);delete broken.checksum;broken.records.find(r=>r.kind==='animal').payload.number='';
 await assert.rejects(()=>api('restore',null,broken,listing.fingerprint,crypto.randomUUID()),/check constraint/);assert.equal((await api('list')).fingerprint,listing.fingerprint,'invalid import leaves all data untouched');
 assert.ok((await api('list')).backups.some(b=>b.reason==='before-restore'));
 }finally{await db.close()}
});
