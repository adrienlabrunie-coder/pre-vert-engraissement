import test from 'node:test';
import assert from 'node:assert/strict';
import {weightComparison} from '../src/weight-forecast.js';
const animal={id:'A',entryDate:'2026-01-01',entryWeight:400,target:500,targetGmq:1,weights:[{date:'2026-02-01',kg:425}]};
test('Forecast uses actual calendar intervals, does not extend real weights into the future and reaches its target',()=>{
 const result=weightComparison(animal);assert.equal(result.targetDate,'2026-04-11');assert.equal(result.deviation,-6);
 assert.equal(result.points.find(p=>p.time===Date.parse('2026-02-01')).forecast,431);
 assert.equal(result.points.filter(p=>p.actual!=null).length,2);assert.equal(result.points.at(-1).actual,null);assert.equal(result.points.at(-1).forecast,500);
});
test('No made-up forecast without a GMQ, dated baseline or target above starting weight',()=>{
 assert.equal(weightComparison({...animal,targetGmq:null}).plan,null);
 assert.equal(weightComparison({...animal,entryDate:'',weights:[]}).plan,null);
 assert.equal(weightComparison({...animal,target:350}).plan,null);
 assert.equal(weightComparison({...animal,entryDate:'2026-02-30',weights:[]}).plan,null);
});
test('Recorded ration uses g/day conversion and shared measured baseline; lot history must include the animal',()=>{
 const ration={date:'2026-02-01',profile:{gmq:1200,poidsDepart:425,poidsVente:545},members:['A']};
 const a={...animal,targetGmq:null,rations:[ration]};const result=weightComparison(a);assert.equal(result.plan.gmq,1.2);assert.equal(result.plan.date,'2026-01-01');assert.equal(result.plan.kg,400);assert.ok(Math.abs(result.deviation+12.2)<1e-9);assert.equal(result.targetDate,'2026-05-02');
 assert.equal(weightComparison({...a,rations:[]},{rations:[{...ration,members:['B']}]}).plan,null);
 assert.equal(weightComparison({...a,rations:[]},{rations:[ration]}).plan.gmq,1.2);
 assert.equal(weightComparison({...a,targetGmq:.8}).plan.gmq,.8);
});

test('A later ration cannot shift the comparison away from historical weighings',()=>{
 const a={id:'A',entryDate:'2026-05-01',entryWeight:490,weights:[{date:'2026-08-10',kg:580}],rations:[{date:'2026-10-30',profile:{gmq:1000,poidsDepart:460,poidsVente:700}}]};
 const original=structuredClone(a),r=weightComparison(a);
 assert.equal(r.plan.date,'2026-05-01');assert.equal(r.plan.kg,490);
 assert.equal(r.points[0].actual,r.points[0].forecast);
 assert.equal(r.points.find(p=>p.actual===580).forecast,591);
 assert.deepEqual(a,original);
 const fallback=weightComparison({...a,entryDate:'',weights:[]});
 assert.equal(fallback.plan.date,'2026-10-30');assert.equal(fallback.plan.kg,460);
});
