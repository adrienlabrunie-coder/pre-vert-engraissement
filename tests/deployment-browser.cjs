const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const deadline=setTimeout(()=>{console.error('Deployment browser test timed out');process.exit(1)},180000);
(async()=>{
 const base='/pre-vert-engraissement/';
 const url='http://127.0.0.1:5188'+base;
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5188','--strictPort'],{env:{...process.env,VITE_BASE_PATH:base},stdio:'inherit'});
 let browser;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
  assert.ok(ready,'Preview server started');
  browser=await chromium.launch();
  const context=await browser.newContext();
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>console.log('Browser:',msg.text()));
  // Exercise the scanner with a real MediaStream generated from a canvas.
  // CI has no physical camera: Android permission is checked separately in the APK.
  await page.addInitScript(()=>{
   navigator.mediaDevices.getUserMedia=async constraints=>{
    if(constraints.audio)throw Error('Scanner must not request microphone access');
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,640,480);
    const stream=canvas.captureStream(10);
    const timer=setInterval(()=>{
     if(!stream.active){clearInterval(timer);return}
     ctx.fillStyle='white';ctx.fillRect(0,0,640,480);
     const matrix=window.testCameraMatrix;if(matrix){ctx.fillStyle='black';const unit=Math.floor(400/matrix.length);for(let y=0;y<matrix.length;y++)for(let x=0;x<matrix.length;x++)if(matrix[y][x])ctx.fillRect(100+x*unit,20+y*unit,unit,unit);}
    },100);
    return stream;
   };
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
  await require('./batch-forecast-browser.cjs')(page);
  const lotId='d86daceb-9241-45ba-8ffb-e428289dadf2';
  await page.evaluate(lotId=>{
   localStorage.setItem('pv_lots',JSON.stringify([{id:lotId,name:'Box 1',building:'Bâtiment principal'}]));
   localStorage.setItem('pv_animals',JSON.stringify([{id:'lot-label-test',number:'FR LOT 001',sex:'F',lot:lotId,scores:[],weights:[],treatments:[]}]));
  },lotId);
  await page.reload();
  await page.locator('.lot-row-name b').filter({hasText:'Box 1'}).waitFor();
  assert.ok((await page.locator('.animal-row').innerText()).includes('Box 1'));
  assert.ok(!(await page.locator('main').innerText()).includes(lotId));
  await page.getByRole('button',{name:'Lots / Emplacements',exact:true}).click();
  await page.locator('.lot-card h3').filter({hasText:'Box 1'}).waitFor();
  assert.ok(!(await page.locator('main').innerText()).includes(lotId));
  await page.getByRole('button',{name:'Accueil',exact:true}).click();
  await page.setViewportSize({width:375,height:812});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Lot labels fit mobile');
  await page.locator('.animal-row').click();
  await page.getByText('Situation actuelle',{exact:true}).waitFor();
  assert.ok((await page.locator('.profile-metrics').innerText()).includes('Box 1'));
  assert.ok(!(await page.locator('main').innerText()).includes(lotId));
  await page.setViewportSize({width:1280,height:720});
  console.log('PASS lot names displayed instead of internal UUIDs, including on mobile.');
  await require('./ration-assignment-browser.cjs')(page);
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
