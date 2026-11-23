import {createWorker, PSM} from 'tesseract.js';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import corePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import modelPath from '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz?url';
import {breedLabel} from './breed-codes.js';

let workerPromise;

async function createRaceWorker() {
 const langPath = modelPath.slice(0,modelPath.lastIndexOf('/'));
 const worker = await createWorker('eng', 1, {workerPath, corePath, langPath, workerBlobURL:false, cacheMethod:'none'});
 await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
 return worker;
}

const middleX = ({x0,x1}) => (x0+x1)/2;
const middleY = ({y0,y1}) => (y0+y1)/2;

function findPrintedRace(words) {
 const wordsWithConfidence = words.filter(word => word.confidence >= 65);
 const labels = wordsWithConfidence.filter(word => /^type$/i.test(word.text));
 const racial = wordsWithConfidence.filter(word => /^racial$/i.test(word.text));
 const codes = wordsWithConfidence.filter(word => /^\d{2}$/.test(word.text) && breedLabel(word.text));
 const matchingCodes = new Set();
 for (const {bbox:type} of labels) {
  const height = type.y1-type.y0;
  for (const {bbox:race} of racial) {
   const gap = race.x0-type.x1;
   if (Math.abs(middleY(race)-middleY(type)) > height*.7 || gap < -height*.25 || gap > height*1.5) continue;
   const center = (type.x0+race.x1)/2;
   for (const {text, bbox:code} of codes) {
    const vertical = middleY(code)-middleY(race);
    if (vertical >= height*.8 && vertical <= height*3.8 && Math.abs(middleX(code)-center) <= (race.x1-type.x0)*.45) {
     matchingCodes.add(text);
    }
   }
  }
 }
 return matchingCodes.size === 1 ? matchingCodes.values().next().value : '';
}

// ZBar fournit l'orientation de lecture et les points des deux extrémités.
// La case imprimée se trouve au-dessus du code une fois l'image redressée.
function cropAboveBarcode(image, {orientation, points}) {
 if (![0,1,2,3].includes(orientation) || !points?.length) return null;
 const {width, height} = image;
 const rotatedWidth = orientation%2 ? height : width;
 const rotatedHeight = orientation%2 ? width : height;
 const transforms = [[1,0,0,1,0,0], [0,-1,1,0,0,width], [-1,0,0,-1,width,height], [0,1,-1,0,height,0]];
 const [a,b,c,d,e,f] = transforms[orientation];
 const xs = points.map(({x,y}) => a*x+c*y+e);
 const ys = points.map(({x,y}) => b*x+d*y+f);
 const length = Math.max(...xs)-Math.min(...xs);
 const left = Math.max(0, Math.floor(Math.min(...xs)-length*.08));
 const right = Math.min(rotatedWidth, Math.ceil(Math.max(...xs)+length*.08));
 const bottom = Math.min(rotatedHeight, Math.floor(Math.min(...ys)-length*.01));
 const top = Math.max(0, Math.floor(bottom-length*.34));
 if (length < 130 || bottom-top < 30) return null;

 const canvas = document.createElement('canvas');
 const scale = Math.min(1.6, 1500/(right-left));
 canvas.width = Math.round((right-left)*scale);
 canvas.height = Math.round((bottom-top)*scale);
 const context = canvas.getContext('2d');
 context.setTransform(a*scale,b*scale,c*scale,d*scale,(e-left)*scale,(f-top)*scale);
 context.filter = 'grayscale(1) contrast(2)';
 context.drawImage(image,0,0);
 return canvas;
}

export async function readAsdaRace(image, barcode) {
 const crop = cropAboveBarcode(image, barcode);
 if (!crop) return '';
 try {
  workerPromise ??= createRaceWorker().catch(error => { workerPromise = null; throw error; });
  const worker = await workerPromise;
  const {data} = await worker.recognize(crop, {}, {blocks:true});
  const words = (data.blocks ?? []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines.flatMap(line => line.words)));
  return findPrintedRace(words);
 } catch {
  return '';
 }
}
