const {chromium}=require('playwright');const {spawn}=require('node:child_process');const {readFileSync}=require('node:fs');const assert=require('node:assert/strict');

function itfSvg(raw) {
 const digits = ['nnwwn','wnnnw','nwnnw','wwnnn','nnwnw','wnwnn','nwwnn','nnnww','wnnwn','nwnwn'];
 let pattern = 'nnnn';
 for (let i = 0; i < raw.length; i += 2) {
  const bars = digits[Number(raw[i])];
  const spaces = digits[Number(raw[i + 1])];
  for (let j = 0; j < 5; j++) pattern += bars[j] + spaces[j];
 }
 pattern += 'wnn';
 let x = 38;
 const bars = [];
 for (const [i, unit] of Array.from(pattern).entries()) {
  const width = unit === 'w' ? 9 : 3;
  if (i % 2 === 0) bars.push(`<rect x="${x}" y="60" width="${width}" height="150"/>`);
  x += width;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 38}" height="270"><rect width="100%" height="100%" fill="white"/>${bars.join('')}</svg>`;
}

async function verifyContinuousScan(page) {
 await page.setViewportSize({width: 1024, height: 900});
 await page.getByRole('button', {name: 'Fermer', exact: true}).click();
 await page.getByRole('button', {name: 'Bovins', exact: true}).click();
 await page.getByRole('button', {name: 'Scanner plusieurs passeports', exact: true}).click();

 await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 930;
  canvas.height = 480;
  navigator.mediaDevices.getUserMedia = async () => {
   window.testCameraStream = canvas.captureStream(0);
   return window.testCameraStream;
  };
  window.presentDocument = async svg => {
   const image = new Image();
   image.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
   await image.decode();
   window.testCameraStream.getVideoTracks()[0].requestFrame();
   const context = canvas.getContext('2d');
   context.fillStyle = 'white';
   context.fillRect(0, 0, canvas.width, canvas.height);
   context.drawImage(image, (canvas.width - image.width) / 2, (canvas.height - image.height) / 2);
  };
 });

 await page.getByRole('button', {name: 'Activer la caméra'}).click();
 await page.waitForFunction(() => window.testCameraStream?.getTracks().length === 1);
 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789023438791205255'));
 await page.getByLabel('Numéro du bovin 1').waitFor();
 assert.equal(await page.getByLabel('Numéro du bovin 1').inputValue(), 'FR 1234567890');
 assert.equal(await page.getByLabel('Race du bovin 1').inputValue(), 'LIMOUSINE');

 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789112138791205255'));
 await page.getByLabel('Numéro du bovin 2').waitFor();
 assert.equal(await page.getByLabel('Numéro du bovin 2').inputValue(), 'FR 1234567891');
 assert.equal(await page.getByLabel('Sexe du bovin 2').inputValue(), 'M');

 // Représenter la première carte après la deuxième pour vérifier la déduplication.
 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789023438791205255'));
 await page.waitForTimeout(500);
 await page.getByRole('button', {name: 'Arrêter la caméra'}).click();
 assert.equal(await page.evaluate(() => window.testCameraStream.getTracks()[0].readyState), 'ended');
 assert.equal(await page.getByRole('heading', {name: '2 bovins à créer'}).count(), 1);
 assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pv_animals')).length), 2);
 console.log('PASS lecture ITF en continu, préremplissage, déduplication et arrêt de la caméra.');
}

(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5180','--strictPort'],{stdio:'ignore'});let browser;try{for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5180')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}browser=await chromium.launch();const page=await browser.newPage();await page.setContent(readFileSync('tests/fixtures/passport-code128.svg','utf8'));const img=await page.locator('svg').screenshot();await page.goto('http://127.0.0.1:5180');await page.getByRole('button',{name:'Nouveau bovin',exact:true}).click();await page.getByRole('button',{name:'Lire un passeport',exact:true}).click();await page.getByLabel('Photo du code-barres').setInputFiles({name:'barcode.png',mimeType:'image/png',buffer:img});await page.waitForFunction(()=>document.querySelector('input[placeholder="FR 1234567890"]').value==='FR 1234567890');await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.match(await page.getByRole('alert').innerText(),/Confirmez/);for(const width of [1280,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}await page.getByLabel('J’ai vérifié que ce numéro').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.equal(await page.getByLabel('Numéro d’identification *').inputValue(),'FR 1234567890');assert.equal(await page.getByLabel('Naissance',{exact:true}).inputValue(),'');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),2);await page.getByRole('button',{name:'Lire un passeport',exact:true}).click();const asda='FR1234567890  '+'1'+'34'+'3879'+'12052025'+'2'+'0'+'1'+'12345678'+'87654321'+'123456789012';await page.getByLabel('Code lu / lecteur USB').fill(asda);await page.getByLabel('J’ai vérifié que ce numéro').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.match(await page.getByRole('alert').innerText(),/informations décodées/);await page.getByLabel('J’ai vérifié la naissance').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.equal(await page.getByLabel('Naissance',{exact:true}).inputValue(),'2025-05-12');assert.equal(await page.getByLabel('Race sujet',{exact:true}).inputValue(),'LIMOUSINE');assert.equal(await page.getByLabel('Race père',{exact:true}).inputValue(),'CHAROLAISE');assert.equal(await page.getByLabel(/^Sexe/).inputValue(),'F');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),2);console.log('PASS décodage réel Code 128, confirmation, préremplissage identifiant simple et ASDA 2007 avec confirmation, aucune création automatique, quatre largeurs.');await verifyContinuousScan(page)}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
