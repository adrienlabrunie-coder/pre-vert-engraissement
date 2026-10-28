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
