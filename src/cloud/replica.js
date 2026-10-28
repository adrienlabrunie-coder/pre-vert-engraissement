const clone=v=>structuredClone(v);
export const recordKey=r=>`${r.kind}:${r.id}`;
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const body=r=>r?{kind:r.kind,id:r.id,payload:r.payload,deleted:!!r.deleted,subject_kind:r.subject_kind??null,subject_id:r.subject_id??null}:null;
export const sameRecord=(a,b)=>canonical(body(a))===canonical(body(b));
export const emptyReplica=()=>({revision:0,base:{},desired:{},conflicts:{},inflight:null,lastSync:null});
export function flattenSnapshot(snapshot){
 const records={};const add=(kind,id,payload,subject_kind=null,subject_id=null)=>{const r={kind,id:String(id),payload,subject_kind,subject_id,deleted:false};const key=recordKey(r);if(records[key])throw new Error('Identifiant dupliqué dans la sauvegarde.');records[key]=r};
 for(const kind of ['lot','animal'])for(const item of snapshot[kind==='animal'?'animals':'lots']){
  if(!item.id||typeof item.id!=='string')throw new Error('Une fiche ne possède pas un identifiant valide.');
  const data=clone(item);const groups=kind==='animal'?[['weights','weight'],['scores','score'],['treatments','treatment'],['rations','ration']]:[['rations','ration']];
  for(const [field,eventKind] of groups){const events=data[field]||[];if(!Array.isArray(events))throw new Error('Historique invalide.');delete data[field];for(const event of events){const payload=clone(event);payload.id=payload.id||crypto.randomUUID();add(eventKind,`${item.id}:${payload.id}`,payload,kind,item.id)}}
  add(kind,item.id,data);
 }
 return records;
}
export function snapshotOf(replica){
 const result={animals:[],lots:[]};const parents={};
 for(const r of Object.values(replica.desired))if(!r.deleted&&['animal','lot'].includes(r.kind)){const item=clone(r.payload);if(r.kind==='animal'){item.weights=[];item.scores=[];item.treatments=[];}item.rations=[];result[r.kind==='animal'?'animals':'lots'].push(item);parents[recordKey(r)]=item;}
 const fields={weight:'weights',score:'scores',treatment:'treatments',ration:'rations'};
 for(const r of Object.values(replica.desired))if(!r.deleted&&fields[r.kind]){const p=parents[`${r.subject_kind}:${r.subject_id}`];if(p)p[fields[r.kind]].push(clone(r.payload));}
 for(const a of result.animals)a.weights.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 return result;
}
export function editReplica(replica,snapshot){
 const next=clone(replica),records=flattenSnapshot(snapshot);
 for(const [key,old] of Object.entries(next.desired))if(!records[key])records[key]={...old,deleted:true};
 next.desired=records;return next;
}
export function pendingRecords(replica){return Object.values(replica.desired).filter(r=>!sameRecord(r,replica.base[recordKey(r)])&&!replica.conflicts[recordKey(r)]).sort((a,b)=>(['animal','lot'].includes(a.kind)?0:1)-(['animal','lot'].includes(b.kind)?0:1));}
export function mergeRemote(replica,rows){
 const next=clone(replica);
 for(const remote of rows){const k=recordKey(remote),mine=next.desired[k],base=next.base[k];
  if(base&&remote.version<base.version)continue;
  if(!mine||sameRecord(mine,base)||sameRecord(mine,remote)){next.desired[k]=remote;delete next.conflicts[k];}
  else if(!sameRecord(base,remote))next.conflicts[k]={mine,remote};
  next.base[k]=remote;
 }
 return next;
}
export function resolveReplica(replica,key,choice){const next=clone(replica),conflict=next.conflicts[key];if(!conflict)throw new Error('Conflit introuvable.');if(conflict.remote)next.base[key]=conflict.remote;else delete next.base[key];if(choice==='server'){if(conflict.remote)next.desired[key]=conflict.remote;else delete next.desired[key];}else if(choice!=='local')throw new Error('Choix invalide.');delete next.conflicts[key];return next;}
