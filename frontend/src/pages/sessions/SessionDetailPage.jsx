import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card, Chip, Avatar } from '../../components/AppShell.jsx';

const fallbackAvatar='https://i.pravatar.cc/160?img=12';
const fmt=(d, opts)=>new Intl.DateTimeFormat('fr-FR',opts).format(new Date(d));
const sizeLabel=(n)=>{n=Number(n)||0;if(!n)return'';return n<1024*1024?`${Math.round(n/1024)} Ko`:`${(n/1024/1024).toFixed(1)} Mo`}

export default function SessionDetailPage(){
  const {id}=useParams();
  const {token,user}=useAuth();
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{ if(token) api.getBooking(id,token).then(setData).catch(e=>setError(e.message)); },[id,token]);
  const b=data?.booking;
  const otherUserId=user?.id===b?.student_user_id?b?.tutor_user_id:b?.student_user_id;
  const otherName=user?.id===b?.student_user_id?b?.tutor_name:b?.student_name;
  return <AppShell><div className="page"><PageHeader title="Détail d’une session" back/>
    {error&&<div className="admin-error">{error}</div>}
    {!b ? <Card><p style={{padding:18}}>Chargement...</p></Card> : <>
      <h1>{b.subject_name || b.tutor_headline || 'Session StudyLink'}</h1>
      <div className="between"><div className="row gap"><Avatar src={b.tutor_avatar_url||fallbackAvatar}/><span>Avec {b.tutor_name}</span></div><Chip tone={b.status==='confirmed'?'green':'blue'}>{b.status}</Chip></div>
      <Card>{[['Date',fmt(b.start_time,{dateStyle:'long'})],['Heure',`${fmt(b.start_time,{hour:'2-digit',minute:'2-digit'})} – ${fmt(b.end_time,{hour:'2-digit',minute:'2-digit'})}`],['Durée',`${Math.round((new Date(b.end_time)-new Date(b.start_time))/60000)} min`],['Mode','En ligne (visioconférence)'],['Tarif',`${Number(b.price||0).toFixed(2)} €`]].map(([a,v])=><div className="setting-row" key={a}><b>{a}</b><span>{v}</span></div>)}</Card>
      {b.objective&&<Card><h3>Objectif</h3><p>{b.objective}</p></Card>}
      <Card><h3>Documents de session</h3>{data.materials?.length?data.materials.map(f=><a className="file-row" href={f.file_url} target="_blank" rel="noreferrer" key={f.id}><span className="file-icon">DOC</span><div className="grow"><b>{f.file_name}</b><p>Ajouté le {fmt(f.created_at,{dateStyle:'medium'})}</p></div><span>Ouvrir</span></a>):<p>Aucun document de session pour le moment.</p>}</Card>
      <div className="dual-actions"><Link className="outline-btn" to={`/messages/${otherUserId}?name=${encodeURIComponent(otherName||'Contact')}`}>Écrire à {otherName}</Link><Link className="primary-btn" to={`/video-session?booking=${b.id}`}>▣ Rejoindre la session</Link></div>
    </>}
  </div></AppShell>}
