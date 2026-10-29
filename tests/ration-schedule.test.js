import test from 'node:test';import assert from 'node:assert/strict';
import {buildStages,assignRation,rationAt,daysSince,datePlus} from '../src/ration-schedule.js';
test('individual distribution: 60 days vs 2 days, exact stage boundaries and frozen history',()=>{
 const lines=[{feedId:'hay',kgMS:8},{feedId:'grain',kgMS:3}],initial={hay:8,grain:0};const stages=buildStages(lines,initial,28,7);
 assert.deepEqual(stages.map(s=>s.day),[1,8,15,22,29]);assert.equal(stages[0].lines[1].kgMS,0);assert.equal(stages.at(-1).lines[1].kgMS,3);
 const animals=[{id:'old',entryDate:'2026-08-30',rations:[]},{id:'new',entryDate:'2026-10-27',rations:[]},{id:'other',rations:[]}];
 const recipe={name:'Base',date:'2026-10-29',feeds:[{id:'hay',ms:85},{id:'grain',ms:86}],lines,distribution:{stages}};
 const assigned=assignRation(animals,[{id:'old',startDate:'2026-08-30'},{id:'new',startDate:'2026-10-27'}],recipe,'2026-10-29T10:00:00Z');
 assert.equal(assigned[2],animals[2]);assert.equal(animals[0].rations.length,0);assert.notEqual(assigned[0].rations[0].id,assigned[1].rations[0].id);
 const old=rationAt(assigned[0],'2026-10-29'),recent=rationAt(assigned[1],'2026-10-29');assert.equal(old.daysInCentre,60);assert.equal(recent.daysInCentre,2);assert.equal(old.stage.lines[1].kgMS,3);assert.equal(recent.stage.lines[1].kgMS,0);assert.equal(recent.next.date,'2026-11-03');
 assert.equal(rationAt(assigned[1],'2026-11-02').stage.day,1);assert.equal(rationAt(assigned[1],'2026-11-03').stage.day,8);
 recipe.feeds[0].ms=10;recipe.distribution.stages[0].lines[0].kgMS=100;assert.equal(assigned[0].rations[0].feeds[0].ms,85);assert.equal(recent.stage.lines[0].kgMS,8);
 const changed=assignRation(assigned,[{id:'old',startDate:'2026-10-29'}],{...recipe,distribution:{stages:buildStages(lines,initial)}},'2026-10-29T11:00:00Z');assert.equal(changed[0].rations.length,2);assert.equal(rationAt(changed[0],'2026-10-29').stage.day,1,'a new ration resets progression even for an older animal');assert.equal(rationAt(changed[0],'2026-10-28').stage.day,29);
 assert.equal(rationAt(assigned[1],'2026-10-26'),null);assert.equal(daysSince('2026-03-28','2026-03-30'),2);assert.equal(datePlus('2028-02-28',1),'2028-02-29');assert.equal(daysSince('2026-02-30','2026-03-01'),null);
 assert.throws(()=>assignRation(animals,[{id:'old',startDate:'2026-08-01'}],recipe),/entrée/);assert.throws(()=>assignRation(animals,[{id:'missing',startDate:'2026-10-29'}],recipe),/introuvable/);assert.throws(()=>buildStages(lines,{hay:8}),/quantités/);
});
