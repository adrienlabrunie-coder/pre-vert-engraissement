import React,{useId,useRef,useState} from 'react';
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export default function FeedPicker({feeds,onChoose}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const id=useId(),trigger=useRef(null);
 const close=()=>{setOpen(false);setQuery('');trigger.current?.focus()};
 const results=feeds.filter(f=>normalize(f.nom).includes(normalize(query.trim())));
 return <div className="feed-picker"><button ref={trigger} type="button" className="outline" aria-expanded={open} aria-controls={id} onClick={()=>open?close():setOpen(true)}>Ajouter un aliment</button>{open&&<section id={id} aria-label="Catalogue des aliments" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}}}><label>Rechercher un aliment<input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Foin, orge, ensilage…"/></label><p role="status">{results.length} aliment(s) disponible(s)</p><div className="feed-results">{results.map(f=><button type="button" key={f.id} data-feed-id={f.id} onClick={()=>{onChoose(f.id);close()}}><strong>{f.nom}</strong><span>MS {f.ms} % · {f.ufv} UFV/kg MS</span></button>)}</div>{!results.length&&<p>Aucun aliment correspondant. Les aliments déjà ajoutés sont masqués.</p>}<button type="button" className="link" onClick={close}>Fermer le catalogue</button></section>}</div>
}
