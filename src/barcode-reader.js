import {BrowserMultiFormatReader} from '@zxing/browser';
import {BarcodeFormat,DecodeHintType,NotFoundException} from '@zxing/library';
import {parseAsda2007,parseBarcode} from './passport.js';

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
  if(!parseBarcode(text)&&!parseAsda2007(text))throw new NotFoundException();
  return result;
 }

 decodeFromCanvas(canvas){
  if(this.centerFirst&&canvas.height>=4){
   const band=this.centerCanvas??=document.createElement('canvas');
   const height=Math.floor(canvas.height/4);
   if(band.width!==canvas.width)band.width=canvas.width;
   if(band.height!==height)band.height=height;
   const top=Math.floor((canvas.height-height)/2);
   band.getContext('2d').drawImage(canvas,0,top,band.width,height,0,0,band.width,height);
   try{return this.passportResult(this.code128Reader.decodeFromCanvas(band))}catch{}
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

export const makeBarcodeReader=options=>new PassportBarcodeReader(options);
// Search overlapping regions so the code is not lost among the surrounding text.
export async function decodeBarcodePhoto(file,isCancelled=()=>false){
 const bitmap=await createImageBitmap(file);
 try{
  const reader=makeBarcodeReader({centerFirst:true});const canvas=document.createElement('canvas');const context=canvas.getContext('2d');
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
   try{return reader.decodeFromCanvas(canvas)}catch{}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('No barcode found');
 }finally{bitmap.close()}
}
