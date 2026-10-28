// Starts an isolated local Vite server unless TEST_URL is supplied.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
 const url=process.env.TEST_URL||'http://127.0.0.1:5178';
 const server=process.env.TEST_URL?null:spawn(process.execPath,['node_modules/vite/bin/vite.js',...(process.env.TEST_PRODUCTION?['preview']:[]),'--host','127.0.0.1','--port','5178','--strictPort'],{stdio:'ignore'});
 let browser;
 try {
  for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const failures=[];page.on('pageerror',e=>failures.push(e.message));
  await page.goto(url);
  const legacy={id:'old',date:'2026-01-02',values:{ARC:3,AAV:2,LEGACY:7},custom:'préserver'};
  const animal={id:'test',number:'FR TEST 001',sex:'F',race:'Limousine',birth:'2025-01-01',scores:[legacy],weights:[{date:'2026-01-01',kg:400}],treatments:[{id:'health',date:'2026-01-01',product:'Test'}],custom:'champ existant'};
  await page.evaluate(a=>{localStorage.setItem('pv_animals',JSON.stringify([a]));localStorage.setItem('pv_lots',JSON.stringify([{id:'L1',name:'Lot test'}]))},animal);
  await page.reload();
  await page.getByRole('button',{name:'Pointage',exact:true}).click();
  await page.getByLabel('Date du pointage *').fill('2026-10-20');
  await page.getByLabel('Nom / code du pointeur').fill('Technicien test');
  await page.getByLabel('Observer la mamelle').check();
  await page.getByRole('button',{name:'Conformation',exact:true}).click();
  await page.getByRole('button',{name:'ARC : 8 sur 10',exact:true}).click();
  await page.getByLabel('Observation pour ARC').fill('Profil observé sur sol plat.');
  await page.getByRole('button',{name:'Fonctionnalité',exact:true}).click();
  await page.getByRole('button',{name:'AAV : 5 sur 10',exact:true}).click();
  await page.getByRole('button',{name:'Vérification',exact:true}).click();
  await page.getByRole('button',{name:'Enregistrer le pointage',exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(),/défaut observé/);
  await page.getByRole('button',{name:'Fonctionnalité',exact:true}).click();
  await page.getByLabel('Cagneux (avca)',{exact:true}).check();
  await page.getByRole('button',{name:'Mamelle',exact:true}).click();
  await page.getByRole('button',{name:'DPJ : 5 sur 10',exact:true}).click();
  for(const width of [1280,768,375,320]){
   await page.setViewportSize({width,height:900});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,15)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow page ${width}`);
   assert.equal(await page.locator('.dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false,`overflow dialog ${width}`);
   const box=await page.getByRole('button',{name:'DPJ : 5 sur 10',exact:true}).boundingBox();assert.ok(box.height>=44&&box.width>=40);
  }
  await page.screenshot({path:'/tmp/prevert-pointage-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Vérification',exact:true}).click();
  await page.getByLabel('Observations générales').fill('Pointage partiel de contrôle.');
  await page.getByRole('button',{name:'Enregistrer le pointage',exact:true}).click();
  await page.waitForSelector('.dialog',{state:'detached'});
  await page.reload();
  if(process.env.TEST_PRODUCTION){
   await page.evaluate(()=>navigator.serviceWorker.ready);
   await page.reload();await page.context().setOffline(true);await page.reload();
   assert.ok(await page.getByRole('button',{name:/FR TEST 001/}).isVisible());
   await page.context().setOffline(false);
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')));
  assert.equal(saved[0].scores.length,2);assert.deepEqual(saved[0].scores[0],legacy);
  assert.deepEqual({...saved[0],scores:animal.scores},animal);
  assert.equal(saved[0].scores[1].notes,'Pointage partiel de contrôle.');
  assert.equal(saved[0].scores[1].values.DPJ,5);
  assert.deepEqual(saved[0].scores[1].defects.AAV,['avca']);
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:/FR TEST 001/}).click();
  await page.getByText('20/10/2026',{exact:true}).first().click();
  assert.ok(await page.getByText('Profil observé sur sol plat.',{exact:true}).isVisible());
  await page.screenshot({path:'/tmp/prevert-historique-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Nouveau pointage',exact:false}).click();
  await page.getByRole('button',{name:'Conformation',exact:true}).click();
  await page.getByRole('button',{name:'ARC : 1 sur 10',exact:true}).click();
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Fermer',exact:true}).click();assert.ok(await page.locator('.dialog').isVisible());
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Fermer',exact:true}).click();await page.waitForSelector('.dialog',{state:'detached'});
  // Simulate quota failure: the form must stay open and existing records unchanged.
  await page.getByRole('button',{name:'Nouveau pointage',exact:false}).click();
  await page.getByRole('button',{name:'Conformation',exact:true}).click();
  await page.getByRole('button',{name:'ARC : 1 sur 10',exact:true}).click();
  await page.getByRole('button',{name:'Vérification',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError')}});
  await page.getByRole('button',{name:'Enregistrer le pointage',exact:true}).click();
  assert.match(await page.getByRole('alert').innerText(),/Enregistrement impossible/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals'))[0].scores.length),2);
  assert.deepEqual(failures,[]);
  console.log('PASS: parcours guidé, défaut obligatoire, mamelle, 4 tailles d’écran, historique ancien, rechargement, abandon protégé et échec stockage.');
 } finally {await browser?.close();server?.kill()}
})().catch(e=>{console.error(e);process.exit(1)});
