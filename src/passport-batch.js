import {parseAsda2007,parseBarcode,validatePassport} from './passport.js';
import {localDate} from './scoring.js';
export const normalizeAnimalNumber=value=>String(value||'').replace(/\s/g,'').toUpperCase();
export function passportCandidate(raw){
 const decoded=parseAsda2007(raw),number=decoded?.fields.number||parseBarcode(raw);
 if(!number)throw new Error('Code non reconnu : utilisez un code du sujet ou saisissez FR suivi de dix chiffres.');
 return {number,birth:'',sex:'',race:'',father:'',mother:'',entryWeight:'',...decoded?.fields,warnings:decoded?.warnings||[],source:decoded?'ASDA 2007':'Identifiant seul'};
}
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function appendPassportBatch(existing,rows,settings,now=localDate()){
 if(!rows.length)throw new Error('Scannez au moins un passeport.');
 if(!validDate(settings.entryDate)||settings.entryDate>now)throw new Error('Vérifiez la date d’entrée commune.');
 for(const [key,label] of [['target','Poids objectif'],['targetGmq','GMQ objectif']])if(settings[key]!==''&&settings[key]!=null&&(!Number.isFinite(Number(settings[key]))||Number(settings[key])<=0))throw new Error(`${label} : saisissez une valeur positive ou laissez vide.`);
 const numbers=new Set(existing.map(a=>normalizeAnimalNumber(a.number)));
 const candidates=rows.map((row,index)=>{
  const errors=validatePassport(row,[],now),number=normalizeAnimalNumber(row.number);
  if(numbers.has(number))errors.push('Numéro déjà présent dans le cheptel ou dans cette série.');
  if(row.birth&&row.birth>settings.entryDate)errors.push('Naissance postérieure à l’entrée.');
  if(row.entryWeight!==''&&row.entryWeight!=null&&(!Number.isFinite(Number(row.entryWeight))||Number(row.entryWeight)<=0))errors.push('Le poids d’entrée doit être positif ou laissé vide.');
  if(errors.length)throw new Error(`Bovin ${index+1} (${row.number||'sans numéro'}) : ${errors.join(' ')}`);
  numbers.add(number);
  return {id:crypto.randomUUID(),number:'FR '+number.slice(2),birth:row.birth||'',sex:row.sex,race:row.race||'',father:row.father||'',mother:row.mother||'',entryDate:settings.entryDate,lot:settings.lot||'',place:settings.place||'',entryWeight:row.entryWeight===''?null:Number(row.entryWeight)||null,target:settings.target===''?null:Number(settings.target)||null,targetGmq:settings.targetGmq===''?null:Number(settings.targetGmq)||null,weights:Number(row.entryWeight)>0?[{id:crypto.randomUUID(),date:settings.entryDate,kg:Number(row.entryWeight)}]:[],scores:[],treatments:[]};
 });
 return [...existing,...candidates];
}
