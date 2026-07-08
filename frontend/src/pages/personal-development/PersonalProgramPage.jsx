import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, LockKeyhole, Play, ChevronDown, ChevronUp, CalendarDays, Trophy, ArrowRight } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Progress } from '../../components/AppShell.jsx';

export default function PersonalProgramPage(){
  const {id}=useParams(); const {token}=useAuth();
  const [data,setData]=useState(null); const [progress,setProgress]=useState(null); const [completed,setCompleted]=useState(new Set());
  const [openDay,setOpenDay]=useState(1); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);

  async function load(){
    try{ const d=await api.getPersonalProgram(id); setData(d); if(token){const p=await api.getPersonalProgramProgress(id,token); setProgress(p.enrollment);setCompleted(new Set(p.completed_task_ids||[]));if(p.enrollment?.current_day)setOpenDay(Number(p.enrollment.current_day));} }
    catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[id,token]);

  const totalTasks=useMemo(()=>data?.days?.reduce((n,d)=>n+(d.tasks?.length||0),0)||0,[data]);
  const doneCount=completed.size; const pct=progress?.progress_percent!=null?Number(progress.progress_percent):(totalTasks?doneCount*100/totalTasks:0);

  async function start(){if(!token){setError('Connectez-vous pour commencer ce programme.');return;}setSaving(true);try{await api.startPersonalProgram(id,token);await load();}catch(e){setError(e.message)}finally{setSaving(false)}}
  async function toggle(taskId){if(!token){setError('Connectez-vous pour enregistrer votre progression.');return;}setSaving(true);try{const r=await api.togglePersonalTask(taskId,token);setCompleted(prev=>{const next=new Set(prev);r.completed?next.add(taskId):next.delete(taskId);return next});setProgress(r.enrollment);}catch(e){setError(e.message)}finally{setSaving(false)}}

  const p=data?.program;
  return <AppShell><div className="page personal-program-page"><PageHeader title="Programme guidé" back/>
    {error&&<div className="admin-error">{error}</div>}
    {!p?<div className="course-skeleton">Chargement du programme…</div>:<>
      <section className="personal-program-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(4,20,55,.92),rgba(4,20,55,.45)),url(${p.cover_url||''})`}}>
        <div><span className="eyebrow light">{p.category_name||'Développement personnel'}</span><h1>{p.title}</h1><p>{p.description}</p><div className="hero-meta"><span><CalendarDays size={18}/>{p.duration_days} jours</span><span>{p.level==='beginner'?'Débutant':p.level==='intermediate'?'Intermédiaire':'Tous niveaux'}</span></div></div>
        <div className="program-progress-orb"><strong>{Math.round(pct)}%</strong><span>progression</span></div>
      </section>

      <section className="program-progress-panel"><div className="grow"><div className="row-between"><b>{progress?'Votre progression':'Prêt à commencer ?'}</b><span>{doneCount}/{totalTasks} actions terminées</span></div><Progress value={pct}/><small>{progress?`Jour actuel : ${progress.current_day}`:'Démarrez le programme pour enregistrer votre progression.'}</small></div>{!progress&&<button className="primary-btn" onClick={start} disabled={saving}><Play size={17}/>{saving?'Démarrage…':'Commencer le programme'}</button>}</section>

      <div className="section-title"><h2>Votre parcours jour après jour</h2><span>{data.days?.length||0} jours</span></div>
      <div className="program-days-list">{data.days?.map(day=>{
        const tasks=day.tasks||[]; const allDone=tasks.length>0&&tasks.every(t=>completed.has(t.id)); const locked=progress&&day.day_number>Number(progress.current_day)+1;
        return <section key={day.id} className={`program-day-card ${allDone?'done':''} ${locked?'locked':''}`}>
          <button className="program-day-head" onClick={()=>!locked&&setOpenDay(openDay===day.day_number?0:day.day_number)}>
            <span className="day-number">{allDone?<CheckCircle2/>:locked?<LockKeyhole/>:day.day_number}</span><div className="grow"><small>Jour {day.day_number}</small><h3>{day.title}</h3></div><span>{openDay===day.day_number?<ChevronUp/>:<ChevronDown/>}</span>
          </button>
          {openDay===day.day_number&&!locked&&<div className="program-day-content"><p>{day.description}</p>{day.video_url&&<div className="youtube-embed"><iframe src={day.video_url.includes('embed')?day.video_url:day.video_url} title={day.title} allowFullScreen/></div>}<div className="program-task-list">{tasks.map(task=><button key={task.id} className={`program-task ${completed.has(task.id)?'done':''}`} onClick={()=>toggle(task.id)} disabled={saving}>{completed.has(task.id)?<CheckCircle2/>:<Circle/>}<div><b>{task.title}</b><span>{task.description}</span></div></button>)}</div></div>}
        </section>})}</div>

      {pct>=100&&<section className="program-complete-card"><Trophy/><div><h2>Programme terminé 🎉</h2><p>Vous avez complété toutes les actions du programme. Prenez un moment pour noter vos progrès et choisir la prochaine habitude à maintenir.</p></div><Link className="primary-btn" to="/personal-development/habits">Continuer avec mes habitudes <ArrowRight size={17}/></Link></section>}
    </>}
  </div></AppShell>;
}
