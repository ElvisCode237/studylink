import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { AppShell, PageHeader, Card, Chip } from '../../components/AppShell.jsx';
export default function EntrepreneurToolkitPage(){
  const [tools,setTools]=useState([]);const [q,setQ]=useState('');const [cat,setCat]=useState('Tous');const [error,setError]=useState('');
  useEffect(()=>{api.getEntrepreneurTools({q}).then(d=>setTools(d.tools||[])).catch(e=>setError(e.message))},[q]);
  const cats=['Tous',...Array.from(new Set(tools.map(t=>t.category).filter(Boolean)))];
  const list=useMemo(()=>tools.filter(x=>cat==='Tous'||x.category===cat),[tools,cat]);
  return <AppShell><div className="page"><PageHeader title="Boîte à outils entrepreneur" subtitle="Des modèles et outils publiés par l’administration." back/>
    <div className="search-box">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un modèle ou un outil..."/></div>
    <div className="chip-row">{cats.map(x=><button key={x} onClick={()=>setCat(x)} className={`chip ${cat===x?'active':''}`}>{x}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}
    <h2>Modèles et ressources publiés</h2><div className="tools-grid">{list.length?list.map((x,i)=><Card className="tool-card" key={x.id}><div className={`tool-icon t${i%6}`}>▤</div><div className="grow"><h3>{x.title}</h3><p>{x.description}</p><Chip>{x.file_type||x.category}</Chip></div>{x.file_url?<a className="outline-btn" href={x.file_url} target="_blank" rel="noreferrer">Ouvrir</a>:<span>—</span>}</Card>):<Card><p style={{padding:18}}>Aucun outil publié.</p></Card>}</div>
  </div></AppShell>}
