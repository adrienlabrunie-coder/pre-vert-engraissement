import {weightsOf} from './herd.js';
const DAY=86400000;
const timestamp=date=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;const time=Date.parse(date+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date?time:null};
const positive=value=>Number.isFinite(Number(value))&&Number(value)>0;
export function weightComparison(animal,lot){
 const measured=weightsOf(animal).filter(w=>timestamp(w.date)!=null);
 if(positive(animal.entryWeight)&&timestamp(animal.entryDate)!=null&&!measured.some(w=>w.date===animal.entryDate))measured.push({date:animal.entryDate,kg:Number(animal.entryWeight)});
 measured.sort((a,b)=>a.date.localeCompare(b.date));
 const first=measured[0];
 let plan=null;
 if(positive(animal.targetGmq)&&first){
  plan={date:first.date,kg:first.kg,gmq:Number(animal.targetGmq),target:Number(animal.target),source:'GMQ objectif de la fiche'};
 }else if(!positive(animal.targetGmq)){
  const rations=[...(animal.rations||[]).map(r=>({...r,source:'Ration individuelle'})),...(lot?.rations||[]).filter(r=>r.members?.includes(animal.id)).map(r=>({...r,source:'Ration du lot'}))]
   .filter(r=>timestamp(r.date)!=null&&positive(r.profile?.gmq)&&positive(r.profile?.poidsDepart)&&positive(r.profile?.poidsVente))
   .sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
  const ration=rations[0];
  // Compare both trajectories from the same observed baseline, even if the ration was saved later.
  if(ration)plan={date:first?.date||ration.date,kg:first?Number(first.kg):Number(ration.profile.poidsDepart),gmq:Number(ration.profile.gmq)/1000,target:Number(ration.profile.poidsVente),source: ration.source+' du '+ration.date};
 }
 if(plan&&(!positive(plan.target)||plan.target<=plan.kg))plan=null;
 const points=new Map(measured.map(w=>[timestamp(w.date),{time:timestamp(w.date),actual:w.kg}]));
 let targetDate=null;
 if(plan){
  const start=timestamp(plan.date),duration=Math.ceil((plan.target-plan.kg)/plan.gmq),end=start+duration*DAY;
  if(!Number.isFinite(end)||end>Date.parse('9999-12-31'))plan=null;
  else{
   targetDate=new Date(end).toISOString().slice(0,10);
   // Bound rendering cost without rounding calendar intervals between real weighings.
   const steps=Math.min(120,duration);
   for(let i=0;i<=steps;i++){const time=start+Math.round(duration*i/steps)*DAY;if(!points.has(time))points.set(time,{time,actual:null})}
   for(const point of points.values())point.forecast=point.time>=start&&point.time<=end?Math.min(plan.target,plan.kg+(point.time-start)/DAY*plan.gmq):null;
  }
 }
 const last=measured.at(-1),lastTime=last?timestamp(last.date):null;
 const expected=plan&&lastTime>=timestamp(plan.date)?Math.min(plan.target,plan.kg+(lastTime-timestamp(plan.date))/DAY*plan.gmq):null;
 return {points:[...points.values()].sort((a,b)=>a.time-b.time),plan,targetDate,last,deviation:expected!=null?last.kg-expected:null};
}
