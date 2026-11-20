import test from 'node:test';import assert from 'node:assert/strict';
import {emptyReplica,editReplica,snapshotOf,mergeRemote,pendingRecords,resolveReplica} from '../src/cloud/replica.js';
const animal={id:'a',number:'FR 1234567890',custom:{keep:true},weights:[{date:'2026-01-01',kg:400}],scores:[{id:'legacy',date:'2026-01-02',values:{ARC:3,UNKNOWN:9},extra:'keep'}],treatments:[]};
test('Migration locale : événements séparés, identités stables, champs anciens conservés',()=>{const a=editReplica(emptyReplica(),{animals:[animal],lots:[]});const snap=snapshotOf(a);assert.equal(snap.animals[0].scores[0].extra,'keep');assert.deepEqual(snap.animals[0].custom,animal.custom);assert.ok(snap.animals[0].weights[0].id);const b=editReplica(a,snap);assert.deepEqual(Object.keys(a.desired),Object.keys(b.desired));assert.equal(pendingRecords(b).length,3)});
test('Modifications parallèles : conflit sur fiche, deux ajouts conservés',()=>{let a=editReplica(emptyReplica(),{animals:[animal],lots:[]});const server=Object.values(a.desired).map(r=>({...r,version:1}));a=mergeRemote(a,server);assert.equal(pendingRecords(a).length,0);const snapshot=snapshotOf(a);snapshot.animals[0].race='Limousine';snapshot.animals[0].weights.push({id:'local',date:'2026-02-01',kg:420});a=editReplica(a,snapshot);const parent=server.find(r=>r.kind==='animal');a=mergeRemote(a,[{...parent,version:2,payload:{...parent.payload,race:'Charolaise'}},{kind:'weight',id:'a:remote',subject_kind:'animal',subject_id:'a',payload:{id:'remote',date:'2026-02-02',kg:430},version:1}]);assert.equal(snapshotOf(a).animals[0].weights.length,3);assert.ok(a.conflicts['animal:a']);assert.equal(pendingRecords(a).length,1);a=resolveReplica(a,'animal:a','local');assert.equal(a.base['animal:a'].version,2);assert.equal(pendingRecords(a).length,2);assert.equal(snapshotOf(a).animals[0].race,'Limousine')});
test('Version distante plus ancienne ignorée et suppressions conservées',()=>{let a=editReplica(emptyReplica(),{animals:[animal],lots:[]});a=mergeRemote(a,Object.values(a.desired).map(r=>({...r,version:3})));const parent=a.base['animal:a'];a=mergeRemote(a,[{...parent,version:2,payload:{number:'OLD',id:'a'}}]);assert.equal(snapshotOf(a).animals[0].number,animal.number);a=editReplica(a,{animals:[],lots:[]});assert.equal(snapshotOf(a).animals.length,0);assert.ok(a.desired['animal:a'].deleted)});

test('Supprimer un bovin avant sa première synchronisation annule ses créations en attente',()=>{
 const draft=editReplica(emptyReplica(),{animals:[animal],lots:[{id:'lot',name:'Finition'}]});
 const deleted=editReplica(draft,{...snapshotOf(draft),animals:[]});
 assert.deepEqual(pendingRecords(deleted).map(r=>r.kind),['lot']);
 assert.equal(snapshotOf(deleted).animals.length,0);
});

test('La suppression conserve une création en cours de synchronisation et les événements déjà partagés',()=>{
 const draft=editReplica(emptyReplica(),{animals:[animal],lots:[]});
 const server=Object.values(draft.desired).map(r=>({...r,version:1}));
 const shared=mergeRemote(draft,server);
 const weight={kind:'weight',id:'a:new',subject_kind:'animal',subject_id:'a',payload:{id:'new',date:'2026-01-03',kg:405},deleted:false};
 shared.desired['weight:a:new']=weight;
 shared.inflight={record:weight};
 const deleted=editReplica(shared,{animals:[],lots:[]});
 assert.equal(pendingRecords(deleted).length,4);
 assert.ok(pendingRecords(deleted).every(r=>r.deleted));
});

test('Supprimer un lot partagé détache ses bovins et conserve leur historique individuel',async()=>{
 const {withoutLot}=await import('../src/cloud/workspace.js');
 const draft=editReplica(emptyReplica(),{
  animals:[{...animal,lot:'a-lot',place:'Case 2'},{id:'other',lot:'other-lot',place:'Case 3'}],
  lots:[{id:'a-lot',rations:[{id:'recipe'}]},{id:'other-lot'}]
 });
 const shared=mergeRemote(draft,Object.values(draft.desired).map(record=>({...record,version:1})));
 const before=snapshotOf(shared);
 const deleted=editReplica(shared,withoutLot(before,'a-lot'));
 assert.deepEqual(snapshotOf(deleted),{
  animals:[{...before.animals[0],lot:'',place:''},before.animals[1]],
  lots:[before.lots[1]]
 });
 assert.deepEqual(pendingRecords(deleted).map(record=>[record.kind,record.deleted]),[
  ['animal',false],['lot',true],['ration',true]
 ]);
});
