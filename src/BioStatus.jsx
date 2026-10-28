import React,{useEffect,useState} from 'react';
import {bioWithdrawalStatus,displayInstant} from './health.js';
export default function BioStatus({animal}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const update=()=>setNow(Date.now());const id=setInterval(update,30000);window.addEventListener('focus',update);return()=>{clearInterval(id);window.removeEventListener('focus',update)}},[]);
 const s=bioWithdrawalStatus(animal,now);
 return <span className={'bio-withdrawal bio-'+s.kind}><b>{s.label}</b>{s.until&&<small>{s.kind==='elapsed'?'Échu le':s.pending?'Échéance provisoire sur la dernière administration enregistrée':'Fin du délai calculé'} : {displayInstant(s.until)}{s.remainingDays!=null?` · ${s.remainingDays} jour(s) restant(s), arrondi supérieur`:''}</small>}{s.uncertain&&<small>Autre délai non déterminé à vérifier.</small>}</span>;
}
