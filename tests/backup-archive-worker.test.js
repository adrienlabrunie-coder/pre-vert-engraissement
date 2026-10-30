import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transform} from 'esbuild';
const source=await readFile(new URL('../supabase/functions/prevert-backups/index.ts',import.meta.url),'utf8');
const {code}=await transform(source.replace(/^import .*;\n/,''),{loader:'ts'});
const token='a'.repeat(64);
function worker({deny=false,corrupt=false,lostAck=false}={}){
 let handler;const actions=[];const files=new Map();
 const client={rpc:async(name,args)=>{
  actions.push(args.p_action);
  if(deny)return {error:{code:'42501'}};
  if(args.p_action==='capture')return {data:[{id:'backup',farm_id:'farm'}]};
  if(args.p_action==='document')return {data:{records:[{id:'animal'}]}};
  return {data:{ok:true}};
 },storage:{from:()=>({upload:async(path,body)=>{files.set(path,body);return {error:lostAck?new Error('lost acknowledgement'):null}},download:async(path)=>({data:{text:async()=>corrupt?'corrupted':files.get(path)}})})}};
 vm.runInNewContext(code,{Deno:{serve:fn=>handler=fn,env:{get:name=>name==='SUPABASE_URL'?'https://example.invalid':name==='SUPABASE_SERVICE_ROLE_KEY'?'test-server-key':undefined}},createClient:()=>client,Response,JSON,Error});
 return {call:headers=>handler(new Request('https://example.invalid',{method:'POST',headers})),actions};
}
test('archive: requests without a dedicated credential cannot read backups',async()=>{
 const w=worker();assert.equal((await w.call({})).status,401);assert.equal((await w.call({'x-backup-token':'bad'})).status,401);assert.deepEqual(w.actions,[]);
 const bad=worker({deny:true});assert.equal((await bad.call({'x-backup-token':token})).status,401);assert.deepEqual(bad.actions,['capture']);
});
test('archive: successful and lost-acknowledgement writes are verified before marking archived',async()=>{
 for(const lostAck of [false,true]){const w=worker({lostAck});const r=await w.call({'x-backup-token':token});assert.equal(r.status,200);assert.deepEqual(await r.json(),{archived:1,failed:0});assert.deepEqual(w.actions,['capture','document','archived']);}
});
test('archive: corrupt readback is reported and never marked archived',async()=>{
 const w=worker({corrupt:true});const r=await w.call({'x-backup-token':token});assert.equal(r.status,503);assert.deepEqual(w.actions,['capture','document','error']);
});
