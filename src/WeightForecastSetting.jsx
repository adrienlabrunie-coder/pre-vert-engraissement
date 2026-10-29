import React,{useState,useEffect,useRef} from 'react';
export default function WeightForecastSetting({animal,onSave}){
 const [value,setValue]=useState(animal.targetGmq??''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);const saving=useRef(false);
 useEffect(()=>{setValue(animal.targetGmq??'')},[animal.targetGmq]);
 const submit=async e=>{e.preventDefault();if(saving.current)return;const number=value===''?null:Number(value);if(number!=null&&(!Number.isFinite(number)||number<=0)){setError('Saisissez un GMQ positif, ou laissez vide pour utiliser une ration enregistrée.');return}saving.current=true;setBusy(true);setError('');try{await onSave(number);setSaved(true)}catch(e){setError(e.message||'Enregistrement impossible.')}finally{saving.current=false;setBusy(false)}};
 return <form className="forecast-setting" onSubmit={submit}><label>GMQ objectif (kg/j)<input type="number" min="0.01" step="0.01" value={value} onChange={e=>{setValue(e.target.value);setSaved(false)}} placeholder="Ex. 1,00"/></label><button className="outline" disabled={busy} type="submit">Enregistrer le GMQ objectif</button>{saved&&<span role="status">Objectif enregistré.</span>}{error&&<p role="alert" className="warning">{error}</p>}</form>;
}
