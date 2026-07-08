import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Flower2, Brain, ListChecks, Sparkles, RefreshCw, Leaf, Heart, Play, BookOpen, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { api } from '../../api.js';
import { AppShell, PageHeader, Progress } from '../../components/AppShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const categories = [
  ['Discipline', Target], ['Yoga', Flower2], ['Méditation', Brain], ['Productivité', ListChecks],
  ['Confiance en soi', Sparkles], ['Habitudes', RefreshCw], ['Bien-être', Leaf], ['Intelligence émotionnelle', Heart]
];

export default function PersonalDevelopmentPage(){
  const { token } = useAuth();
  const [programs,setPrograms]=useState([]); const [books,setBooks]=useState([]); const [dashboard,setDashboard]=useState(null);
  const [q,setQ]=useState(''); const [category,setCategory]=useState('Tous'); const [loading,setLoading]=useState(true);

  useEffect(()=>{ let active=true; setLoading(true);
    Promise.all([
      api.getPersonalPrograms({q: category==='Tous'?q:category}).catch(()=>({programs:[]})),
      api.getBooks({q: category==='Tous'?q:category}).catch(()=>({books:[]})),
      token ? api.getPersonalDashboard(token).catch(()=>null) : Promise.resolve(null)
    ]).then(([p,b,d])=>{if(active){setPrograms(p.programs||[]);setBooks(b.books||[]);setDashboard(d);setLoading(false)}});
    return ()=>{active=false};
  },[q,category,token]);

  const progressByProgram=useMemo(()=>Object.fromEntries((dashboard?.enrollments||[]).map(e=>[String(e.program_id),e])),[dashboard]);
  const activeProgram=dashboard?.enrollments?.find(e=>Number(e.progress_percent)<100);

  return <AppShell><div className="page personal-page"><PageHeader title="Développement personnel" subtitle="Des programmes, habitudes et lectures pour progresser au quotidien."/>
    <section className="personal-topbar">
      <div className="search-box"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher discipline, yoga, méditation..."/></div>
      <Link className="outline-btn" to="/personal-development/habits"><CheckCircle2 size={18}/> Mes habitudes</Link>
    </section>

    {token && dashboard && <section className="personal-dashboard-card">
      <div><span className="eyebrow">Mon tableau de bord</span><h2>Votre progression aujourd’hui</h2><p>Continuez vos programmes et gardez vos habitudes visibles.</p></div>
      <div className="personal-stat"><Flame/><b>{dashboard.stats?.active_days||0}</b><span>jours actifs / 30</span></div>
      <div className="personal-stat"><Play/><b>{dashboard.stats?.active_programs||0}</b><span>programmes en cours</span></div>
      <div className="personal-stat"><CheckCircle2/><b>{(dashboard.habits||[]).filter(h=>h.done_today).length}/{(dashboard.habits||[]).length}</b><span>habitudes aujourd’hui</span></div>
    </section>}

    {activeProgram && <Link to={`/personal-development/programs/${activeProgram.program_id}`} className="personal-continue-card">
      <div className="personal-continue-cover" style={{backgroundImage:`url(${activeProgram.cover_url||''})`}}/>
      <div className="grow"><span className="eyebrow">Continuer mon programme</span><h3>{activeProgram.title}</h3><Progress value={Number(activeProgram.progress_percent)||0}/><small>{Math.round(Number(activeProgram.progress_percent)||0)} % terminé · Jour {activeProgram.current_day}</small></div>
      <ArrowRight/>
    </Link>}

    <div className="section-title"><h2>Explorer par catégorie</h2><button className="text-btn" onClick={()=>setCategory('Tous')}>Tout afficher</button></div>
    <div className="personal-category-grid">{categories.map(([name,Icon],i)=><button key={name} className={`personal-category-card c${i} ${category===name?'active':''}`} onClick={()=>setCategory(category===name?'Tous':name)}><Icon/><b>{name}</b><small>{category===name?'Filtre actif':'Explorer'}</small></button>)}</div>

    <div className="section-title"><h2>Programmes guidés</h2><span>{programs.length} disponibles</span></div>
    {loading?<div className="catalogue-status-card">Chargement des programmes…</div>:programs.length?<div className="personal-program-grid">{programs.map(p=>{
      const e=progressByProgram[String(p.id)]; return <Link key={p.id} to={`/personal-development/programs/${p.id}`} className="personal-program-card">
        <div className="personal-program-cover" style={{backgroundImage:`linear-gradient(180deg,transparent,rgba(4,18,48,.72)),url(${p.cover_url||''})`}}><span>{p.category_name||'Développement personnel'}</span><strong>{p.duration_days} jours</strong></div>
        <div className="personal-program-body"><h3>{p.title}</h3><p>{p.description}</p><div className="program-meta"><span>{p.level==='beginner'?'Débutant':p.level==='intermediate'?'Intermédiaire':'Tous niveaux'}</span><span>{p.day_count||p.duration_days} journées</span></div>{e&&<><Progress value={Number(e.progress_percent)||0}/><small>{Math.round(Number(e.progress_percent)||0)} % terminé</small></>}</div>
      </Link>})}</div>:<div className="catalogue-status-card">Aucun programme publié pour ce filtre.</div>}

    <div className="section-title"><h2>Bibliothèque & guides</h2><Link to="/personal-development/books">Voir toute la bibliothèque</Link></div>
    <div className="personal-book-grid">{books.slice(0,8).map(b=><Link key={b.id} to={`/personal-development/books/${b.id}`} className="personal-book-card"><div className="personal-book-cover" style={{backgroundImage:`url(${b.cover_url||''})`}}>{!b.cover_url&&<BookOpen/>}</div><div><span>{b.category_name||'Guide'}</span><h3>{b.title}</h3><p>{b.author_name||'StudyLink Academy'}</p><small>{b.chapter_count||0} chapitres · {b.page_count||0} pages</small></div></Link>)}</div>
  </div></AppShell>;
}
