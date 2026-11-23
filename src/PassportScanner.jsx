import {Capacitor} from '@capacitor/core';
import {cameraErrorMessage} from './camera-error.js';
import React,{useState,useRef,useEffect} from 'react';
import {decodeBarcodePhoto,scanPassportVideo} from './barcode-reader.js';
import {decodePassport,parseBarcode} from './passport.js';

const formatLabel = format => format === 'ASDA-2007' ? 'ASDA 2007' : format;

export default function PassportScanner({animals,onApply,onCapture,disabled=false}){
 const [raw,setRaw]=useState(''),[number,setNumber]=useState(''),[verified,setVerified]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [decoded,setDecoded]=useState(null),[detailsVerified,setDetailsVerified]=useState(false);
 const [cameraPreview,setCameraPreview]=useState(false);
 const video = useRef(null);
 const operation = useRef(null);
 const stream = useRef(null);

 function releaseCamera() {
  operation.current?.abort();
  operation.current = null;
  stream.current?.getTracks().forEach(track => track.stop());
  stream.current = null;
  if (video.current) video.current.srcObject = null;
 }

 function stop() {
  releaseCamera();
  setBusy(false);
  setCameraPreview(false);
 }

 useEffect(() => releaseCamera, []);
 useEffect(() => { if (disabled) stop(); }, [disabled]);

 function accept(value) {
  if (onCapture) return onCapture(value);
  const data = decodePassport(value);
  const identity = data?.fields.number || parseBarcode(value);
  setRaw(value);
  setDecoded(data);
  setDetailsVerified(false);
  setNumber(identity);
  setVerified(false);
  setError(identity ? '' : 'Code lu, mais format non reconnu ou données invalides. Recopiez les informations du sujet.');
  return Boolean(identity);
 }

 const acceptRef = useRef(accept);
 useEffect(() => { acceptRef.current = accept; });

 async function camera() {
  releaseCamera();
  const controller = new AbortController();
  operation.current = controller;
  const {signal} = controller;
  const preview = video.current;
  setBusy(true);
  setCameraPreview(true);
  setError('');

  try {
   const media = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, height: {ideal: 1080}},
   });
   if (signal.aborted) {
    media.getTracks().forEach(track => track.stop());
    return;
   }
   stream.current = media;
   preview.srcObject = media;
   await preview.play();
   if (signal.aborted) return;
   await scanPassportVideo(preview, code => {
    const accepted = acceptRef.current(code);
    if (accepted) {
     navigator.vibrate?.(80);
     if (!onCapture) stop();
    }
   }, signal);
  } catch (error) {
   if (!signal.aborted) {
    stop();
    setError(cameraErrorMessage(error, Capacitor.getPlatform()));
   }
  }
 }

 async function photo(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;
  stop();
  const controller = new AbortController();
  operation.current = controller;
  const {signal} = controller;
  setBusy(true);
  setError('');
  const failures = [];

  for (const file of files) {
   if (signal.aborted) return;
   if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) {
    failures.push(`${file.name} : choisissez une image de moins de 20 Mo.`);
    continue;
   }
   try {
    const code = await decodeBarcodePhoto(file, () => signal.aborted);
    if (!signal.aborted) acceptRef.current(code);
   } catch {
    failures.push(`${file.name} : aucun code-barres lisible. Cadrez un seul code, net et bien éclairé.`);
   }
  }
  if (!signal.aborted) {
   setBusy(false);
   setError(failures.join(' '));
  }
 }
 const apply=e=>{e.preventDefault();const normalized=number.replace(/\s/g,'').toUpperCase();if(!/^FR\d{10}$/.test(normalized)){setError('Vérifiez le numéro : FR suivi de dix chiffres. Pour un autre pays, utilisez la fiche manuelle.');return}if(animals.some(a=>String(a.number).replace(/\s/g,'').toUpperCase()===normalized)){setError('Ce bovin existe déjà dans le cheptel.');return}if(!verified){setError('Confirmez le numéro du sujet et le pays sur le passeport.');return}if(decoded&&!detailsVerified){setError('Vérifiez les informations décodées sur le document.');return}stop();onApply({...decoded?.fields,number:'FR '+normalized.slice(2)})};
 const preview=<>
  <div className="barcode-preview">
   <video ref={video} muted playsInline className="barcode-video" aria-label="Caméra des passeports"/>
   {cameraPreview&&<span className="barcode-aim" aria-hidden="true"/>}
  </div>
  {cameraPreview&&<p className="hint">Place le code-barres entier sur le trait rouge, avec un peu d’espace blanc aux deux extrémités.</p>}
 </>;
 if(onCapture)return <form className="form passport-form" onSubmit={e=>{e.preventDefault();if(raw.trim()){accept(raw);setRaw('')}}}>
 {preview}
 <div className="source-links"><button type="button" className="primary" disabled={busy||disabled} onClick={camera}>Activer la caméra</button><button type="button" className="outline" onClick={stop}>Arrêter la caméra</button></div>
 {busy&&<p role="status">Lecture en cours… Présentez le passeport suivant.</p>}
 <label>Photos des passeports<input type="file" accept="image/*" multiple disabled={busy||disabled} onChange={photo}/></label>
 <label>Code lu / lecteur USB<input value={raw} disabled={disabled} onChange={e=>setRaw(e.target.value)} placeholder="Code-barres ou FR 1234567890"/></label><button type="submit" className="outline" disabled={disabled||!raw.trim()}>Ajouter ce code à la liste</button>
 {error&&<p role="alert" className="warning">{error}</p>}
 </form>;
 return <form className="form passport-form" onSubmit={apply}><p>Flashez le code-barres du sujet avec la caméra. Le décodage se fait sur cet appareil : aucune IA, aucune lecture automatique du texte, aucun envoi d’image.</p><p className="hint">Scannez le code-barres du passeport rose ou de l’ASDA verte. Les informations disponibles sur le code seront préremplies pour vérification.</p>{preview}<div className="source-links"><button type="button" className="primary" disabled={busy} onClick={camera}>Activer la caméra</button><button type="button" className="outline" onClick={stop}>Arrêter la caméra</button></div>{busy&&<p role="status">Lecture du code-barres en cours…</p>}<label>Photo du code-barres<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={photo}/></label><label>Code lu / lecteur USB<input value={raw} onChange={e=>accept(e.target.value)} placeholder="Résultat brut du code-barres"/></label><label>Identification du sujet<input value={number} onChange={e=>{setNumber(e.target.value);setVerified(false);setDecoded(null);setDetailsVerified(false)}} placeholder="FR 1234567890"/></label><label className="check-row"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>J’ai vérifié que ce numéro est celui du sujet et que le pays est FR.</label>{decoded&&<section className="asda-preview"><h3>{formatLabel(decoded.format)} · informations à vérifier</h3><p>Naissance : {decoded.fields.birth} · Sexe : {decoded.fields.sex==='M'?'Mâle':'Femelle'}</p>{[['race','Sujet'],['father','Père'],['mother','Mère']].filter(([key])=>key in decoded.codes).map(([key,label])=><p key={key}>{label} : {decoded.fields[key]||'À renseigner'} · code {decoded.codes[key]}</p>)}{decoded.warnings.map(w=><p key={w} className="warning">{w}</p>)}{decoded.format==='ASDA-2007'&&<p className="hint">Un jour ou mois inconnu peut être codé 01.</p>}{decoded.format==='ASDA courte'&&<p className="hint">Vérifiez la race du sujet et le cheptel de provenance sur la fiche du bovin.</p>}<label className="check-row"><input type="checkbox" checked={detailsVerified} onChange={e=>setDetailsVerified(e.target.checked)}/>J’ai vérifié la naissance, le sexe et les races sur le document.</label></section>}{error&&<p role="alert" className="warning">{error}</p>}<button className="primary" type="submit" disabled={busy}>Continuer vers la fiche du bovin</button><p className="hint">Aucun bovin n’est créé avant l’enregistrement de la fiche.</p></form>;
}
