import React,{useState} from 'react';
import {displayInstant} from './health.js';
export default function TreatmentProgress({t,onRecord,onStop}){
 const [actual,setActual]=useState(''),[stopConfirmed,setStopConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const next=(t.reminders||[]).find(r=>r.status==='planned');
 const act=async fn=>{if(busy)return;setBusy(true);setError('');try{await fn();setActual('')}catch(e){setError(e.message)}finally{setBusy(false)}};
 if(!t.reminders?.length)return null;
 return <section className="treatment-progress"><h4>Rappels d’administration</h4><p>Les rappels ne prouvent pas qu’un traitement a été effectué. En cas de retard, vérifiez la conduite à tenir avec le vétérinaire ; le calendrier prévu n’est pas décalé automatiquement.</p><ul>{t.reminders.map(r=><li key={r.id}>{displayInstant(r.dueAt)} · {r.status==='planned'?(Date.parse(r.dueAt)<Date.now()?'À confirmer / en retard':'À venir'):r.status==='done'?`Effectué le ${displayInstant(r.actualAt)}`:'Annulé — arrêt confirmé'}</li>)}</ul>{next&&onRecord&&<><label>Date et heure réelles de l’administration<input type="datetime-local" value={actual} onChange={e=>setActual(e.target.value)}/></label><button type="button" className="outline" disabled={busy||!actual} onClick={()=>act(()=>onRecord(next.id,actual))}>Confirmer l’administration</button><label className="check-row"><input type="checkbox" checked={stopConfirmed} onChange={e=>setStopConfirmed(e.target.checked)}/>Le vétérinaire a confirmé l’arrêt des administrations restantes.</label><button type="button" className="link" disabled={busy||!stopConfirmed} onClick={()=>act(onStop)}>Annuler les rappels restants</button></>}{error&&<p role="alert">{error}</p>}</section>;
}
