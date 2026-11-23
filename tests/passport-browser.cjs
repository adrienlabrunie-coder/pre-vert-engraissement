const {chromium}=require('playwright');const {spawn}=require('node:child_process');const {readFileSync}=require('node:fs');const assert=require('node:assert/strict');
const {Code128Reader} = require('@zxing/library');

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

function asdaSvg(raw) {
 const prefix = Array.from(raw.slice(0,14), letter => letter.charCodeAt(0)-32);
 const pairs = raw.slice(14).match(/\d{2}/g).map(Number);
 const codes = [104, ...prefix, 99, ...pairs];
 const checksum = codes.reduce((sum, code, index) => sum + code*(index||1), 0)%103;
 codes.push(checksum,106);
 const path = [];
 let x = 80;
 for (const code of codes) {
  Code128Reader.CODE_PATTERNS[code].forEach((units,index) => {
   const width = 2*units;
   if (index%2===0) path.push(`M${x} 149v110h${width}V149z`);
   x += width;
  });
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="270">
  <rect width="100%" height="100%" fill="white"/>
  <rect width="100%" height="149" fill="#a6ddb3"/>
  <g font-family="sans-serif" text-anchor="middle">
   <text x="400" y="67" font-size="24">Type Racial</text>
   <text x="400" y="115" font-size="42" font-weight="bold">34</text>
  </g><path d="${path.join(' ')}"/>
 </svg>`;
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
 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789023879341205255'));
 await page.getByLabel('Numéro du bovin 1').waitFor();
 assert.equal(await page.getByLabel('Numéro du bovin 1').inputValue(), 'FR 1234567890');
 assert.equal(await page.getByLabel('Race du bovin 1').inputValue(), 'LIMOUSINE');

 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789113879211205255'));
 await page.getByLabel('Numéro du bovin 2').waitFor();
 assert.equal(await page.getByLabel('Numéro du bovin 2').inputValue(), 'FR 1234567891');
 assert.equal(await page.getByLabel('Sexe du bovin 2').inputValue(), 'M');

 // Représenter la première carte après la deuxième pour vérifier la déduplication.
 await page.evaluate(svg => window.presentDocument(svg), itfSvg('123456789023879341205255'));
 await page.waitForTimeout(500);

 await page.evaluate(svg => window.presentDocument(svg), asdaSvg('FR1234567892  190990311222387987654321'));
 await page.getByLabel('Numéro du bovin 3').waitFor();
 assert.equal(await page.getByLabel('Numéro du bovin 3').inputValue(), 'FR 1234567892');
 assert.equal(await page.getByLabel('Naissance du bovin 3').inputValue(), '2022-11-03');
 assert.equal(await page.getByLabel('Sexe du bovin 3').inputValue(), 'F');
 assert.equal(await page.getByLabel('Race du bovin 3').inputValue(), 'LIMOUSINE');

 await page.getByRole('button', {name: 'Arrêter la caméra'}).click();
 assert.equal(await page.evaluate(() => window.testCameraStream.getTracks()[0].readyState), 'ended');
 assert.equal(await page.getByRole('heading', {name: '3 bovins à créer'}).count(), 1);
 assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pv_animals')).length), 2);
 console.log('PASS scan en continu ITF et ASDA 38, race imprimée, déduplication et arrêt de la caméra.');
}

(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5180','--strictPort'],{stdio:'ignore'});let browser;try{for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5180')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}browser=await chromium.launch();const page=await browser.newPage();await page.setContent(readFileSync('tests/fixtures/passport-code128.svg','utf8'));const img=await page.locator('svg').screenshot();await page.goto('http://127.0.0.1:5180');await page.getByRole('button',{name:'Nouveau bovin',exact:true}).click();await page.getByRole('button',{name:'Lire un passeport',exact:true}).click();await page.getByLabel('Photo du code-barres').setInputFiles({name:'barcode.png',mimeType:'image/png',buffer:img});await page.waitForFunction(()=>document.querySelector('input[placeholder="FR 1234567890"]').value==='FR 1234567890');await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.match(await page.getByRole('alert').innerText(),/Confirmez/);for(const width of [1280,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}await page.getByLabel('J’ai vérifié que ce numéro').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.equal(await page.getByLabel('Numéro d’identification *').inputValue(),'FR 1234567890');assert.equal(await page.getByLabel('Naissance',{exact:true}).inputValue(),'');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),2);await page.getByRole('button',{name:'Lire un passeport',exact:true}).click();const asda='FR1234567890  '+'1'+'34'+'3879'+'12052025'+'2'+'0'+'1'+'12345678'+'87654321'+'123456789012';await page.getByLabel('Code lu / lecteur USB').fill(asda);await page.getByLabel('J’ai vérifié que ce numéro').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.match(await page.getByRole('alert').innerText(),/informations décodées/);await page.getByLabel('J’ai vérifié la naissance').check();await page.getByRole('button',{name:'Continuer vers la fiche du bovin'}).click();assert.equal(await page.getByLabel('Naissance',{exact:true}).inputValue(),'2025-05-12');assert.equal(await page.getByLabel('Race sujet',{exact:true}).inputValue(),'LIMOUSINE');assert.equal(await page.getByLabel('Race père',{exact:true}).inputValue(),'CHAROLAISE');assert.equal(await page.getByLabel(/^Sexe/).inputValue(),'F');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pv_animals')).length),2);console.log('PASS décodage réel Code 128, confirmation, préremplissage identifiant simple et ASDA 2007 avec confirmation, aucune création automatique, quatre largeurs.');await verifyContinuousScan(page)}finally{await browser?.close();server.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
