import {emptyReplica,editReplica,snapshotOf,pendingRecords,recordKey,sameRecord,mergeRemote,resolveReplica} from './replica.js';
import {readWorkspace,writeWorkspace} from './storage.js';
export function localWorkspace(seed,lotsSeed){
 const read=(key,fallback)=>{const text=localStorage.getItem(key);return text?JSON.parse(text):fallback};
 let snapshot={animals:read('pv_animals',seed),lots:read('pv_lots',lotsSeed)};const listeners=new Set();
 // Preserve legacy keys and keep the local mode separate from all cloud accounts.
 for(const [field,key] of [['animals','pv_animals'],['lots','pv_lots']])if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(snapshot[field]));
 return {mode:'local',getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},async update(field,value){const next=typeof value==='function'?value(snapshot[field]):value;localStorage.setItem(field==='animals'?'pv_animals':'pv_lots',JSON.stringify(next));snapshot={...snapshot,[field]:next};listeners.forEach(fn=>fn())},async replace(data){const oldA=localStorage.getItem('pv_animals'),oldL=localStorage.getItem('pv_lots');try{localStorage.setItem('pv_animals',JSON.stringify(data.animals));localStorage.setItem('pv_lots',JSON.stringify(data.lots))}catch(e){try{if(oldA!==null)localStorage.setItem('pv_animals',oldA);if(oldL!==null)localStorage.setItem('pv_lots',oldL)}catch{}throw e}snapshot=data;listeners.forEach(fn=>fn())}};
}
export async function cloudWorkspace(client,user,farm){
 const key=`${user.id}:${farm.id}`;let state=await readWorkspace(key)||emptyReplica();let snapshot=snapshotOf(state);const listeners=new Set();let queue=Promise.resolve();
 const emit=()=>{snapshot=snapshotOf(state);listeners.forEach(fn=>fn())};
 const persist=async next=>{state=await writeWorkspace(key,next,state.revision);emit()};
 const serial=fn=>{const work=queue.then(fn);queue=work.catch(()=>{});return work};
 const check=async()=>{const {data,error}=await client.from('pv_members').select('role').eq('farm_id',farm.id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!data){farm.role='revoked';const denied=new Error('Accès à cet élevage refusé. Les saisies locales sont conservées.');denied.code='PV_REVOKED';throw denied;}return data.role};
 const rpc=async op=>{const r=await client.rpc('pv_apply_operation',{p_farm:farm.id,p_operation:op.operationId,p_kind:op.record.kind,p_id:op.record.id,p_expected:op.expected,p_payload:op.record.payload,p_deleted:op.record.deleted,p_subject_kind:op.record.subject_kind,p_subject_id:op.record.subject_id});if(r.error){const error=new Error(r.error.message);error.code=r.error.code;throw error;}return r.data};
 const store={mode:'cloud',user,farm,getSnapshot:()=>snapshot,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},getStatus:()=>({pending:pendingRecords(state).length+(state.inflight&&!pendingRecords(state).some(r=>recordKey(r)===recordKey(state.inflight.record))?1:0),conflicts:state.conflicts,lastSync:state.lastSync}),
 update:(field,value)=>serial(async()=>{if(!['admin','editor'].includes(farm.role))throw new Error('Ce compte dispose uniquement d’un accès en lecture.');const next=typeof value==='function'?value(snapshot[field]):value;await persist(editReplica(state,{...snapshot,[field]:next}))}),
 replace:data=>serial(async()=>{if(farm.role!=='admin')throw new Error('Accès en lecture seule.');if(Object.keys(state.desired).length)throw new Error('L’import est réservé à une base partagée vide pour éviter de remplacer les données de l’équipe.');await persist(editReplica(state,data))}),
 restoreBackup:params=>serial(async()=>{
  if(!navigator.onLine)throw new Error('Une connexion Internet est nécessaire.');
  farm.role=await check();if(farm.role!=='admin')throw new Error('Restauration réservée aux administrateurs.');
  if(pendingRecords(state).length||state.inflight||Object.keys(state.conflicts).length)throw new Error('Synchronisez les saisies et résolvez les conflits avant de restaurer.');
  const {data,error}=await client.rpc('pv_backup_admin',{p_farm:farm.id,p_action:'restore',...params});if(error)throw error;
  await persist({...mergeRemote({...emptyReplica(),revision:state.revision},data.records),lastSync:new Date().toISOString()});
  return data;
 }),
 resolve:(key,choice)=>serial(async()=>{if(!['admin','editor'].includes(farm.role))throw new Error('Accès en lecture seule.');await persist(resolveReplica(state,key,choice))}),
 sync:()=>serial(async()=>{
  farm.role=await check();
  if(farm.role==='viewer'&&(pendingRecords(state).length||state.inflight))throw new Error('Vos droits sont passés en lecture seule. Les modifications locales restent conservées.');
  let iterations=0;
  while(state.inflight||pendingRecords(state).length){if(++iterations>5000)throw new Error('Synchronisation partielle : relancez pour poursuivre.');
   if(!state.inflight){const record=pendingRecords(state)[0];await persist({...state,inflight:{operationId:crypto.randomUUID(),record:structuredClone(record),expected:state.base[recordKey(record)]?.version||0}})}
   const op=state.inflight;let result;try{result=await rpc(op)}catch(error){if(/^(22|23|42501)/.test(error.code||''))await persist({...state,inflight:null});throw error}const k=recordKey(op.record),next=structuredClone(state);
   if(result.status==='applied'){next.base[k]=result.record;if(sameRecord(next.desired[k],op.record))next.desired[k]=result.record;}
   else if(result.status==='conflict'){next.conflicts[k]={mine:next.desired[k],remote:result.current};}
   else throw new Error('Réponse de synchronisation non reconnue.');
   next.inflight=null;await persist(next);
  }
  let offset=0;
  while(true){const {data,error}=await client.from('pv_records').select('*').eq('farm_id',farm.id).order('kind').order('id').range(offset,offset+499);if(error)throw error;await persist(mergeRemote(state,data));if(data.length<500)break;offset+=data.length;}
  await persist({...state,lastSync:new Date().toISOString()});
 })};return store;
}
