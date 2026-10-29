const assert=require('node:assert/strict');
const {MultiFormatWriter,BarcodeFormat}=require('@zxing/library');
function matrix(raw){const bits=new MultiFormatWriter().encode(raw,BarcodeFormat.QR_CODE,240,240,new Map());return Array.from({length:bits.getHeight()},(_,y)=>Array.from({length:bits.getWidth()},(_,x)=>bits.get(x,y)))}
const asda=n=>'FR'+n+'  '+'1'+'34'+'3879'+'12052025'+'2'+'0'+'1'+'12345678'+'87654321'+'123456789012';
module.exports=async function(page){
 console.log('Testing continuous batch intake, photos, duplicate protection and weight comparison');
 assert.equal(await page.locator('.feature-cards').count(),0);
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length);
 await page.getByRole('button',{name:'Scanner passeport',exact:true}).click();
 await page.getByRole('button',{name:'Activer la caméra',exact:true}).click();
 await page.evaluate(m=>{window.testCameraMatrix=m},matrix(asda('1234567890')));
 await page.waitForFunction(()=>document.querySelectorAll('.batch-row').length===1);
 await page.evaluate(m=>{window.testCameraMatrix=m},matrix(asda('1234567891')));
 await page.waitForFunction(()=>document.querySelectorAll('.batch-row').length===2);
 assert.ok(await page.evaluate(()=>document.querySelector('video').srcObject.active));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),initial);
 await page.getByRole('button',{name:'Arrêter la caméra',exact:true}).click();
 await page.evaluate(()=>{window.testCameraMatrix=null});
 assert.equal(await page.getByLabel('Sexe du bovin 1').inputValue(),'F');
 assert.equal(await page.getByLabel('Naissance du bovin 2',{exact:true}).inputValue(),'2025-05-12');
 await page.getByRole('button',{name:'Retirer le bovin 2',exact:true}).click();
 const images=[];
 for(const raw of [asda('1234567890'),asda('1234567891')]){
  const data=await page.evaluate(m=>{const c=document.createElement('canvas');c.width=c.height=m.length;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';for(let y=0;y<m.length;y++)for(let x=0;x<m.length;x++)if(m[y][x])ctx.fillRect(x,y,1,1);return c.toDataURL('image/png').split(',')[1]},matrix(raw));
  images.push({name:'passeport-'+images.length+'.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 }
 await page.getByLabel('Photos des passeports').setInputFiles(images);
 await page.waitForFunction(()=>document.querySelectorAll('.batch-row').length===2);
 await page.getByLabel('Code lu / lecteur USB').fill('FR 8745 2301 56');
 await page.getByRole('button',{name:'Ajouter ce code à la liste'}).click();
 await page.getByRole('alert').filter({hasText:'existe déjà'}).waitFor();
 assert.equal(await page.locator('.batch-row').count(),2);
 await page.getByLabel('Date d’entrée commune').fill('2026-10-01');
 await page.getByLabel('Poids objectif commun').fill('650');
 await page.getByLabel('GMQ objectif commun').fill('1');
 await page.getByLabel('Poids d’entrée du bovin 1').fill('400');
 await page.getByLabel('Poids d’entrée du bovin 2').fill('420');
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.locator('.dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false,`batch overflow ${width}`)}
 await page.setViewportSize({width:1280,height:900});
 await page.getByLabel('J’ai vérifié les numéros des sujets').check();
 await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pv_animals')throw Error('Stockage plein simulé');return window.originalStorageSet.call(this,k,v)}});
 await page.getByRole('button',{name:'Créer les 2 bovins',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Stockage plein simulé'}).waitFor();
 assert.equal(await page.locator('.batch-row').count(),2);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),initial);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet});
 await page.getByRole('button',{name:'Créer les 2 bovins',exact:true}).click();
 await page.getByRole('status').filter({hasText:'2 bovins créés'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),initial+2);
 await page.reload();
 await page.getByRole('button',{name:/FR 1234567890/}).first().click();
 await page.getByRole('img',{name:'Comparaison du poids réel et du poids prévisionnel'}).waitFor();
 await page.locator('.recharts-line-curve').waitFor({state:'visible'}).catch(async error=>{console.log('Profile state:',await page.locator('.content').innerText());throw error});
 assert.equal(await page.locator('.recharts-line-curve').count(),1);
 await page.getByRole('button',{name:'Enregistrer une pesée',exact:true}).click();
 await page.getByLabel('Date de pesée').fill('2026-10-21');
 await page.getByLabel('Poids (kg)',{exact:true}).fill('415');
 await page.getByRole('button',{name:'Enregistrer la pesée',exact:true}).click();
 await page.locator('.weight-deviation').filter({hasText:'-5'}).waitFor();
 await page.getByLabel('GMQ objectif (kg/j)',{exact:true}).fill('0.5');
 await page.getByRole('button',{name:'Enregistrer le GMQ objectif'}).click();
 await page.locator('.weight-deviation').filter({hasText:'+5'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).find(a=>a.number==='FR 1234567890').targetGmq),.5);
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`profile overflow ${width}`)}
 await page.setViewportSize({width:1280,height:900});
 console.log('PASS batch continuous decoding, multi-photo selection, duplicates, atomic retry, persistence, weight curves and mobile layouts.');
};
