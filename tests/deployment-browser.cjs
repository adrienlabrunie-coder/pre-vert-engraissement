const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
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
  await page.goto(url);
  await page.getByRole('heading',{name:'Centre d’engraissement',exact:true}).waitFor();
  await page.locator('.brand img').evaluate(img=>img.decode());
  const manifest=await (await context.request.get(url+'manifest.webmanifest')).json();
  assert.equal(manifest.start_url,base);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
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
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
