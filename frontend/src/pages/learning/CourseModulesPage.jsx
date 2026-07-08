import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Progress } from '../../components/AppShell.jsx';
import { PYTHON_COURSE_SLUG, pythonCourseFallback, flattenCourseLessons } from '../../data/pythonCourseData.js';

const typeLabel = { youtube:'Vidéo YouTube', video_upload:'Vidéo', exercise:'Exercice', text:'Lecture', pdf:'PDF', audio:'Audio', quiz:'Quiz', live:'Direct' };

export default function CourseModulesPage(){
  const {id}=useParams();
  const navigate=useNavigate();
  const {token}=useAuth();
  const [data,setData]=useState(null);
  const [learning,setLearning]=useState({enrollment:null,progress:[]});
  const [error,setError]=useState('');
  const [open,setOpen]=useState([]);
  const [busy,setBusy]=useState(false);

  const fallback=id===PYTHON_COURSE_SLUG||id==='demo-python';
  useEffect(()=>{api.getCourse(id).then(r=>{setData(r);setOpen(r.modules?.map((_,i)=>i) || [])}).catch(e=>{if(fallback){setData(pythonCourseFallback);setOpen(pythonCourseFallback.modules.map((_,i)=>i))}else setError(e.message)})},[id,fallback]);
  useEffect(()=>{if(token&&data)api.getCourseLearning(id,token).then(setLearning).catch(()=>{})},[id,token,data]);

  const lessons=useMemo(()=>flattenCourseLessons(data||{modules:[]}),[data]);
  const progressMap=useMemo(()=>Object.fromEntries((learning.progress||[]).map(p=>[String(p.lesson_id),p])),[learning.progress]);
  const completed=lessons.filter(l=>progressMap[String(l.id)]?.status==='completed').length;
  const percent=learning.enrollment?.progress_percent!=null?Math.round(Number(learning.enrollment.progress_percent)):(lessons.length?Math.round(completed/lessons.length*100):0);
  const nextLesson=lessons.find(l=>progressMap[String(l.id)]?.status!=='completed')||lessons[0];

  async function enroll(){
    if(!token)return navigate('/login');
    setBusy(true);setError('');
    try{const r=await api.enrollCourse(id,token);setLearning(s=>({...s,enrollment:r.enrollment}));if(nextLesson)navigate(`/lessons/${nextLesson.id}?course=${encodeURIComponent(id)}`)}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }

  if(!data)return <AppShell><div className="page course-page"><PageHeader title="Contenu du cours" back/>{error?<div className="admin-error">{error}</div>:<div className="course-skeleton">Chargement du programme...</div>}</div></AppShell>;

  return <AppShell><div className="page course-page"><PageHeader title="Contenu du cours" back/>
    {error&&<div className="admin-error">{error}</div>}
    <section className="course-outline-header">
      <img src={data.course.cover_url} alt=""/>
      <div className="grow"><span>{data.course.category_name||'Cours'}</span><h1>{data.course.title}</h1><p>{data.course.short_description}</p><small>Avec {data.course.author_name||'Équipe StudyLink'}</small></div>
      <div className="course-outline-progress"><strong>{percent}%</strong><Progress value={percent}/><small>{completed}/{lessons.length} leçons terminées</small></div>
    </section>

    <div className="course-outline-actions">
      {learning.enrollment
        ? (percent >= 100
          ? <Link className="primary-btn success-btn" to={`/courses/${id}/certificate`}>Certificat de réussite</Link>
          : <Link className="primary-btn" to={nextLesson?`/lessons/${nextLesson.id}?course=${encodeURIComponent(id)}`:'#'}>▶ Continuer où j’en suis</Link>)
        : <button className="primary-btn" onClick={enroll} disabled={busy}>{busy?'Inscription...':'Commencer le cours'}</button>}
      <Link className="outline-btn" to={`/courses/${id}`}>Voir les détails</Link>
    </div>

    <section className="course-outline-layout">
      <main>
        <div className="between course-program-head"><div><h2>Programme complet</h2><p>{data.modules.length} modules · {lessons.length} leçons</p></div><button className="text-btn" onClick={()=>setOpen(open.length===data.modules.length?[]:data.modules.map((_,i)=>i))}>{open.length===data.modules.length?'Tout fermer':'Tout ouvrir'}</button></div>
        <div className="course-accordion">{data.modules.map((module,moduleIndex)=>{
          const isOpen=open.includes(moduleIndex);
          const done=(module.lessons||[]).filter(l=>progressMap[String(l.id)]?.status==='completed').length;
          return <article className="course-accordion-module" key={module.id}>
            <button className="course-accordion-head" onClick={()=>setOpen(s=>s.includes(moduleIndex)?s.filter(x=>x!==moduleIndex):[...s,moduleIndex])}>
              <span className="module-number">{moduleIndex+1}</span><div className="grow"><b>Module {moduleIndex+1} · {module.title}</b><small>{module.description||`${module.lessons?.length||0} leçons`}</small></div><span className="module-progress-mini">{done}/{module.lessons?.length||0}</span><strong>{isOpen?'⌃':'⌄'}</strong>
            </button>
            {isOpen&&<div className="course-lesson-list">{(module.lessons||[]).map((lesson,lessonIndex)=>{
              const p=progressMap[String(lesson.id)];
              return <Link key={lesson.id} className="course-lesson-row" to={`/lessons/${lesson.id}?course=${encodeURIComponent(id)}`}>
                <span className={`lesson-state ${p?.status==='completed'?'done':''}`}>{p?.status==='completed'?'✓':lesson.lesson_type==='youtube'?'▶':'○'}</span>
                <div className="grow"><b>{moduleIndex+1}.{lessonIndex+1} {lesson.title}</b><small>{typeLabel[lesson.lesson_type]||'Leçon'} · {Math.max(1,Math.round((Number(lesson.duration_seconds)||0)/60))} min</small></div>
                {lesson.is_preview&&<span className="preview-pill">Aperçu</span>}<span>›</span>
              </Link>
            })}</div>}
          </article>
        })}</div>
      </main>
      <aside className="course-outline-side">
        <div className="course-panel"><h3>Votre progression</h3><div className="course-progress-circle large" style={{'--progress':`${percent*3.6}deg`}}><strong>{percent}%</strong></div><p>{completed} leçon(s) terminée(s)</p><Progress value={percent}/></div>
        <div className="course-panel"><h3>Conseil StudyLink</h3><p>Avancez régulièrement. Une leçon de 15 à 25 minutes par jour suffit pour maintenir votre progression.</p></div>
      </aside>
    </section>
  </div></AppShell>
}
