import {BrowserMultiFormatReader} from '@zxing/browser';
import {BarcodeFormat,DecodeHintType} from '@zxing/library';

class PassportBarcodeReader extends BrowserMultiFormatReader {
 constructor({centerFirst=false}={}){
  super(new Map([[DecodeHintType.TRY_HARDER,true]]));
  this.centerFirst=centerFirst;
  this.code128Reader=new BrowserMultiFormatReader(new Map([
   [DecodeHintType.TRY_HARDER,true],
   [DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.CODE_128]],
  ]));
 }

 decodeFromCanvas(canvas){
  if(this.centerFirst&&canvas.height>=4){
   const band=this.centerCanvas??=document.createElement('canvas');
   const height=Math.floor(canvas.height/4);
   if(band.width!==canvas.width)band.width=canvas.width;
   if(band.height!==height)band.height=height;
   const top=Math.floor((canvas.height-height)/2);
   band.getContext('2d').drawImage(canvas,0,top,band.width,height,0,0,band.width,height);
   try{return this.code128Reader.decodeFromCanvas(band)}catch{}
  }
  try{return super.decodeFromCanvas(canvas)}catch(originalError){
   // ZXing's canvas reader does not rotate one-dimensional codes.
   const rotated=this.rotatedCanvas??=document.createElement('canvas');
   if(rotated.width!==canvas.height)rotated.width=canvas.height;
   if(rotated.height!==canvas.width)rotated.height=canvas.width;
   const context=rotated.getContext('2d');
   context.setTransform(0,-1,1,0,0,rotated.height);
   context.drawImage(canvas,0,0);
   try{return this.code128Reader.decodeFromCanvas(rotated)}catch{throw originalError}
  }
 }
}

export const makeBarcodeReader=options=>new PassportBarcodeReader(options);
// Search overlapping regions so the code is not lost among the surrounding text.
export async function decodeBarcodePhoto(file,isCancelled=()=>false){
 const bitmap=await createImageBitmap(file);
 try{
  const reader=makeBarcodeReader();const canvas=document.createElement('canvas');const context=canvas.getContext('2d');
  const regions=[[0,0,1,1]];
  for(const y of [0,.1,.2,.3,.4,.5,.6,.7,.8])regions.push([0,y,1,.2]);
  for(const y of [0,.15,.30,.45,.60,.75])for(const x of [0,.1,.225,.35,.45])regions.push([x,y,.55,.25]);
  for(const [x,y,w,h] of regions){
   if(isCancelled())throw new Error('cancelled');
   const sw=bitmap.width*w,sh=bitmap.height*h;
   // Keep native pixel spacing on the full image before trying enlarged crops.
   const scale=w===1&&h===1?Math.min(1,1600/Math.max(sw,sh)):Math.min(2,1600/Math.max(sw,sh));
   canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);context.drawImage(bitmap,bitmap.width*x,bitmap.height*y,sw,sh,0,0,canvas.width,canvas.height);
   try{return reader.decodeFromCanvas(canvas)}catch{}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('No barcode found');
 }finally{bitmap.close()}
}
