import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScore,appendScore,criteria,guidance,localDate} from '../src/scoring.js';
const score=(values,extra={})=>({date:'2026-10-20',values,...extra});
const valid=s=>validateScore(s,{birth:'2025-01-01'},'2026-10-28');
test('Les 31 postes ont un code unique et une référence de manuel',()=>{
 const codes=criteria.flatMap(g=>g.items.map(x=>x[0]));assert.equal(codes.length,31);assert.equal(new Set(codes).size,31);assert.ok(codes.every(c=>guidance[c]?.length===3));
});
test('Pointage partiel et bornes 1 et 10 acceptés',()=>{assert.deepEqual(valid(score({ARC:1,ETA:10})),[])});
test('Notes manquantes, inconnues, non entières ou hors plage refusées',()=>{
 for(const v of [{},{ARC:0},{ARC:11},{ARC:5.5},{ARC:'5'},{ARC:NaN},{XYZ:5}])assert.ok(valid(score(v)).length);
});
test('Dates vides, impossibles, futures ou antérieures à la naissance refusées',()=>{
 for(const date of ['', '2026-02-30','2026-13-01','2026-10-29','2024-12-31'])assert.ok(valid(score({ARC:5},{date})).length);
});
test('Les aplombs sous 6 exigent un défaut codifié',()=>{
 for(const code of ['AAV','AAR'])assert.ok(valid(score({[code]:5})).length);
 assert.deepEqual(valid(score({AAV:5},{defects:{AAV:['avca']}})),[]);
 assert.ok(valid(score({AAV:5},{defects:{AAV:['inconnu']}})).length);
});
test('Plusieurs défauts marquants sur le même membre : deux codes et note ≤3',()=>{
 const extra={defects:{AAR:['arco','arpa']},multipleDefects:{AAR:true}};
 assert.ok(valid(score({AAR:4},extra)).length);assert.deepEqual(valid(score({AAR:3},extra)),[]);
 assert.ok(valid(score({AAR:3},{...extra,defects:{AAR:['arco']}})).length);
});
test('Note 10 aplombs exige une observation complète à l’arrêt et en marche',()=>{
 assert.ok(valid(score({AAV:10})).length);
 assert.deepEqual(valid(score({AAV:10},{movementConfirmed:{AAV:true}})),[]);
});
test('Ajout non destructif : historique ancien, données annexes et autres bovins préservés',()=>{
 const old={id:'old',date:'2024-01-01',values:{AAV:2,legacy:12},unknown:'keep'};
 const animals=[{id:'a',weights:[{date:'2026-01-01',kg:400}],scores:[old],treatments:[{product:'test'}],custom:{value:7}},{id:'b',scores:[]}];
 const before=JSON.stringify(animals);const added={...score({ARC:8}),id:'new',schemaVersion:2,notes:'Observation datée'};
 const result=appendScore(animals,'a',added);
 assert.equal(JSON.stringify(animals),before);assert.deepEqual(result[0].scores,[old,added]);assert.equal(result[1],animals[1]);
 assert.deepEqual({...result[0],scores:animals[0].scores},animals[0]);
 const backup=JSON.parse(JSON.stringify({version:1,animals:result,lots:[{id:'L1'}]}));assert.deepEqual(backup.animals,result);
 assert.throws(()=>appendScore(animals,'absent',added));
});
test('Date locale calculée avec les composantes calendaires locales',()=>{
 const d=new Date(2026,9,28,0,15);assert.equal(localDate(d),'2026-10-28');
});
