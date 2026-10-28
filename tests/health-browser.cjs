const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5181','--strictPort'],{stdio:'ignore'});let browser;
 try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5181')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
  browser=await chromium.launch({headless:true});const page=await browser.newPage({timezoneId:'Europe/Paris'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5181');
  const animal={id:'health-test',number:'FR 1234567890',sex:'F',birth:'2020-01-01',weights:[],scores:[],treatments:[{id:'legacy',date:'2026-01-01',product:'Ancien traitement',withdrawal:'Délai conservé'}],custom:'préserver'};
  await page.evaluate(a=>localStorage.setItem('pv_animals',JSON.stringify([a])),animal);await page.reload();
  await page.getByRole('button',{name:/FR 1234567890/}).first().click();await page.getByRole('navigation',{name:'Rubriques du bovin'}).getByRole('button',{name:'Sanitaire',exact:true}).click();await page.getByRole('button',{name:'Ajouter un traitement'}).click();
  await page.getByLabel('Date du début').fill('2026-10-24');await page.getByLabel('Médicament / produit').fill('Produit de test');await page.getByLabel('Calculer une échéance').check();await page.getByLabel('Dernière administration (').fill('2026-10-24T10:00');await page.getByLabel('Délai légal viande indiqué').fill('7');await page.getByLabel('Référence RCP /').fill('RCP de test — sans médicament réel');await page.getByRole('button',{name:'Enregistrer le traitement'}).click();assert.match(await page.getByRole('alert').innerText(),/Vérifiez/);
  await page.getByLabel('Utilisation dans les conditions normales').check();await page.getByLabel('J’ai vérifié le délai légal').check();assert.match(await page.locator('.calculation-preview').innerText(),/336 h/);
  for(const width of [1280,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('.dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false)}
  await page.getByRole('button',{name:'Enregistrer le traitement'}).click();await page.waitForSelector('.dialog',{state:'detached'});await page.reload();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals'))[0]);assert.deepEqual(saved.treatments[0],animal.treatments[0]);assert.equal(saved.custom,'préserver');assert.equal(saved.treatments[1].withdrawalCalculation.until,'2026-11-07T08:00:00.000Z');assert.deepEqual(saved.scores,[]);assert.deepEqual(errors,[]);
  console.log('PASS sanitaire : source requise, délai BIO, changement heure, historique conservé, 4 tailles écran.');
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
