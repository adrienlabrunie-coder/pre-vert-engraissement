const DAY=86400000;
const day=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:null};
export const daysSince=(start,at)=>day(start)==null||day(at)==null?null:Math.floor((day(at)-day(start))/DAY);
export const datePlus=(start,days)=>day(start)==null?null:new Date(day(start)+days*DAY).toISOString().slice(0,10);
export function buildStages(lines,initial,duration=28,interval=7){
 if(!Number.isInteger(duration)||duration<1||duration>120||!Number.isInteger(interval)||interval<1||interval>duration)throw Error('Durée de transition : 1 à 120 jours ; intervalle compris dans cette durée.');
 if(!lines.length||lines.some(l=>!Number.isFinite(Number(l.kgMS))||Number(l.kgMS)<0||!Number.isFinite(Number(initial[l.feedId]))||Number(initial[l.feedId])<0))throw Error('Renseignez les quantités initiales et finales de chaque aliment.');
 const offsets=[0];for(let d=interval;d<duration;d+=interval)offsets.push(d);offsets.push(duration);
 return offsets.map((offset,i)=>({day:offset+1,name:i===offsets.length-1?'Ration de croisière':`Palier ${i+1}`,lines:lines.map(l=>({feedId:l.feedId,kgMS:Math.round((Number(initial[l.feedId])+(Number(l.kgMS)-Number(initial[l.feedId]))*offset/duration)*1000)/1000}))}));
}
export function rationAt(animal,at){
 const candidates=(animal.rations||[]).filter(r=>r.distribution?.validatedAt&&daysSince(r.distribution.startDate,at)>=0).sort((a,b)=>a.distribution.startDate.localeCompare(b.distribution.startDate)||(a.createdAt||'').localeCompare(b.createdAt||''));
 const ration=candidates.at(-1);if(!ration)return null;
 const elapsed=daysSince(ration.distribution.startDate,at),stages=ration.distribution.stages;
 const stage=[...stages].reverse().find(s=>s.day<=elapsed+1);const next=stages.find(s=>s.day>elapsed+1);
 return {ration,stage,day:elapsed+1,daysInCentre:daysSince(animal.entryDate,at),next:next?{...next,date:datePlus(ration.distribution.startDate,next.day-1)}:null};
}
export function assignRation(animals,assignments,recipe,now=new Date().toISOString()){
 if(!assignments.length||new Set(assignments.map(a=>a.id)).size!==assignments.length)throw Error('Sélectionnez au moins un bovin, sans doublon.');
 for(const a of assignments){const animal=animals.find(x=>x.id===a.id);if(!animal)throw Error('Un bovin sélectionné est introuvable.');if(day(a.startDate)==null||animal.entryDate&&day(animal.entryDate)!=null&&daysSince(animal.entryDate,a.startDate)<0)throw Error('La transition doit commencer à une date valide, au plus tôt à l’entrée du bovin.');}
 const map=new Map(assignments.map(a=>[a.id,a]));
 return animals.map(a=>{const assignment=map.get(a.id);if(!assignment)return a;return {...a,rations:[...(a.rations||[]),{...structuredClone(recipe),id:crypto.randomUUID(),members:[a.id],createdAt:now,distribution:{...structuredClone(recipe.distribution),startDate:assignment.startDate,validatedAt:now}}]}});
}
