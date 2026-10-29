import React,{useEffect,useMemo,useState} from 'react';
import {buildStages} from './ration-schedule.js';
import {diagnostiquer} from './ration-engine/ration';
import {estConcentre} from './ration-engine/feeds';
import {localDate} from './scoring.js';
import {currentWeight} from './herd.js';
import RationDiagnostics from './RationDiagnostics.jsx';
const n=v=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
export default function RationAssignment({animals,members,lines,feeds,profile,result,onAssign}){
 const [initial,setInitial]=useState({}),[duration,setDuration]=useState(28),[interval,setInterval]=useState(7),[name,setName]=useState('Ration d’engraissement'),[dates,setDates]=useState(()=>Object.fromEntries(members.map(a=>[a.id,localDate()]))),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const signature=JSON.stringify({lines,feeds,profile});
 useEffect(()=>{setConfirmed(false);setSuccess('');setInitial(old=>Object.fromEntries(lines.map(l=>{const f=feeds.find(f=>f.id===l.feedId);return [l.feedId,old[l.feedId]??(estConcentre(f)?0:Number(l.kgMS))]})))},[signature]);
 const update=fn=>{fn();setConfirmed(false);setSuccess('');setError('')};
 let stages=[],planError='';try{stages=buildStages(lines,initial,Number(duration),Number(interval));if(stages.some(s=>s.lines.reduce((sum,l)=>sum+l.kgMS,0)<=0))throw Error('La ration initiale ne peut pas être vide.');}catch(e){planError=e.message}
 const diagnostics=stages.map(s=>diagnostiquer({lot:profile,pv:Number(profile.poidsDepart),feeds},s.lines));
 const blocked=result.bloquant||diagnostics.some(d=>d.bloquant);
 const selected=animals.filter(a=>dates[a.id]);
 const unknownOrDifferent=selected.filter(a=>currentWeight(a)==null||Math.abs(currentWeight(a)-profile.poidsDepart)/profile.poidsDepart>.2);
 const submit=async()=>{if(busy)return;setBusy(true);setError('');try{
  if(!confirmed||blocked||planError||!selected.length||!name.trim())throw Error('Vérifiez le plan, les animaux et les dates avant de valider.');
  await onAssign(selected.map(a=>({id:a.id,startDate:dates[a.id]})),{name:name.trim(),stages,duration:Number(duration),interval:Number(interval),initial});setSuccess(`Ration attribuée à ${selected.length} bovin(s). Consultez les distributions dans leurs fiches.`);setConfirmed(false);
 }catch(e){setError(e.message)}finally{setBusy(false)}};
 return <section className="ration-assignment"><h3>Plan de distribution et attribution</h3><label>Nom de la ration de base<input value={name} onChange={e=>update(()=>setName(e.target.value))}/></label>
 <p>La ration calculée est la ration de croisière. Renseignez les quantités déjà consommées au début de la transition. La proposition répartit progressivement l’écart par paliers ; elle doit être adaptée à l’alimentation antérieure et à l’observation des animaux.</p>
 <div className="form-grid"><label>Durée de transition proposée (jours)<input type="number" min="1" max="120" value={duration} onChange={e=>update(()=>setDuration(e.target.value))}/></label><label>Intervalle entre paliers (jours)<input type="number" min="1" max="120" value={interval} onChange={e=>update(()=>setInterval(e.target.value))}/></label></div>
 <p className="hint">28 jours et un palier tous les 7 jours sont un point de départ de simulation, pas une durée universelle. Le plan ne remplace pas l’ajustement selon l’ingestion, les refus et les bouses. Maintenez l’accès à l’eau et à des fibres adaptées.</p>
 <div className="form-grid">{lines.map(l=>{const f=feeds.find(f=>f.id===l.feedId);return <label key={l.feedId}>Au départ · {f.nom} (kg brut/j)<input type="number" min="0" step="0.1" value={initial[l.feedId]==null?'':Math.round(initial[l.feedId]/(f.ms/100)*1000)/1000} onChange={e=>update(()=>setInitial(old=>({...old,[l.feedId]:e.target.value===''?undefined:Number(e.target.value)*f.ms/100})))}/></label>})}</div>
 {planError?<p className="warning">{planError}</p>:<div className="table-wrap"><table><thead><tr><th>Distribution par bovin</th>{stages.map(s=><th key={s.day}>J{s.day}<br/>{s.name}</th>)}</tr></thead><tbody>{lines.map(l=>{const f=feeds.find(f=>f.id===l.feedId);return <tr key={l.feedId}><td>{f.nom}<small> · kg brut/j</small></td>{stages.map(s=><td key={s.day}>{n(s.lines.find(x=>x.feedId===l.feedId).kgMS/(f.ms/100))}</td>)}</tr>})}</tbody></table></div>}
 {stages.map((s,i)=><details key={s.day}><summary>Équilibres à J{s.day} · {s.name} · {diagnostics[i].bloquant?'À corriger':'Voir le détail'}</summary><RationDiagnostics result={diagnostics[i]} lines={s.lines} feeds={feeds}/></details>)}
 {blocked&&<p className="warning">Le moteur relève un blocage sur la ration finale ou un palier. Corrigez les quantités avant l’attribution.</p>}
 <h3>Choisir les bovins</h3><div className="assignment-actions"><button className="outline" onClick={()=>update(()=>setDates(Object.fromEntries(animals.map(a=>[a.id,localDate()]))))}>Sélectionner tous les bovins</button><button className="outline" onClick={()=>update(()=>setDates({}))}>Tout désélectionner</button><button className="outline" onClick={()=>update(()=>setDates(old=>Object.fromEntries(Object.keys(old).map(id=>[id,localDate()]))))}>Début aujourd’hui</button><button className="outline" onClick={()=>update(()=>setDates(old=>Object.fromEntries(Object.keys(old).map(id=>[id,animals.find(a=>a.id===id)?.entryDate||'']))))}>Reprendre les dates d’entrée</button></div>
 <p className="hint">Par défaut, une nouvelle ration commence aujourd’hui. Utilisez la date d’entrée seulement si cette transition a réellement commencé à l’arrivée. Un animal présent depuis 60 jours n’est pas automatiquement adapté à un nouvel aliment.</p>
 <div className="assignment-list">{animals.map(a=><div key={a.id}><label className="check-row"><input type="checkbox" checked={Object.hasOwn(dates,a.id)} onChange={e=>update(()=>setDates(old=>{const next={...old};if(e.target.checked)next[a.id]=localDate();else delete next[a.id];return next}))}/>{a.number} · {n(currentWeight(a))} kg</label>{Object.hasOwn(dates,a.id)&&<label>Début de transition · {a.number}<input type="date" min={a.entryDate||undefined} value={dates[a.id]} onChange={e=>update(()=>setDates(old=>({...old,[a.id]:e.target.value})))}/></label>}</div>)}</div>
 {!!unknownOrDifferent.length&&<p className="warning">{unknownOrDifferent.length} bovin(s) ont un poids inconnu ou éloigné de plus de 20 % du poids de référence. Vérifiez leurs besoins individuels ; la ration commune ne les recalcule pas automatiquement.</p>}
 <label className="check-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>J’ai validé les quantités, les paliers, les profils des bovins et les dates réelles de début de transition.</label>
 {error&&<p role="alert" className="warning">{error}</p>}{success&&<p role="status">{success}</p>}<button className="primary" disabled={busy||!confirmed||blocked||!!planError||!selected.length||Object.values(dates).some(d=>!d)} onClick={submit}>{busy?'Attribution…':`Valider et attribuer à ${selected.length} bovin(s)`}</button></section>;
}
