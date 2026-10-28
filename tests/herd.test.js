import test from 'node:test';import assert from 'node:assert/strict';
import {currentWeight,ageMonths,gain,herdSummary,dueForWeight} from '../src/herd.js';
test('Indicateurs excluent les poids inconnus et ne supposent pas une conformité',()=>{
 const a=[{id:'1',entryWeight:500,target:490,birth:'2025-10-28',scores:[]},{id:'2',weights:[],scores:[]}];
 const s=herdSummary(a,'2026-10-28');assert.equal(s.weight,500);assert.equal(s.count,2);assert.equal(s.targetCount,1);assert.equal(s.reached,1);assert.equal(s.withoutScore.length,2);assert.equal(currentWeight(a[1]),null);
});
test('Pesée récente, seuil de 30 jours et tri des poids',()=>{
 const a={weights:[{date:'2026-10-01',kg:550},{date:'2026-09-01',kg:520}]};
 assert.equal(currentWeight(a),550);assert.equal(gain(a),1);assert.equal(dueForWeight(a,'2026-10-30'),false);assert.equal(dueForWeight(a,'2026-10-31'),true);
});
test('Date de naissance absente ou future non comptabilisée',()=>{assert.equal(ageMonths('', '2026-10-28'),null);assert.equal(ageMonths('2027-01-01','2026-10-28'),null)});
