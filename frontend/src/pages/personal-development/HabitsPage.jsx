import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Flame } from 'lucide-react';
import { AppShell, PageHeader } from '../../components/AppShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api.js';

export default function HabitsPage(){
  const {token}=useAuth(); const [habits,setHabits]=useState([]); const [title,setTitle]=useState(''); const [error,setError]=useState('');
  async function load(){if(!token)return;try{const d=await api.getHabits(token);setHabits(d.habits||[])}catch(e){setError(e.message)}}
  useEffect(()=>{load()},[token]);
  async function add(e){e.preventDefault();if(!title.trim())return;try{await api.createHabit({title},token);setTitle('');load()}catch(e){setError(e.message)}}
  async function toggle(id){try{await api.toggleHabitToday(id,token);load()}catch(e){setError(e.message)}}
  async function remove(id){try{await api.updateHabit(id,{is_active:false},token);load()}catch(e){setError(e.message)}}
  return <AppShell><div className="page habits-page"><PageHeader title="Mes habitudes" subtitle="Un petit progrès visible chaque jour." back/>
    {!token&&<div className="admin-error">Connectez-vous pour créer et suivre vos habitudes.</div>}{error&&<div className="admin-error">{error}</div>}
    <section className="habit-create-card"><div><span className="eyebrow">Nouvelle habitude</span><h2>Que voulez-vous répéter ?</h2></div><form onSubmit={add}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Lire 20 minutes"/><button className="primary-btn"><Plus size={18}/> Ajouter</button></form></section>
    <div className="section-title"><h2>Aujourd’hui</h2><span>{habits.filter(h=>h.done_today).length}/{habits.length} terminées</span></div>
    <div className="habit-grid">{habits.map(h=><article key={h.id} className={`habit-card ${h.done_today?'done':''}`}><button className="habit-toggle" onClick={()=>toggle(h.id)}>{h.done_today?<CheckCircle2/>:<Circle/>}</button><div className="grow"><h3>{h.title}</h3><p>{h.done_today?'Fait aujourd’hui':'À faire aujourd’hui'}</p><span><Flame size={15}/>{h.completions_30d||0} réalisations sur 30 jours</span></div><button className="icon-btn" onClick={()=>remove(h.id)} title="Archiver"><Trash2 size={17}/></button></article>)}</div>
    {!habits.length&&<div className="catalogue-status-card">Ajoutez votre première habitude pour commencer le suivi quotidien.</div>}
  </div></AppShell>;
}
