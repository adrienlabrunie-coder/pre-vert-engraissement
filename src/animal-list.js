export const MUSCLE_CODES=['ARC','DEE','EPD','LAC','LAD','LOC'];
export function normalizeEurop(value){
 const text=String(value||'').toUpperCase().replace(/\s/g,'');
 if(!text)return '';
 if(!/^[EUROP][+=-]?[1-5]$/.test(text))throw new Error('Classement estimé : utilisez E, U, R, O ou P, un +, = ou − facultatif, puis un état de 1 à 5 (ex. U-3, R+2).');
 return text;
}
export function latestPointage(animal){return [...(animal.scores||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''))[0]||null;}
export function muscleMean(animal){const v=latestPointage(animal)?.values;return v&&MUSCLE_CODES.every(k=>Number.isInteger(v[k])&&v[k]>=1&&v[k]<=10)?MUSCLE_CODES.reduce((sum,k)=>sum+v[k],0)/6:null;}
export function europRank(value){try{const v=normalizeEurop(value);if(!v)return null;return 'PORUE'.indexOf(v[0])*100+(v.includes('-')?0:v.includes('+')?20:10)+Number(v.at(-1));}catch{return null;}}
export function sortAnimals(animals,key='number',direction='asc'){
 const value=a=>{if(key==='age'){const t=Date.parse(a.birth);return Number.isFinite(t)&&t<=Date.now()?-t:null;}if(key==='entryDate'){const t=Date.parse(a.entryDate);return Number.isFinite(t)?t:null;}if(key==='pointage')return muscleMean(a);if(key==='europ')return europRank(a.europEstimate);if(MUSCLE_CODES.includes(key)||key==='ETA'){const v=latestPointage(a)?.values?.[key];return Number.isInteger(v)&&v>=1&&v<=10?v:null;}return String(a[key]||'').trim()||null;};
 return [...animals].sort((a,b)=>{const x=value(a),y=value(b);if(x==null||y==null)return x==null?(y==null?0:1):-1;const cmp=typeof x==='number'?x-y:x.localeCompare(y,'fr',{sensitivity:'base',numeric:true});return cmp*(direction==='desc'?-1:1)||String(a.number).localeCompare(String(b.number),'fr',{numeric:true});});
}
