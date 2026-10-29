import React,{useEffect,useRef,useState} from 'react';
import {flattenSnapshot} from './replica.js';
const labels={hourly:'Automatique',initial:'Mise en service','before-change':'Avant modification','before-restore':'Avant restauration','after-restore':'Après restauration'};
const date=v=>v?new Date(v).toLocaleString('fr-FR'):'Pas encore disponible';
export default function Backups({client,workspace,onClose}){
 const [listing,setListing]=useState(null),[selected,setSelected]=useState(''),[document,setDocument]=useState(null),[fileName,setFileName]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const locked=useRef(false),request=useRef(null);
 const api=async(action,extra={})=>{const {data,error}=await client.rpc('pv_backup_admin',{p_farm:workspace.farm.id,p_action:action,...extra});if(error)throw error;return data};
 const load=async()=>{setListing(await api('list'))};
 const run=async fn=>{if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await fn()}catch(e){setError(e.message||'Sauvegarde indisponible')}finally{locked.current=false;setBusy(false)}};
 useEffect(()=>{run(load)},[]);
 const choose=()=>{setConfirmation('');setNotice('');request.current=null};
 const readFile=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;await run(async()=>{
  if(file.size>40_000_000)throw Error('Fichier trop volumineux (maximum 40 Mo).');
  let doc=JSON.parse(await file.text());
  if(Array.isArray(doc.animals)&&Array.isArray(doc.lots))doc={format:'prevert-backup',schemaVersion:1,farmId:workspace.farm.id,records:Object.values(flattenSnapshot(doc))};
  if(doc.format!=='prevert-backup'||doc.schemaVersion!==1||!Array.isArray(doc.records)||doc.farmId!==workspace.farm.id)throw Error('Ce fichier n’est pas une sauvegarde valide de cet élevage.');
  setDocument(doc);setFileName(file.name);setSelected('');choose();
 })};
 const download=()=>run(async()=>{const doc=await api('download',{p_id:selected});const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=window.document.createElement('a');a.href=url;a.download=`pre-vert-sauvegarde-${doc.createdAt.slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 const restore=()=>run(async()=>{
  if(confirmation!=='RESTAURER'||!listing)throw Error('Saisissez RESTAURER pour confirmer.');
  request.current??=crypto.randomUUID();
  await workspace.restoreBackup({p_id:selected||null,p_document:document,p_expected:listing.fingerprint,p_request:request.current});
  setNotice('Restauration terminée. La copie précédant la restauration reste disponible.');setSelected('');setDocument(null);setFileName('');setConfirmation('');request.current=null;await load();
 });
 const rows=document?.records?.filter(r=>!r.deleted),backup=listing?.backups.find(b=>b.id===selected);
 const counts=rows?{animals:rows.filter(r=>r.kind==='animal').length,weights:rows.filter(r=>r.kind==='weight').length,scores:rows.filter(r=>r.kind==='score').length}:backup;
 const status=workspace.getStatus();const unsynced=status.pending||Object.keys(status.conflicts).length;
 const lastBackup=listing?.backups.find(b=>b.reason==='hourly'||b.reason==='initial')?.created_at;
 const archiveStale=!lastBackup||Date.now()-Date.parse(lastBackup)>2*3600000;
 return <div className="modal-backdrop team-admin-backdrop"><section className="dialog wide" role="dialog" aria-modal="true" aria-label="Sauvegardes et restauration"><div className="dialog-head"><h2>Sauvegardes et restauration</h2><button aria-label="Fermer" disabled={busy} onClick={onClose}>×</button></div><div className="form">
 <p>Les données synchronisées sont sauvegardées automatiquement toutes les heures, même lorsque l’application est fermée. Historique : 30 jours. Les copies avant modification sont également conservées 30 jours.</p>
 <p>Dernière sauvegarde automatique : <b>{date(lastBackup)}</b>.</p>
 {listing&&archiveStale&&<p role="alert" className="warning">La sauvegarde automatique est absente ou date de plus de deux heures. Vérifiez le service de sauvegarde avant de compter sur cette protection.</p>}
 <p className="hint">Les copies sont protégées des manipulations dans l’application, mais restent dans la même base Supabase. Elles ne couvrent pas la perte de la base ou la suppression du projet entier : conservez aussi une copie téléchargée ailleurs. Les saisies non synchronisées et les comptes de connexion ne sont pas inclus.</p>
 {error&&<p role="alert" className="warning">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <label>Choisir une sauvegarde<select disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setDocument(null);setFileName('');choose()}}><option value="">Sélectionner une date</option>{listing?.backups.map(b=><option key={b.id} value={b.id}>{date(b.created_at)} · {labels[b.reason]||b.reason} · {b.animals} bovin(s)</option>)}</select></label>
 <button className="outline" disabled={busy||!selected} onClick={download}>Télécharger cette sauvegarde</button>
 <label>Ou importer un fichier de sauvegarde<input type="file" accept="application/json,.json" disabled={busy} onChange={readFile}/></label>
 {fileName&&<p>Fichier : {fileName}</p>}
 {counts&&<><p>Cette copie contient <b>{counts.animals} bovin(s), {counts.weights} pesée(s), {counts.scores} pointage(s)</b>. Les lots, traitements et rations présents sont également restaurés.</p><p className="warning">La restauration remplace les données partagées actuelles par cette copie. Une sauvegarde de l’état actuel est créée automatiquement avant l’opération. Les autres appareils la récupèrent à leur prochaine synchronisation ; les saisies en conflit demandent une validation.</p><label>Pour confirmer, saisissez RESTAURER<input value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label></>}
 {!!unsynced&&<p className="warning">Synchronisez les saisies et résolvez les conflits avant de restaurer.</p>}
 <button className="primary" disabled={busy||!!unsynced||!navigator.onLine||!counts||confirmation!=='RESTAURER'} onClick={restore}>{busy?'Veuillez patienter…':'Restaurer cette sauvegarde'}</button>
 <button className="outline" disabled={busy} onClick={()=>run(load)}>Actualiser la liste</button>
 </div></section></div>;
}
