import test from 'node:test';
import assert from 'node:assert/strict';
import {passportCandidate,appendPassportBatch} from '../src/passport-batch.js';
import {emptyReplica,editReplica,snapshotOf} from '../src/cloud/replica.js';
const settings={entryDate:'2026-10-01',lot:'L1',target:'650',targetGmq:'1',place:'Case 2'};
const candidate=number=>({...passportCandidate(number),sex:'F'});
test('Batch import creates distinct animals and preserves existing animals without inventing weights',()=>{
 const old={id:'old',number:'FR 9999999999',custom:'keep',weights:[],treatments:[]};const rows=[candidate('1234567890'),{...candidate('1234567891'),entryWeight:'410'}];
 const result=appendPassportBatch([old],rows,settings,'2026-10-29');
 assert.equal(result.length,3);assert.equal(result[0],old);assert.equal(result[1].sex,'F');assert.deepEqual(result[1].weights,[]);assert.equal(result[1].entryWeight,null);assert.equal(result[2].weights[0].kg,410);assert.equal(new Set(result.map(a=>a.id)).size,3);assert.equal(result[1].targetGmq,1);
 const replica=editReplica(emptyReplica(),{animals:result,lots:[]});const restored=snapshotOf(replica);assert.equal(restored.animals.length,3);assert.equal(restored.animals[2].weights[0].kg,410);assert.equal(restored.animals[0].custom,'keep');
});
test('Invalid rows and duplicates reject the whole batch without altering existing data',()=>{
 const existing=[{number:'FR 1234 5678 90'}];const original=structuredClone(existing);
 assert.throws(()=>appendPassportBatch(existing,[candidate('FR1234567890')],settings),/déjà présent/);
 assert.throws(()=>appendPassportBatch([],[candidate('1234567891'),candidate('FR 1234567891')],settings),/déjà présent/);
 assert.throws(()=>appendPassportBatch([], [candidate('1234567891'),passportCandidate('1234567892')],settings),/sexe/);
 assert.throws(()=>appendPassportBatch([], [{...candidate('1234567891'),birth:'2026-02-30'}],settings),/naissance/);
 assert.throws(()=>appendPassportBatch([], [{...candidate('1234567891'),entryWeight:'-5'}],settings),/poids/);
 assert.deepEqual(existing,original);
});
test('ASDA batch extraction preserves subject and parent races; identifier alone does not invent sex or birth',()=>{
 const asda='FR1234567890  '+'1'+'34'+'3879'+'12052025'+'2'+'0'+'1'+'12345678'+'87654321'+'123456789012';
 const row=passportCandidate(asda);assert.equal(row.birth,'2025-05-12');assert.equal(row.sex,'F');assert.equal(row.race,'LIMOUSINE');assert.equal(passportCandidate('1234567891').sex,'');assert.throws(()=>passportCandidate('invalid'),/non reconnu/);
});
