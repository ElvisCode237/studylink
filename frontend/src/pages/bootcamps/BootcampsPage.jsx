import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { AppShell, PageHeader, Card, Chip, Progress } from '../../components/AppShell.jsx';
import { demoBootcamps } from '../../data/demoContent.js';

const statusLabel={project:'En projet',upcoming:'À venir',ongoing:'En cours',completed:'Terminé',cancelled:'Annulé'};
export default function BootcampsPage(){
  const {token}=useAuth();const {notify}=useAppData();const [items,setItems]=useState([]);const [q,setQ]=useState('');const [tab,setTab]=useState('Tous');const [msg,setMsg]=useState('');const [error,setError]=useState('');
  const load=()=>api.getBootcamps({q}).then(d=>setItems(d.bootcamps||[])).catch(e=>setError(e.message));
  useEffect(()=>{const t=setTimeout(load,250);return()=>clearTimeout(t)},[q]);
  const allItems=useMemo(()=>[...items,...demoBootcamps.filter(d=>!items.some(b=>String(b.id)===String(d.id)))],[items]);
  const visible=useMemo(()=>allItems.filter(b=>tab==='Tous'||statusLabel[b.status]===tab),[allItems,tab]);
  async function join(id){if(String(id).startsWith('demo-')){notify('Inscription de découverte enregistrée');return;}if(!token){setError('Connectez-vous pour vous inscrire.');return;}try{await api.registerBootcamp(id,token);setMsg('Inscription confirmée.');load();}catch(e){setError(e.message)}}
  return <AppShell><div className="page"><PageHeader title="Bootcamps & formations" subtitle="Formations gratuites, ateliers et événements communautaires"/>
    <div className="search-box">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un bootcamp, une compétence..."/></div>
    <div className="chip-row">{['Tous','En projet','À venir','En cours','Terminé'].map(x=><button key={x} onClick={()=>setTab(x)} className={`chip ${tab===x?'active':''}`}>{x}</button>)}</div>
    {msg&&<div className="info-banner">{msg}</div>}{error&&<div className="info-banner">Mode découverte actif : {error}</div>}
    <div className="stack">{visible.map(b=><Card className="bootcamp-card" key={b.id}><div className="boot-icon">🚀</div><div className="grow"><div className="between"><Chip tone={b.status==='ongoing'?'green':'blue'}>{statusLabel[b.status]||b.status}</Chip><Chip tone="green">Gratuit</Chip></div><h2>{b.title}</h2><p>{b.description}</p><p>{b.start_at?new Date(b.start_at).toLocaleDateString('fr-FR'):'Prochaine période'} · {b.registered_count||0}{b.max_participants||b.seats?` / ${b.max_participants||b.seats}`:''} inscrits</p><Progress value={b.status==='completed'?100:b.status==='ongoing'?60:20}/></div><button className="primary-btn" onClick={()=>join(b.id)} disabled={b.status==='completed'||b.status==='project'}>{b.status==='project'?'Bientôt':b.status==='completed'?'Terminé':'S’inscrire'}</button></Card>)}</div>
  </div></AppShell>;
}
