import React,{useState,useRef,useEffect} from 'react';
import PassportScanner from './PassportScanner.jsx';
import {passportCandidate,normalizeAnimalNumber} from './passport-batch.js';
import {localDate} from './scoring.js';
export default function BatchPassportScanner({animals,lots,onSave,onDirtyChange}){
 const [rows,setRows]=useState([]),[settings,setSettings]=useState({entryDate:localDate(),lot:'',place:'',target:'',targetGmq:''}),[confirmed,setConfirmed]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const seen=useRef(new Set()),savingRef=useRef(false);
 useEffect(()=>{onDirtyChange(rows.length>0);return()=>onDirtyChange(false)},[rows.length,onDirtyChange]);
 const capture=raw=>{
  // Repeated frames from a passport already seen do not add duplicate drafts.
  if(seen.current.has(raw))return;
  seen.current.add(raw);
  try{
   const candidate=passportCandidate(raw),key=normalizeAnimalNumber(candidate.number);
   if(animals.some(a=>normalizeAnimalNumber(a.number)===key)){setError(`${candidate.number} existe déjà dans le cheptel.`);return}
   setRows(previous=>previous.some(a=>normalizeAnimalNumber(a.number)===key)?previous:[...previous,{...candidate,draftId:crypto.randomUUID()}]);
   setConfirmed(false);setMessage(`${candidate.number} lu — à vérifier dans la liste.`);setError('');
  }catch(e){setError(e.message)}
 };
 const edit=(id,key,value)=>{setRows(rs=>rs.map(r=>r.draftId===id?{...r,[key]:value}:r));setConfirmed(false);setError('')};
 const setting=(key,value)=>{setSettings(s=>({...s,[key]:value}));setConfirmed(false)};
 const save=async()=>{if(savingRef.current)return;if(!confirmed){setError('Confirmez la vérification des passeports avant la création.');return}savingRef.current=true;setSaving(true);setError('');try{await onSave(rows,settings)}catch(e){setError(e.message||'Enregistrement impossible. La liste est conservée pour réessayer.')}finally{savingRef.current=false;setSaving(false)}};
 return <div className="batch-scanner">
 <p>Présentez les passeports l’un après l’autre sans fermer la caméra. Les bovins s’ajoutent à la liste de vérification ; aucune fiche n’est créée avant votre validation.</p>
 <PassportScanner animals={animals} onCapture={capture} disabled={saving}/>
 {message&&<p role="status" className="batch-status">{message}</p>}
 <section className="batch-review"><h3>{rows.length} bovin{rows.length>1?'s':''} à créer</h3>
 <fieldset disabled={saving}><legend>Informations communes à la série</legend><div className="form-grid">
 <label>Date d’entrée commune<input type="date" max={localDate()} value={settings.entryDate} onChange={e=>setting('entryDate',e.target.value)}/></label>
 <label>Lot commun<select value={settings.lot} onChange={e=>setting('lot',e.target.value)}><option value="">Sans lot</option>{lots.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 <label>Emplacement commun<input value={settings.place} onChange={e=>setting('place',e.target.value)}/></label>
 <label>Poids objectif commun (kg, facultatif)<input type="number" min="1" value={settings.target} onChange={e=>setting('target',e.target.value)}/></label>
 <label>GMQ objectif commun (kg/j, facultatif)<input type="number" min="0.01" step="0.01" value={settings.targetGmq} onChange={e=>setting('targetGmq',e.target.value)}/></label>
 </div></fieldset>
 <div className="batch-rows">{rows.map((row,index)=><fieldset key={row.draftId} disabled={saving} className="batch-row"><legend>Bovin {index+1} · {row.source}</legend><div className="form-grid">
 <label>Numéro du bovin {index+1}<input value={row.number} onChange={e=>edit(row.draftId,'number',e.target.value)}/></label>
 <label>Naissance du bovin {index+1}<input type="date" max={localDate()} value={row.birth} onChange={e=>edit(row.draftId,'birth',e.target.value)}/></label>
 <label>Sexe du bovin {index+1}<select value={row.sex} onChange={e=>edit(row.draftId,'sex',e.target.value)}><option value="">À renseigner</option><option value="M">Mâle</option><option value="F">Femelle</option></select></label>
 <label>Race du bovin {index+1}<input value={row.race} onChange={e=>edit(row.draftId,'race',e.target.value)}/></label>
 <label>Poids d’entrée du bovin {index+1} (kg)<input type="number" min="1" step="0.1" value={row.entryWeight} onChange={e=>edit(row.draftId,'entryWeight',e.target.value)}/></label>
 </div><details><summary>Races des parents</summary><div className="form-grid"><label>Race père du bovin {index+1}<input value={row.father} onChange={e=>edit(row.draftId,'father',e.target.value)}/></label><label>Race mère du bovin {index+1}<input value={row.mother} onChange={e=>edit(row.draftId,'mother',e.target.value)}/></label></div></details>
 {row.warnings.map((w,i)=><p className="hint" key={i}>{w}</p>)}<button className="outline" type="button" onClick={()=>{setRows(rs=>rs.filter(r=>r.draftId!==row.draftId));seen.current.clear();setConfirmed(false)}}>Retirer le bovin {index+1}</button></fieldset>)}</div>
 {!rows.length&&<p className="empty">La liste se remplit au fil des scans. Vous pouvez aussi utiliser un lecteur USB ou sélectionner plusieurs photos, avec un passeport par image.</p>}
 <label className="check-row"><input type="checkbox" checked={confirmed} disabled={saving||!rows.length} onChange={e=>setConfirmed(e.target.checked)}/>J’ai vérifié les numéros des sujets, les pays FR et les informations de chaque passeport.</label>
 {error&&<p role="alert" className="warning">{error}</p>}
 <button type="button" className="primary full" disabled={saving||!rows.length||!confirmed} onClick={save}>{saving?'Création en cours…':`Créer les ${rows.length} bovins`}</button>
 </section></div>;
}
