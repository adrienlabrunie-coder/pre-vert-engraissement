import React, {useEffect, useRef, useState} from 'react';
import {criteria, guidance, defects, localDate, validateScore} from './scoring.js';
const displayDate = date => date ? new Date(date+'T12:00:00').toLocaleDateString('fr-FR') : 'Date non renseignée';
const names = Object.fromEntries(criteria.flatMap(g=>g.items.map(([code,name])=>[code,name])));


function ManualSheet({code,name}) {
 const page=guidance[code][0];
 const more=code==='AAV'?[47,48,49]:code==='AAR'?[51,52,53]:[];
 return <details className="manual-sheet"><summary aria-label={`Illustrations du manuel pour ${code}`}><img src={`/manual/idele-2014-p${page}.webp`} alt={`Planche du manuel : ${name}`} loading="lazy"/><span><b>Voir les illustrations du manuel</b><span>Repères anatomiques et exemples de notation</span><small>Institut de l’Élevage · 2014 · p. {page}</small></span></summary><img className="full-manual-page" src={`/manual/idele-2014-p${page}.webp`} alt={`Fiche complète ${name}, page ${page}, avec les illustrations et repères de notes du manuel`}/><p className="source-caption">Extrait du guide fourni dans le projet, rendu sans redessin des schémas. Les repères utiles sont également décrits en texte dans cette carte.</p><div className="manual-page-links"><a href={`/manual/idele-2014-p${page}.webp`} target="_blank" rel="noreferrer">Ouvrir la planche en plein écran</a>{more.map(n=><a key={n} href={`/manual/idele-2014-p${n}.webp`} target="_blank" rel="noreferrer">Défauts et notes · p. {n}</a>)}</div></details>;
}

export function ScoreHistory({scores}) {
  return <div className="score-history">{[...scores].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||'')).map((s,i)=><details key={s.id||i}>
    <summary><b>{displayDate(s.date)}</b> · {Object.keys(s.values||{}).length} postes <span>Voir le détail</span></summary>
    {s.protocol==='prevert-viande-4-v1'&&<p className="hint">Profil viande · 4 postes · musculature et état séparés</p>}{!s.schemaVersion&&<p className="hint">Pointage antérieur : notes conservées telles quelles, sans revalidation.</p>}
    <p>{s.observer&&`Pointeur : ${s.observer} · `}{s.stage&&`Stade : ${s.stage}`}</p>
    {s.context&&<p className="preserve-lines">Conditions : {s.context}</p>}
    {s.notes&&<p className="preserve-lines">Observations : {s.notes}</p>}
    <dl>{Object.entries(s.values||{}).map(([code,value])=><div key={code}><dt>{names[code]||code} <small>({code})</small></dt><dd><b>{String(value)}/10</b>{s.observations?.[code]&&<p className="preserve-lines">{s.observations[code]}</p>}{s.defects?.[code]?.length>0&&<p>Défauts : {s.defects[code].join(', ')}</p>}{s.multipleDefects?.[code]&&<p>Plusieurs défauts marquants sur un même membre.</p>}{s.movementConfirmed?.[code]&&<p>Observation à l’arrêt et en marche confirmée.</p>}</dd></div>)}</dl>
  </details>)}{!scores.length&&<p className="empty">Aucun pointage pour le moment.</p>}</div>;
}

