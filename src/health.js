export const BIO_RULE={id:'EU-2018-848-II-II-1.5.2.5',checkedAt:'2026-10-28',url:'https://eur-lex.europa.eu/eli/reg/2018/848/oj?locale=fr'};
export function calculateWithdrawal({lastAdministration,legalDelay,unit='days',applyBio,standardUse,sourceVerified,source}){
 if(!sourceVerified||!String(source||'').trim())throw new Error('Vérifiez et renseignez la référence du RCP ou de l’ordonnance.');
 if(!standardUse)throw new Error('Hors conditions normales d’utilisation : faire déterminer le délai par le vétérinaire.');
 if(legalDelay===''||legalDelay==null||!Number.isFinite(Number(legalDelay))||Number(legalDelay)<0)throw new Error('Le délai légal doit être un nombre positif ou zéro explicitement confirmé.');
 if(!['days','hours'].includes(unit))throw new Error('Unité du délai invalide.');
 const last=new Date(lastAdministration);if(!lastAdministration||Number.isNaN(last.getTime()))throw new Error('Renseignez la date et l’heure de dernière administration.');
 const legalHours=Number(legalDelay)*(unit==='days'?24:1);
 const hours=applyBio?Math.max(48,2*legalHours):legalHours;
 const until=new Date(last.getTime()+hours*3600000);if(Number.isNaN(until.getTime()))throw new Error('Délai trop élevé.');
 return {legalHours,appliedHours:hours,until:until.toISOString(),lastAdministration:last.toISOString(),rule:applyBio?BIO_RULE:null,source:String(source).trim(),sourceVerified:true};
}
export const displayInstant=value=>value?new Date(value).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'—';

export const daysLabel=hours=>hours==null||!Number.isFinite(Number(hours))?'Délai non renseigné':`${Number((Number(hours)/24).toFixed(4)).toLocaleString('fr-FR',{maximumFractionDigits:4})} jour(s)`;
export function bioWithdrawalStatus(animal,now=Date.now()){
 const treatments=animal.treatments||[];if(!treatments.length)return {kind:'none',label:'Aucun délai enregistré'};
 const pending=treatments.some(t=>(t.reminders||[]).some(r=>r.status==='planned'));
 const uncertain=treatments.some(t=>!t.withdrawalCalculation?.rule||!Number.isFinite(Date.parse(t.withdrawalCalculation.until)));
 const end=Math.max(...treatments.map(t=>Date.parse(t.withdrawalCalculation?.until)||0));
 if(pending)return {kind:'blocked',label:'BIO bloqué — traitement à terminer',pending:true,until:end>now?new Date(end).toISOString():null,uncertain};
 if(uncertain)return {kind:'unknown',label:'BIO bloqué — délai à vérifier',until:end>now?new Date(end).toISOString():null};
 if(end>now)return {kind:'blocked',label:'BIO bloqué — délai viande en cours',until:new Date(end).toISOString(),remainingDays:Math.ceil((end-now)/86400000)};
 return {kind:'elapsed',label:'Délai BIO échu — statut à vérifier',until:new Date(end).toISOString()};
}
export function makeReminders({enabled,lastAdministration,intervalHours,count,confirmed}){
 if(!enabled)return [];
 const first=Date.parse(lastAdministration),interval=Number(intervalHours),total=Number(count);
 if(!confirmed)throw Error('Confirmez le rythme prescrit avant de créer les rappels.');
 if(!Number.isFinite(first)||!Number.isFinite(interval)||interval<=0||interval>8760||!Number.isInteger(total)||total<2||total>100)throw Error('Rappels : date initiale valide, intervalle positif et 2 à 100 administrations requises.');
 return Array.from({length:total-1},(_,i)=>({id:crypto.randomUUID(),dueAt:new Date(first+(i+1)*interval*3600000).toISOString(),status:'planned'}));
}
export function recordAdministration(t,reminderId,actual,now=Date.now()){
 const time=Date.parse(actual),last=Date.parse(t.lastAdministration);
 const next=(t.reminders||[]).find(r=>r.status==='planned');
 if(!next||next.id!==reminderId)throw Error('Ce rappel a déjà été traité ou n’est pas le prochain.');
 if(!Number.isFinite(time)||time>now||!Number.isFinite(last)||time<=last)throw Error('Saisissez une administration réelle, postérieure à la précédente et non future.');
 const update={...t,lastAdministration:new Date(time).toISOString(),administrationLog:[...(t.administrationLog||[{at:t.lastAdministration,dose:t.dose,route:t.route}]),{at:new Date(time).toISOString(),reminderId,dose:t.dose,route:t.route}],reminders:t.reminders.map(r=>r.id===reminderId?{...r,status:'done',actualAt:new Date(time).toISOString()}:r)};
 update.withdrawalCalculation=t.calculate?calculateWithdrawal(update):null;
 return update;
}
export function cancelReminders(t,now=new Date().toISOString()){
 return {...t,reminders:(t.reminders||[]).map(r=>r.status==='planned'?{...r,status:'cancelled',cancelledAt:now}:r),courseStoppedAt:now};
}
