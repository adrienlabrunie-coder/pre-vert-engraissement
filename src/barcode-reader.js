import {BrowserMultiFormatReader} from '@zxing/browser';
import {BarcodeFormat,DecodeHintType,NotFoundException} from '@zxing/library';
import zbarWasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url';
import {decodePassport,parseBarcode} from './passport.js';

let zbarPromise;

async function readWithZbar(canvas) {
 try {
  zbarPromise ??= import('@undecaf/zbar-wasm').then(async zbar => {
   zbar.setModuleArgs({locateFile: () => zbarWasmUrl});
   const scanner = await zbar.getDefaultScanner();
   const {ZBAR_NONE, ZBAR_I25, ZBAR_CODE128} = zbar.ZBarSymbolType;
   const {ZBAR_CFG_ENABLE} = zbar.ZBarConfigType;
   scanner.setConfig(ZBAR_NONE, ZBAR_CFG_ENABLE, 0);
   scanner.setConfig(ZBAR_I25, ZBAR_CFG_ENABLE, 1);
   scanner.setConfig(ZBAR_CODE128, ZBAR_CFG_ENABLE, 1);
   return {scanner, scanImageData: zbar.scanImageData};
  });
  const {scanner, scanImageData} = await zbarPromise;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  const symbols = await scanImageData(context.getImageData(0, 0, canvas.width, canvas.height), scanner);
  const barcodes = symbols.map(symbol => ({
   code: symbol.decode(), orientation: symbol.orientation, points: symbol.points,
  }));
  return barcodes.find(({code}) => decodePassport(code)) || barcodes.find(({code}) => parseBarcode(code));
 } catch {
  // La lecture ZXing reste disponible si le navigateur bloque WebAssembly.
  return undefined;
 }
}

async function captureBarcode(barcode, image) {
 const {code} = barcode;
 const decoded = decodePassport(code);
 if (decoded?.format !== 'ASDA courte' || decoded.codes.race || !barcode.points?.length) return {code};
 try {
  const {readAsdaRace} = await import('./asda-race-reader.js');
  return {code, raceCode:await readAsdaRace(image,barcode)};
 } catch {
  return {code};
 }
}

class PassportBarcodeReader extends BrowserMultiFormatReader {
 constructor({centerFirst=false}={}){
  super(new Map([[DecodeHintType.TRY_HARDER,true]]));
  this.centerFirst=centerFirst;
  this.code128Reader=new BrowserMultiFormatReader(new Map([
   [DecodeHintType.TRY_HARDER,true],
   [DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.CODE_128]],
  ]));
 }

 // A successful read of another barcode must not stop the passport search.
 passportResult(result){
  const text=result.getText();
  if(!parseBarcode(text)&&!decodePassport(text))throw new NotFoundException();
  return result;
 }

 decodeFromCanvas(canvas){
  if(this.centerFirst&&canvas.height>=4){
   const band=this.centerCanvas??=document.createElement('canvas');
   const height=Math.floor(canvas.height/4);
   if(band.height!==height)band.height=height;
   const top=Math.floor((canvas.height-height)/2);
   for(const left of [0,Math.floor(canvas.width/8)]){
    const length=canvas.width-2*left;
    if(band.width!==length)band.width=length;
    band.getContext('2d').drawImage(canvas,left,top,length,height,0,0,length,height);
    try{return this.passportResult(this.code128Reader.decodeFromCanvas(band))}catch{}
   }
   const width=Math.floor(canvas.width/4);
   if(width){
    const column=this.columnCanvas??=document.createElement('canvas');
    const left=Math.floor((canvas.width-width)/2);
    // Try the full center column, then exclude the print nearest the frame edges.
    for(const top of [0,Math.floor(canvas.height/8)]){
     const length=canvas.height-2*top;
     if(column.width!==length)column.width=length;
     if(column.height!==width)column.height=width;
     const context=column.getContext('2d');
     context.setTransform(0,-1,1,0,0,width);
     context.drawImage(canvas,left,top,width,length,0,0,width,length);
     try{return this.passportResult(this.code128Reader.decodeFromCanvas(column))}catch{}
    }
   }
  }
  try{return this.passportResult(super.decodeFromCanvas(canvas))}catch(originalError){
   // Retry with an explicitly rotated canvas for one-dimensional codes.
   const rotated=this.rotatedCanvas??=document.createElement('canvas');
   if(rotated.width!==canvas.height)rotated.width=canvas.height;
   if(rotated.height!==canvas.width)rotated.height=canvas.width;
   const context=rotated.getContext('2d');
   context.setTransform(0,-1,1,0,0,rotated.height);
   context.drawImage(canvas,0,0);
   try{return this.passportResult(this.code128Reader.decodeFromCanvas(rotated))}catch{throw originalError}
  }
 }
}

