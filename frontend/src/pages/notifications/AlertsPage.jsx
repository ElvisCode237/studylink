import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card } from '../../components/AppShell.jsx';
export default function AlertsPage(){
  const {token}=useAuth(); const [items,setItems]=useState([]); const [filter,setFilter]=useState('Tout'); const [error,setError]=useState('');
  const load=()=>{if(!token){setError('Connectez-vous pour voir vos notifications.');return;}api.getNotifications(token).then(d=>setItems(d.notifications||[])).catch(e=>setError(e.message))};
  useEffect(load,[token]);
  const list=useMemo(()=>items.filter(i=>filter==='Tout'||(i.type||'').toLowerCase().includes(filter.toLowerCase())),[items,filter]);
  async function read(i){if(token&&!i.read_at){await api.markNotificationRead(i.id,token).catch(()=>{});load();}}
  return <AppShell><div className="page"><PageHeader title="Centre d’alertes" subtitle="Vos notifications sont propres à votre compte."/>
    <div className="chip-row">{['Tout','message','forum','bootcamp','booking'].map(x=><button key={x} onClick={()=>setFilter(x)} className={`chip ${filter===x?'active':''}`}>{x==='Tout'?'Tout':x}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}
    <h2>Notifications</h2><div className="stack">{list.length?list.map(i=><button key={i.id} onClick={()=>read(i)} className={`tutor-list-card clickable ${i.read_at?'read-notification':''}`}><div className="topic-icon">◈</div><div className="grow"><h3>{i.title}</h3><p>{i.body}</p></div><span>{new Date(i.created_at).toLocaleString('fr-FR')}{!i.read_at&&' · ●'}</span></button>):<Card><p style={{padding:18}}>Aucune notification pour le moment.</p></Card>}</div>
  </div></AppShell>}
