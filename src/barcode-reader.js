import {BrowserMultiFormatReader} from '@zxing/browser';
import {DecodeHintType} from '@zxing/library';
export const makeBarcodeReader=()=>new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER,true]]));
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
   const sw=bitmap.width*w,sh=bitmap.height*h,scale=Math.min(2,1600/sw);
   canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);context.drawImage(bitmap,bitmap.width*x,bitmap.height*y,sw,sh,0,0,canvas.width,canvas.height);
   try{return reader.decodeFromCanvas(canvas)}catch{}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  throw new Error('No barcode found');
 }finally{bitmap.close()}
}