export async function scanPassportVideo(video, onCode, signal) {
 const reader = new PassportBarcodeReader({centerFirst: true});
 const canvas = document.createElement('canvas');
 const context = canvas.getContext('2d', {willReadFrequently: true});
 let previous = '';

 while (!signal.aborted) {
  if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
   const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
   const width = Math.round(video.videoWidth * scale);
   const height = Math.round(video.videoHeight * scale);
   if (canvas.width !== width) canvas.width = width;
   if (canvas.height !== height) canvas.height = height;
   context.drawImage(video, 0, 0, width, height);

   let barcode = await readWithZbar(canvas);
   if (signal.aborted) return;
   if (!barcode) {
    try { barcode = {code:reader.decodeFromCanvas(canvas).getText()}; } catch { /* Aucun code dans cette image. */ }
   }
   if (barcode && barcode.code !== previous) {
    previous = barcode.code;
    const captured = await captureBarcode(barcode,canvas);
    if (!signal.aborted) onCode(captured);
   }
  }
  if (!signal.aborted) await new Promise(resolve => setTimeout(resolve, 120));
 }
}

// Search overlapping regions so the code is not lost among the surrounding text.
export async function decodeBarcodePhoto(file,isCancelled=()=>false){
 const bitmap=await createImageBitmap(file);
 try{
  const reader=new PassportBarcodeReader({centerFirst:true});const canvas=document.createElement('canvas');const context=canvas.getContext('2d',{willReadFrequently:true});
  const regions=[[0,0,1,1]];
  // Keep the full length of the barcode and its quiet zones in either orientation.
  for(const offset of [.4,.3,.5,.2,.6,.1,.7,0,.8]){
   regions.push([0,offset,1,.2],[offset,0,.2,1]);
  }
  for(const y of [.375,.25,.5,.125,.625,0,.75]){
   for(const x of [.125,.25,0,.375,.45])regions.push([x,y,.55,.25],[y,x,.25,.55]);
  }
  for(const [x,y,w,h] of regions){
   if(isCancelled())throw new Error('cancelled');
   const sw=bitmap.width*w,sh=bitmap.height*h;
   // Preserve narrow bars before using the smaller, enlarged search regions.
   const scale=Math.min(w===1||h===1?1:2,2400/Math.max(sw,sh));
   canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);context.drawImage(bitmap,bitmap.width*x,bitmap.height*y,sw,sh,0,0,canvas.width,canvas.height);
   if (w===1 || h===1) {
    const barcode = await readWithZbar(canvas);
    if (isCancelled()) throw new Error('cancelled');
    if (barcode) {
     const points = barcode.points.map(point => ({
      x:bitmap.width*x + point.x*sw/canvas.width,
      y:bitmap.height*y + point.y*sh/canvas.height,
     }));
     return await captureBarcode({...barcode,points},bitmap);
    }
   }
   try{return {code:reader.decodeFromCanvas(canvas).getText()}}catch{}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('No barcode found');
 }finally{bitmap.close()}
}
