import {localDate} from './scoring.js';
export const formatDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR'):'—';
export const weightsOf=a=>(a.weights||[]).filter(w=>w.date&&Number.isFinite(Number(w.kg))&&Number(w.kg)>0).map(w=>({...w,kg:Number(w.kg)})).sort((x,y)=>x.date.localeCompare(y.date));
export const currentWeight=a=>weightsOf(a).at(-1)?.kg||(Number(a.entryWeight)>0?Number(a.entryWeight):null);
export const ageMonths=(birth,now=localDate())=>{if(!birth||birth>now)return null;const n=(new Date(now+'T12:00:00')-new Date(birth+'T12:00:00'))/86400000/30.4375;return Number.isFinite(n)?Math.floor(n):null};
export const mean=values=>{const xs=values.filter(x=>x!=null&&Number.isFinite(x));return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null};
export const gain=a=>{const w=weightsOf(a);if(w.length<2)return null;const days=(new Date(w.at(-1).date)-new Date(w[0].date))/86400000;return days>0?(w.at(-1).kg-w[0].kg)/days:null};
export const dueForWeight=(a,now=localDate())=>{const last=weightsOf(a).at(-1)?.date||a.entryDate;if(!last)return true;return (new Date(now+'T12:00:00')-new Date(last+'T12:00:00'))/86400000>=30};
export function herdSummary(animals,now=localDate()){
 const withTarget=animals.filter(a=>Number(a.target)>0&&currentWeight(a)!=null);
 return {count:animals.length,weight:mean(animals.map(currentWeight)),age:mean(animals.map(a=>ageMonths(a.birth,now))),gain:mean(animals.map(gain)),due:animals.filter(a=>dueForWeight(a,now)),withoutScore:animals.filter(a=>!a.scores?.length),targetCount:withTarget.length,reached:withTarget.filter(a=>currentWeight(a)>=Number(a.target)).length};
}
export const eventsOf=a=>[...(a.weights||[]).map((w,i)=>({id:'w'+i,date:w.date,title:'Pesée',detail:`${w.kg} kg`,type:'weight'})),...(a.scores||[]).map((s,i)=>({id:'s'+(s.id||i),date:s.date,title:'Pointage morphologique',detail:`${Object.keys(s.values||{}).length} postes`,type:'score'})),...(a.treatments||[]).map((t,i)=>({id:'t'+(t.id||i),date:t.date,title:'Traitement sanitaire',detail:t.product||'Produit non renseigné',type:'health'}))].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
