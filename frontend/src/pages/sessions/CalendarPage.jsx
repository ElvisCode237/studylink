import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, PageHeader, Card } from '../../components/AppShell.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';

export default function CalendarPage(){
  const slots=['09:00 – 10:00','10:30 – 11:30','13:00 – 14:00','15:00 – 16:00','17:00 – 18:00'];
  const {state,setSelectedSlot}=useAppData(); const nav=useNavigate(); const [date,setDate]=useState(14);
  const choose=(slot)=>{setSelectedSlot(slot); nav('/reserve/1',{state:{slot,date}})};
  return <AppShell><div className="page"><PageHeader title="Calendrier & Disponibilités" back/><Card className="calendar"><h2>Mai 2025</h2><div className="week-head">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><span key={d}>{d}</span>)}</div><div className="date-grid">{Array.from({length:35},(_,i)=>{const d=i<3?[28,29,30][i]:i-2;return <button key={i} onClick={()=>d>0&&d<=31&&setDate(d)} className={date===d?'selected-date':''}>{d}</button>})}</div></Card><h2>Disponibilités du {date} mai</h2><div className="stack">{slots.map(s=><button key={s} onClick={()=>choose(s)} className={`slot-btn ${state.selectedSlot===s?'active':''}`}>{s}</button>)}</div><div className="info-banner">ⓘ Sélectionnez un créneau pour passer directement à la réservation.</div></div></AppShell>
}
