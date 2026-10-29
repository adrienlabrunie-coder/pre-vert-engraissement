import React,{useState,useEffect,useRef} from 'react';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import config from '../app-release.json';
import {availableUpdate} from './app-update.js';
export default function AppUpdates(){
 const platform=Capacitor.getPlatform();const [current,setCurrent]=useState(null),[update,setUpdate]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false),alive=useRef(true);
 const check=async(manual=false)=>{if(lock.current||platform!=='android')return;lock.current=true;setBusy(true);if(manual)setMessage('');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);try{
  const info=await App.getInfo();if(alive.current)setCurrent(info);
  if(info.id!==config.applicationId){if(manual&&alive.current)setMessage('Version de développement : installez la version stable.');return}
  const response=await fetch(config.updatesUrl,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();const next=availableUpdate(await response.json(),info,config);
  if(alive.current){setUpdate(next);if(manual)setMessage(next?'Nouvelle version disponible.':'Votre application est à jour.')}
 }catch{if(manual&&alive.current)setMessage('Vérification impossible. Réessayez avec une connexion Internet.')}finally{clearTimeout(timeout);lock.current=false;if(alive.current)setBusy(false)}};
 useEffect(()=>{alive.current=true;if(platform==='android')check();else if(platform==='ios')App.getInfo().then(v=>{if(alive.current)setCurrent(v)}).catch(()=>{});const nativeState=platform==='android'?App.addListener('appStateChange',({isActive})=>{if(isActive&&alive.current)check()}):null;const online=()=>check(),visible=()=>{if(document.visibilityState==='visible')check()};window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);return()=>{alive.current=false;nativeState?.then(listener=>listener.remove()).catch(()=>{});window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible)}},[]);
 return <div className="app-updates"><small>{platform==='web'?'Version web':'Application'} · {current?.version||config.versionName}</small>
 {platform==='android'&&<><button type="button" disabled={busy} onClick={()=>check(true)}>{busy?'Vérification…':'Vérifier les mises à jour'}</button>{message&&<small role="status">{message}</small>}{update&&<div className="update-available"><b>Version {update.versionName} disponible</b><a href={update.downloadUrl} target="_blank" rel="noreferrer">Télécharger la mise à jour</a><small>Ouvrez le fichier téléchargé et validez la mise à jour Android. Vos données sont conservées.</small></div>}</>}
 {platform==='web'&&<details><summary>Installer sur téléphone</summary><a href="https://adrienlabrunie-coder.github.io/pre-vert-engraissement/android/pre-vert-engraissement-1.0.5.apk" target="_blank" rel="noreferrer">Télécharger Android 1.0.5</a><small>iPhone : dans Safari, Partager → Sur l’écran d’accueil.</small></details>}
 </div>;
}