export function ScoreWizard({animal, onSave, onDirtyChange}) {
  const [score,setScore]=useState({date:localDate(),values:{},observations:{},defects:{},multipleDefects:{},movementConfirmed:{},notes:'',observer:'',stage:'',context:''});
  const [step,setStep]=useState(0);
  const [errors,setErrors]=useState([]);

  const [saving,setSaving]=useState(false);
  const title=useRef(null);
  const dirty=useRef(false);
  const groups=[{group:'Culotte',items:[['ARC','Arrondi de culotte']]},{group:'Dos',items:[['EPD','Épaisseur du dessus']]},{group:'Épaule',items:[['DEE','Dessus d’épaule']]},{group:'Note d’état',items:[['ETA','État corporel']]}];
  const review=step===groups.length+1;
  const group=groups[step-1];
  const update=patch=>{dirty.current=true;onDirtyChange(true);setScore(s=>({...s,...patch}));setErrors([])};
  useEffect(()=>{const prevent=e=>{if(dirty.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent)},[]);
  useEffect(()=>{title.current?.focus()},[step]);
  const navigate=next=>{setErrors([]);setStep(next)};
  const field=(label,key,type='text')=><label>{label}<input type={type} value={score[key]} max={type==='date'?localDate():undefined} min={type==='date'?animal.birth:undefined} onChange={e=>update({[key]:e.target.value})}/></label>;
  const save=async()=>{const issues=validateScore(score,animal);if(issues.length){setErrors(issues);return}setSaving(true);try{await onSave({...score,id:crypto.randomUUID(),schemaVersion:3,protocol:"prevert-viande-4-v1",reference:'idele-2014',createdAt:new Date().toISOString(),animalContext:{race:animal.race||'',sex:animal.sex||'',birth:animal.birth||''}});dirty.current=false}catch(e){setErrors([e.message]);setSaving(false)}};
  const clear=code=>{const patch={};for(const key of ['values','observations','defects','multipleDefects','movementConfirmed']){patch[key]={...score[key]};delete patch[key][code]}update(patch)};
  return <div className="scoring guided">
    <p className="score-animal"><b>{animal.number}</b> · {animal.race||'Race non renseignée'} · {animal.sex==='F'?'Femelle':'Mâle'} · Naissance : {displayDate(animal.birth)}</p>
    <nav className="steps" aria-label="Étapes du pointage">{['Préparation',...groups.map(g=>g.group),'Vérification'].map((name,i)=><button key={name} aria-current={step===i?'step':undefined} className={step===i?'selected':''} onClick={()=>navigate(i)}>{name}</button>)}</nav>
    <p className="hint">Étape {step+1}/{groups.length+2} · {Object.keys(score.values).length} postes notés. Les postes non observés restent sans note.</p>
    <h3 ref={title} tabIndex={-1}>{step===0?'Préparer le pointage viande':review?'Vérifier avant d’enregistrer':group?.group}</h3>
    {step===0&&<div className="form score-preparation">
      <p>Quatre postes pour suivre la musculature et l’état corporel dans le temps. Les caractéristiques de race ne sont pas évaluées. Ce profil sur animal vivant ne se convertit pas automatiquement en classement EUROP de carcasse.</p><p>Observer sur un sol horizontal, avec les membres visibles, à l’arrêt puis en marche. Les notes décrivent les caractères : une note élevée ne signifie pas toujours « meilleur ». Aucun total de qualité n’est calculé.</p>
      <div className="form-grid">{field('Date du pointage *','date','date')}{field('Nom / code du pointeur','observer')}</div>
      <label>Stade physiologique<select value={score.stage} onChange={e=>update({stage:e.target.value})}><option value="">Non renseigné</option>{['Sevrage','Post-sevrage','Adulte'].map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Conditions et contexte<textarea placeholder="Sol, contention, gestation, vêlage, blessure…" value={score.context} onChange={e=>update({context:e.target.value})}/></label>

      <p className="hint">Guide pratique du pointage des bovins de race à viande, Institut de l’Élevage, février 2014, pages 18–19 et fiches par poste. Les repères ci-dessous sont des aides reformulées ; ils ne remplacent pas la formation du pointeur.</p>
    </div>}
    {group&&!review&&<div className="score-list">{group.items.map(([code,name])=><section className="score-item" key={code} aria-labelledby={'name-'+code}>
      <figure className="meat-figure"><div className={'meat-zone zone-'+code} role="img" aria-label={'Zone d’observation : '+name}/><figcaption>Illustration générée · localisation indicative. Les planches du manuel font référence pour noter.</figcaption></figure><h4 id={'name-'+code}>{name} <small>({code})</small></h4><p>{guidance[code][1]}</p><p className="score-reference">{guidance[code][2]}</p><ManualSheet code={code} name={name}/>
      <div className="score-options" role="group" aria-label={`Note ${name}`}>{Array.from({length:10},(_,i)=><button key={i} aria-label={`${code} : ${i+1} sur 10`} aria-pressed={score.values[code]===i+1} className={score.values[code]===i+1?'chosen':''} onClick={()=>update({values:{...score.values,[code]:i+1}})}>{i+1}</button>)}</div>
      <button className="link skip-score" onClick={()=>clear(code)}>{score.values[code]!=null?'Effacer la note et son observation':'Non observé'}</button>
      {score.values[code]!=null&&<>
        {defects[code]&&<fieldset><legend>Défauts observés — obligatoires si note inférieure à 6</legend>{defects[code].map(([key,label])=><label className="check-row" key={key}><input type="checkbox" checked={(score.defects[code]||[]).includes(key)} onChange={e=>update({defects:{...score.defects,[code]:e.target.checked?[...(score.defects[code]||[]),key]:(score.defects[code]||[]).filter(x=>x!==key)}})}/>{label} ({key})</label>)}<label className="check-row"><input type="checkbox" checked={!!score.multipleDefects[code]} onChange={e=>update({multipleDefects:{...score.multipleDefects,[code]:e.target.checked}})}/>Plusieurs défauts marquants sur un même membre (note ≤ 3)</label><label className="check-row"><input type="checkbox" checked={!!score.movementConfirmed[code]} onChange={e=>update({movementConfirmed:{...score.movementConfirmed,[code]:e.target.checked}})}/>Observation complète à l’arrêt et en marche (obligatoire pour 10)</label></fieldset>}
        <label>Observation pour {code}<textarea value={score.observations[code]||''} onChange={e=>update({observations:{...score.observations,[code]:e.target.value}})} placeholder="Précision facultative, datée avec ce pointage"/></label>
      </>}
    </section>)}</div>}
    {review&&<div className="form score-preparation"><p>Pointage du {displayDate(score.date)} · {Object.keys(score.values).length} / {groups.reduce((n,g)=>n+g.items.length,0)} postes. Un pointage partiel peut être enregistré.</p><label>Observations générales<textarea value={score.notes} onChange={e=>update({notes:e.target.value})}/></label><ScoreHistory scores={[{...score,schemaVersion:3,protocol:"prevert-viande-4-v1"}]}/><div className="meat-summary">{groups.map(g=>{const [code]=g.items[0];return <div key={code}><span>{g.group}</span><strong>{score.values[code]!=null?`${score.values[code]}/10`:"Non observé"}</strong></div>})}</div><p className="hint">Les observations prennent la date du pointage. L’historique précédent reste conservé.</p></div>}
    {!!errors.length&&<div role="alert" className="warning"><ul>{errors.map(x=><li key={x}>{x}</li>)}</ul></div>}
    <div className="score-footer"><button className="outline" disabled={step===0} onClick={()=>navigate(step-1)}>Précédent</button>{review?<button className="primary" disabled={saving} onClick={save}>Enregistrer le pointage</button>:<button className="primary" onClick={()=>navigate(step+1)}>Suivant</button>}</div>
  </div>;
}
