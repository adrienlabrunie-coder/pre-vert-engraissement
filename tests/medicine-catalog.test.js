import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewedMedicine} from '../src/medicine-reviewed.js';
const read=name=>JSON.parse(readFileSync(new URL('../public/medicines/'+name,import.meta.url),'utf8'));
test('offline catalogue references resolve and numerical mapping fails closed on source changes',()=>{
 const index=read('index.json');
 const chunks=new Map([...new Set(index.products.map(p=>p.chunk))].map(name=>[name,read(name)]));
 assert.equal(new Set(index.products.map(p=>p.id)).size,index.products.length);
 for(const p of index.products){const doc=chunks.get(p.chunk).find(d=>d.id===p.id);assert.ok(doc);assert.equal(doc.name,p.name);assert.match(doc.rcpUrl,/^https:\/\/www\.ircp\.anmv\.anses\.fr\/rcp.aspx\?/);if(doc.clinicalAvailable){assert.ok(doc.posology);assert.ok(doc.withdrawal)}}
 const p=index.products.find(p=>p.name==='MULTIBIO SUSPENSION INJECTABLE');
 const doc=chunks.get(p.chunk).find(d=>d.id===p.id),profile=reviewedMedicine(doc);
 assert.equal(profile.meatDays,21);assert.equal(profile.intervalHours,12);assert.equal(profile.count,6);
 assert.equal(reviewedMedicine({...doc,sourceHash:'changed'}),null);
 assert.equal(reviewedMedicine({...doc,amm:'another authorization'}),null);
 assert.equal(reviewedMedicine({...doc,name:'another medicine'}),null);
});
