import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card, Avatar } from '../../components/AppShell.jsx';
const fallbackAvatar='https://i.pravatar.cc/160?img=12';
const fmt=(d,opts)=>new Intl.DateTimeFormat('fr-FR',opts).format(new Date(d));

export default function ReservePage(){
  const {id}=useParams();
  const nav=useNavigate();
  const {token}=useAuth();
  const [data,setData]=useState(null);
  const [slotId,setSlotId]=useState('');
  const [goal,setGoal]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{api.getTutor(id).then((r)=>{setData(r); const first=(r.slots||[]).find(s=>s.status==='available'); if(first) setSlotId(first.id)}).catch(e=>setError(e.message))},[id]);
  const slots=useMemo(()=>data?.slots?.filter(s=>s.status==='available')||[],[data]);
  const tutor=data?.tutor;
  async function confirm(){
    if(!token){nav('/login');return;}
    if(!slotId){setError('Choisissez un créneau disponible.');return;}
    setBusy(true); setError('');
    try{await api.createBooking({slotId, objective:goal},token); nav('/bookings');}catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <AppShell><div className="page"><PageHeader title="Réservation d’une session" back/>
    {error&&<div className="admin-error">{error}</div>}
    {!tutor?<Card><p style={{padding:18}}>Chargement du tuteur...</p></Card>:<>
      <Card className="mentor-summary"><Avatar src={tutor.avatar_url||fallbackAvatar} size="lg"/><div><h2>Réserver une session avec {tutor.full_name}</h2><p>{tutor.headline}</p><span>★ {tutor.avg_rating||0} · {Number(tutor.hourly_rate||0).toFixed(2)} €/h</span></div></Card>
      <Card><h2>Créneaux disponibles</h2>{slots.length?slots.map((s)=><button key={s.id} onClick={()=>setSlotId(s.id)} className={`slot-btn ${slotId===s.id?'active':''}`}>{fmt(s.start_time,{dateStyle:'medium'})} · {fmt(s.start_time,{hour:'2-digit',minute:'2-digit'})} – {fmt(s.end_time,{hour:'2-digit',minute:'2-digit'})}</button>):<p>Aucun créneau disponible. Le tuteur doit ajouter des disponibilités.</p>}</Card>
      <Card><h3>Objectif de la session</h3><textarea value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Ex. : Je souhaite comprendre ce chapitre ou préparer un exercice."/></Card>
      <div className="info-banner">🛡 Le créneau sera verrouillé dans la base au moment de la confirmation.</div>
      <button className="primary-btn full" onClick={confirm} disabled={busy||!slotId}>{busy?'Réservation...':'Confirmer la réservation'}</button>
    </>}
  </div></AppShell>
}
