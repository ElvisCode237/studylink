import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card, Chip, Progress } from '../../components/AppShell.jsx';
export default function EntrepreneurProjectPage(){
  const {token}=useAuth(); const [data,setData]=useState(null); const [error,setError]=useState('');
  const load=()=>{if(!token){setError('Connectez-vous pour accéder à votre projet.');return;}api.getMyEntrepreneurProject(token).then(setData).catch(e=>setError(e.message))};
  useEffect(load,[token]);
  const done=useMemo(()=>data?.tasks?.filter(t=>t.status==='done').length||0,[data]);
  const total=data?.tasks?.length||0; const pct=total?Math.round(done/total*100):0;
  async function toggle(t){try{await api.updateEntrepreneurTask(t.id,t.status==='done'?'todo':'done',token);load();}catch(e){setError(e.message)}}
  const p=data?.project;
  return <AppShell><div className="page"><PageHeader title="Mon projet entrepreneurial" subtitle="Données personnelles liées à votre compte" back/>
    {error&&<div className="admin-error">{error}</div>}
    {!p?<Card><p style={{padding:18}}>Chargement...</p></Card>:<>
      <div className="project-hero"><div className="project-logo">SL</div><div className="grow"><h1>{p.name}</h1><Chip tone="green">● {p.status}</Chip><p>{p.idea}</p></div><div className="progress-ring big">{pct}%<small>Avancement</small></div><div className="project-metrics"><span>Étape<b>{p.stage}</b></span><span>Budget total<b>{Number(p.budget_total||0).toFixed(0)} €</b></span><span>Tâches<b>{done}/{total}</b></span></div></div>
      <div className="dashboard-grid"><Card><h2>Tâches</h2>{data.tasks.map(t=><div className="task-row" key={t.id}><button onClick={()=>toggle(t)} className={`task-check ${t.status==='done'?'done':''}`}>{t.status==='done'?'✓':''}</button><span className="grow">{t.title}</span><b>{t.status==='done'?'Terminée':'À faire'}</b></div>)}<Progress value={pct}/></Card><Card><h2>Budget</h2><p>{data.budget.length?`${data.budget.length} mouvement(s) enregistré(s)`:'Aucun budget détaillé.'}</p></Card><Card><h2>Objectifs</h2>{data.goals.length?data.goals.map(g=><p key={g.id}>◎ {g.title} · {g.progress_percent}%</p>):<p>Aucun objectif.</p>}</Card><Card><h2>Documents</h2>{data.documents.length?data.documents.map(d=><p key={d.id}>▤ <a href={d.file_url} target="_blank" rel="noreferrer">{d.title}</a></p>):<p>Aucun document.</p>}</Card></div>
    </>}
  </div></AppShell>}
