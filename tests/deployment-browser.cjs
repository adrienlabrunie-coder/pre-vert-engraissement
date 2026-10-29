const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const deadline=setTimeout(()=>{console.error('Deployment browser test timed out');process.exit(1)},90000);
(async()=>{
 const base='/pre-vert-engraissement/';
 const url='http://127.0.0.1:5188'+base;
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5188','--strictPort'],{env:{...process.env,VITE_BASE_PATH:base},stdio:'inherit'});
 let browser;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'Preview server started');
  browser=await chromium.launch({args:['--use-fake-device-for-media-stream']});
  const context=await browser.newContext();
  await context.grantPermissions(['camera'],{origin:new URL(url).origin});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>console.log('Browser:',msg.text()));
  await page.addInitScript(()=>{
   const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async constraints=>{try{const stream=await original(constraints);console.log('Camera stream opened',stream.getTracks().length);return stream}catch(error){console.log('Camera failure',error.name,error.message);throw error}};
  });
  console.log('Opening Pages preview');
  await page.goto(url);
  await page.getByRole('heading',{name:'Centre d’engraissement',exact:true}).waitFor();
  await page.locator('.brand img').evaluate(img=>img.decode());
  const manifest=await (await context.request.get(url+'manifest.webmanifest')).json();
  assert.equal(manifest.start_url,base);
  console.log('Testing camera stream and permission errors');
  await page.getByRole('button',{name:'Scanner passeport',exact:true}).click();
  await page.getByRole('button',{name:'Activer la caméra',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2).catch(async error=>{console.log('Scanner state:',await page.getByRole('dialog').innerText());throw error});
  await page.evaluate(()=>{window.cameraTracks=document.querySelector('video').srcObject.getTracks()});
  await page.getByRole('button',{name:'Arrêter la caméra',exact:true}).click();
  assert.ok(await page.evaluate(()=>window.cameraTracks.every(t=>t.readyState==='ended')));
  await page.evaluate(()=>{
   window.originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Denied in test','NotAllowedError'));
  });
  await page.getByRole('button',{name:'Activer la caméra',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'permissions de ce site'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Activer la caméra',exact:true}).isEnabled());
  await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=window.originalGetUserMedia});
  await page.getByRole('button',{name:'Activer la caméra',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('video')?.srcObject?.active);
  await page.evaluate(()=>{window.cameraTracks=document.querySelector('video').srcObject.getTracks()});
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  assert.ok(await page.evaluate(()=>window.cameraTracks.every(t=>t.readyState==='ended')));
  console.log('PASS camera stream, stop, permission error, retry and release on close.');
  console.log('Waiting for offline cache');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(()=>localStorage.setItem('pv_animals',JSON.stringify([{id:'deployment-test',number:'FR TEST 001',sex:'F',race:'Limousine',birth:'2025-01-01',scores:[],weights:[],treatments:[]}])));
  await page.reload();
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  console.log('Testing offline navigation');
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('heading',{name:'Centre d’engraissement',exact:true}).waitFor();
  await page.getByRole('button',{name:'Pointage',exact:true}).click();
  await page.getByRole('button',{name:'Arrondi de culotte',exact:true}).click();
  await page.locator('.scoring-photo').evaluate(img=>img.decode());
  const loaded=await page.evaluate(async(base)=>{
   const paths=['logo.png','manual/idele-2014-p23.webp','scoring/ARC.webp','medicines/index.json'];
   for(const path of paths){const r=await fetch(base+path);if(!r.ok)throw Error(path)}
   const catalog=await(await fetch(base+'medicines/index.json')).json();
   const product=catalog.products.find(p=>p.name==='MULTIBIO SUSPENSION INJECTABLE');
   return (await(await fetch(base+'medicines/'+product.chunk)).json()).some(p=>p.id===product.id);
  },base);
  assert.ok(loaded,'Medicine records cached offline');
  assert.deepEqual(errors,[]);
  console.log('PASS Pages subpath: dashboard, manifest, scoring images, medicine records and offline reload.');
 }finally{clearTimeout(deadline);await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
