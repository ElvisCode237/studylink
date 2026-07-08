import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Avatar, Chip, Card } from '../../components/AppShell.jsx';

const label = { confirmed:'Confirmée', cancelled:'Annulée', completed:'Terminée' };
const fallbackAvatar='https://i.pravatar.cc/160?img=12';

export default function BookingsPage(){
  const {token,user}=useAuth();
  const [bookings,setBookings]=useState([]);
  const [tab,setTab]=useState('À venir');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    if(!token){setLoading(false);return;}
    try{const data=await api.myBookings(token);setBookings(data.bookings||[]);}catch(e){setError(e.message)}finally{setLoading(false)}
  };
  useEffect(()=>{load()},[token]);

  async function cancel(id){
    if(!confirm('Annuler cette session ?')) return;
    try{await api.cancelBooking(id,token);load();}catch(e){setError(e.message)}
  }

  const filtered=useMemo(()=>bookings.filter((b)=>{
    if(tab==='Annulées') return b.status==='cancelled';
    if(tab==='Terminées') return b.status==='completed';
    if(tab==='En cours') return false;
    return b.status==='confirmed';
  }),[bookings,tab]);

  return <AppShell><div className="page"><PageHeader title="Mes sessions" subtitle="Chaque utilisateur voit uniquement ses propres réservations"/>
    <div className="chip-row">{['À venir','En cours','Terminées','Annulées'].map(x=><button key={x} onClick={()=>setTab(x)} className={`chip ${tab===x?'active':''}`}>{x}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}
    {loading ? <Card><p style={{padding:18}}>Chargement...</p></Card> : filtered.length ? <div className="stack">{filtered.map((b)=><div className="session-row" key={b.id}>
      <Avatar src={b.tutor_avatar_url||b.student_avatar_url||fallbackAvatar} size="lg"/>
      <div className="grow"><h3>{b.subject_name || 'Session StudyLink'}</h3><p>Avec {user?.role==='tutor' ? (b.student_name||'Apprenant') : (b.tutor_name||'Tuteur')}</p><span>{new Date(b.start_time).toLocaleDateString('fr-FR')} · {new Date(b.start_time).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div className="stack"><span className="status-pill">{label[b.status]||b.status}</span><Link to={`/session/${b.id}`}>Ouvrir</Link>{b.status==='confirmed'&&user?.role!=='tutor'&&<button className="outline-btn" onClick={()=>cancel(b.id)}>Annuler</button>}</div>
    </div>)}</div> : <Card><p style={{padding:18}}>Aucune session dans cet onglet.</p></Card>}
  </div></AppShell>}
