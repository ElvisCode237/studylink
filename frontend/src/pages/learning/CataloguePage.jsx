import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BriefcaseBusiness, Calculator, ChartNoAxesCombined, Code2, Languages, Sparkles, Atom, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api.js';
import { AppShell, PageHeader } from '../../components/AppShell.jsx';
import { demoCourses, demoTutorials } from '../../data/demoContent.js';

const categories = [
  { name:'Informatique', icon:Code2 }, { name:'Mathématiques', icon:Calculator }, { name:'Physique', icon:Atom }, { name:'Langues', icon:Languages },
  { name:'Emploi & Carrière', icon:BriefcaseBusiness }, { name:'Développement personnel', icon:Sparkles }, { name:'Data Science', icon:ChartNoAxesCombined }, { name:'Business', icon:BookOpen }
];
const levelLabels={beginner:'Débutant',intermediate:'Intermédiaire',advanced:'Avancé',all:'Tous niveaux'};
const formatDuration=(minutes)=>{const value=Number(minutes)||0;if(!value)return'Durée libre';if(value<60)return`${value} min`;const h=Math.floor(value/60),m=value%60;return m?`${h} h ${m} min`:`${h} h`};
const tutorialThumbnail=(t)=>t.cover_url||(t.youtube_video_id?`https://img.youtube.com/vi/${t.youtube_video_id}/hqdefault.jpg`:'');
const keyOf=(x)=>(x.slug||x.title||x.id||'').toString().trim().toLowerCase();

export default function CataloguePage(){
 const[courses,setCourses]=useState([]),[tutorials,setTutorials]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState(''),[activeCategory,setActiveCategory]=useState('Toutes'),[activeLevel,setActiveLevel]=useState('all');
 useEffect(()=>{let alive=true;Promise.all([api.getCourses(),api.getTutorials()]).then(([a,b])=>{if(!alive)return;setCourses(a.courses||[]);setTutorials(b.tutorials||[])}).catch(e=>alive&&setError(e.message||'Impossible de charger le catalogue.')).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[]);
 const allCourses=useMemo(()=>{const seen=new Set();return[...courses,...demoCourses].filter(c=>{const k=keyOf(c);if(seen.has(k))return false;seen.add(k);return true})},[courses]);
 const allTutorials=useMemo(()=>{const seen=new Set();return[...tutorials,...demoTutorials].filter(t=>{const k=keyOf(t);if(seen.has(k))return false;seen.add(k);return true})},[tutorials]);
 const counts=useMemo(()=>Object.fromEntries(categories.map(({name})=>[name,allCourses.filter(c=>c.category_name===name).length])),[allCourses]);
 const q=search.trim().toLowerCase();
 const matches=(item)=>{const searchOk=!q||[item.title,item.short_description,item.description,item.category_name,item.level].filter(Boolean).join(' ').toLowerCase().includes(q);const catOk=activeCategory==='Toutes'||item.category_name===activeCategory;const levelOk=activeLevel==='all'||item.level===activeLevel;return searchOk&&catOk&&levelOk};
 const visibleCourses=allCourses.filter(matches);
 const visibleTutorials=allTutorials.filter(t=>(activeCategory==='Toutes'||t.category_name===activeCategory)&&(!q||[t.title,t.description,t.category_name].filter(Boolean).join(' ').toLowerCase().includes(q)));
 return <AppShell><div className="page catalogue-rich-page">
  <PageHeader title="Catalogue des cours" subtitle={`${allCourses.length} cours et ${allTutorials.length} tutoriels pour développer vos compétences`}/>
  <div className="catalogue-toolbar"><div className="search-box"><Search size={20}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un cours, une compétence, un sujet..."/></div><button className="catalogue-filter-button"><SlidersHorizontal size={19}/>Filtres</button></div>
  <div className="catalogue-levels"><button className={activeLevel==='all'?'active':''} onClick={()=>setActiveLevel('all')}>Tous niveaux</button><button className={activeLevel==='beginner'?'active':''} onClick={()=>setActiveLevel('beginner')}>Débutant</button><button className={activeLevel==='intermediate'?'active':''} onClick={()=>setActiveLevel('intermediate')}>Intermédiaire</button><button className={activeLevel==='advanced'?'active':''} onClick={()=>setActiveLevel('advanced')}>Avancé</button></div>
  <div className="section-title"><h2>Catégories principales</h2><button className="text-btn" onClick={()=>setActiveCategory('Toutes')}>Voir tout</button></div>
  <div className="category-grid rich-category-grid">{categories.map(({name,icon:Icon},index)=><button type="button" className={`category-card c${index} ${activeCategory===name?'selected':''}`} key={name} onClick={()=>setActiveCategory(activeCategory===name?'Toutes':name)}><span className="category-real-icon"><Icon size={30}/></span><b>{name}</b><small>{counts[name]||0} cours</small></button>)}</div>
  {activeCategory!=='Toutes'&&<div className="catalogue-active-filter"><span>Catégorie : <b>{activeCategory}</b></span><button onClick={()=>setActiveCategory('Toutes')}>✕ Effacer</button></div>}
  {error&&<div className="info-banner">Catalogue hors ligne enrichi : {error}</div>}
  <div className="section-title"><div><h2>{activeCategory==='Toutes'?'Cours populaires':`Cours · ${activeCategory}`}</h2><p>{visibleCourses.length} contenu(s) disponible(s)</p></div><span>{visibleCourses.length} contenus</span></div>
  <div className="course-card-grid rich-course-grid">{visibleCourses.map(course=><Link to={`/courses/${course.id}`} className="course-card rich-course-card" key={`${course.id}-${course.title}`}><div className="course-cover" style={course.cover_url?{backgroundImage:`url(${course.cover_url})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{!course.cover_url&&<BookOpen size={42}/>}<span className="course-level-badge">{levelLabels[course.level]||course.level||'Tous niveaux'}</span></div><div className="rich-course-body"><span className="course-category-text">{course.category_name||'Cours'}</span><b>{course.title}</b><p>{course.short_description||course.description||'Parcours pratique StudyLink'}</p><div className="course-author-mini"><span>{(course.author_name||'S').slice(0,1)}</span><div><strong>{course.author_name||'Équipe StudyLink'}</strong><small>{formatDuration(course.estimated_minutes)} · {course.module_count||3} modules</small></div></div></div></Link>)}</div>
  {!visibleCourses.length&&<div className="catalogue-empty"><BookOpen size={40}/><h3>Aucun cours pour ce filtre</h3><button className="primary-btn" onClick={()=>{setSearch('');setActiveCategory('Toutes');setActiveLevel('all')}}>Voir tout le catalogue</button></div>}
  <div className="section-title"><div><h2>Tutoriels rapides</h2><p>Des formats courts pour apprendre une compétence précise</p></div><span>{visibleTutorials.length} vidéos</span></div>
  <div className="public-tutorial-grid">{visibleTutorials.map(t=>{const thumbnail=tutorialThumbnail(t);return <Link to={`/tutorials/${t.id}`} className="public-tutorial-card" key={t.id}><div className="public-tutorial-thumb">{thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<div className="public-tutorial-placeholder">▶</div>}<span className="public-tutorial-play">▶</span></div><div className="public-tutorial-body"><b>{t.title}</b><span>{t.category_name||'Tutoriel StudyLink'}</span><small>{formatDuration(t.estimated_minutes)}{Number(t.step_count)?` · ${t.step_count} étapes`:''}</small></div></Link>})}</div>
  {loading&&<div className="catalogue-status-card">Synchronisation avec la base de données...</div>}
 </div></AppShell>
}
