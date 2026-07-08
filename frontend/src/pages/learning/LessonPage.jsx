import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Progress } from '../../components/AppShell.jsx';
import { PYTHON_COURSE_SLUG, pythonCourseFallback, flattenCourseLessons } from '../../data/pythonCourseData.js';

function YouTubeEmbed({ id, title }) {
  if (!id) return null;
  return <div className="lesson-video-frame"><iframe src={`https://www.youtube.com/embed/${id}?rel=0`} title={title || 'Vidéo StudyLink'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>;
}

function renderContent(content='') {
  return content.split('\n').map((line,index)=> line.trim()?<p key={index}>{line}</p>:<br key={index}/>);
}

export default function LessonPage(){
  const {id}=useParams();
  const {search}=useLocation();
  const navigate=useNavigate();
  const courseId=new URLSearchParams(search).get('course') || PYTHON_COURSE_SLUG;
  const {token}=useAuth();
  const [data,setData]=useState(null);
  const [learning,setLearning]=useState({enrollment:null,progress:[],notes:[]});
  const [tab,setTab]=useState('Résumé');
  const [note,setNote]=useState('');
  const [savingNote,setSavingNote]=useState(false);
  const [error,setError]=useState('');
  const [exerciseChecks,setExerciseChecks]=useState([false,false,false]);
  const [quizAnswers,setQuizAnswers]=useState(['','','']);

  const fallback=courseId===PYTHON_COURSE_SLUG||courseId==='demo-python';
  useEffect(()=>{api.getCourse(courseId).then(setData).catch(e=>{if(fallback)setData(pythonCourseFallback);else setError(e.message)})},[courseId,fallback]);
  useEffect(()=>{if(token&&data)api.getCourseLearning(courseId,token).then(r=>{setLearning(r);const existing=(r.notes||[]).find(n=>String(n.lesson_id)===String(id));setNote(existing?.content||'')}).catch(()=>{})},[courseId,id,token,data]);
  useEffect(()=>{setExerciseChecks([false,false,false]);setQuizAnswers(['','','']);setTab('Résumé')},[id]);

  const flat=useMemo(()=>flattenCourseLessons(data||{modules:[]}),[data]);
  const lesson=flat.find(l=>String(l.id)===String(id));
  const index=flat.findIndex(l=>String(l.id)===String(id));
  const progress=learning.progress?.find(p=>String(p.lesson_id)===String(id));
  const done=progress?.status==='completed';
  const overall=learning.enrollment?.progress_percent?Math.round(Number(learning.enrollment.progress_percent)):Math.round((learning.progress||[]).filter(p=>p.status==='completed').length/Math.max(1,flat.length)*100);

  async function complete(){
    if(!token)return navigate('/login');
    try{const r=await api.saveLessonProgress(id,{progress_percent:100,completed:true},token);setLearning(s=>({...s,progress:[...(s.progress||[]).filter(p=>String(p.lesson_id)!==String(id)),r.progress],enrollment:{...(s.enrollment||{}),progress_percent:r.course_progress_percent}}))}
    catch(e){setError(e.message)}
  }
  async function saveNote(){
    if(!token)return navigate('/login');
    setSavingNote(true);try{const r=await api.saveLessonNote(id,note,token);setLearning(s=>({...s,notes:[...(s.notes||[]).filter(n=>String(n.lesson_id)!==String(id)),...(r.note?[r.note]:[])]}))}catch(e){setError(e.message)}finally{setSavingNote(false)}
  }

  if(!lesson)return <AppShell><div className="page course-page"><PageHeader title="Leçon StudyLink" back/>{error?<div className="admin-error">{error}</div>:<div className="course-skeleton">Chargement de la leçon...</div>}</div></AppShell>;
  const prev=flat[index-1],next=flat[index+1];

  return <AppShell><div className="page lesson-page"><PageHeader title="Leçon" back/>
    {error&&<div className="admin-error">{error}</div>}
    <div className="lesson-topbar"><div><p className="breadcrumb">Mes cours › {data.course.title} › {lesson.module.title}</p><h1>{lesson.title}</h1><p>{lesson.module.title} · {Math.max(1,Math.round((Number(lesson.duration_seconds)||0)/60))} min · {data.course.level==='beginner'?'Débutant':data.course.level}</p></div><div className="lesson-overall-progress"><span>{overall}% du cours</span><Progress value={overall}/></div></div>

    {lesson.lesson_type==='youtube'&&<YouTubeEmbed id={lesson.youtube_video_id} title={lesson.title}/>} 
    {lesson.lesson_type==='video_upload'&&lesson.media_url&&<video src={lesson.media_url} controls className="uploaded-video"/>}
    {lesson.lesson_type==='pdf'&&lesson.media_url&&<div className="lesson-file-card"><span>PDF</span><div><b>{lesson.title}</b><p>Document de la leçon</p></div><a href={lesson.media_url} target="_blank" rel="noreferrer">Ouvrir</a></div>}
    {(lesson.lesson_type==='exercise'||lesson.lesson_type==='text')&&<div className={`lesson-type-banner ${lesson.lesson_type}`}><span>{lesson.lesson_type==='exercise'?'⌘':'▤'}</span><div><b>{lesson.lesson_type==='exercise'?'Exercice pratique':'Lecture guidée'}</b><p>Suivez les consignes ci-dessous, puis marquez la leçon comme terminée.</p></div></div>}

    <nav className="lesson-tabs">{['Résumé','Notes','Ressources','Exercices'].map(t=><button key={t} onClick={()=>setTab(t)} className={tab===t?'active':''}>{t}{t==='Ressources'&&lesson.resources?.length?` (${lesson.resources.length})`:''}</button>)}</nav>

    <section className="lesson-content-grid">
      <main className="lesson-main-content">
        {tab==='Résumé'&&<div className="course-panel lesson-copy"><h2>Dans cette leçon</h2>{renderContent(lesson.content||'Le contenu complémentaire de cette leçon sera bientôt disponible.')}{done&&<div className="lesson-success">✓ Cette leçon est terminée et enregistrée dans votre progression.</div>}</div>}
        {tab==='Notes'&&<div className="course-panel"><div className="between"><div><h2>Mes notes personnelles</h2><p>Vos notes sont privées et liées à votre compte.</p></div><button className="primary-btn" onClick={saveNote} disabled={savingNote}>{savingNote?'Enregistrement...':'Enregistrer'}</button></div><textarea className="lesson-note-editor" rows="12" value={note} onChange={e=>setNote(e.target.value)} placeholder="Écrivez ici ce que vous voulez retenir, une question à poser au tuteur, un extrait de code..."/></div>}
        {tab==='Ressources'&&<div className="course-panel"><h2>Ressources de la leçon</h2>{lesson.resources?.length?<div className="course-resource-grid">{lesson.resources.map(r=><a key={r.id} className="course-resource-card" href={r.url} target="_blank" rel="noreferrer"><span>↗</span><div><b>{r.title}</b><small>{r.resource_type||'Lien'}</small></div><strong>Ouvrir</strong></a>)}</div>:<p>Aucune ressource spécifique n’a été ajoutée à cette leçon.</p>}</div>}
        {tab==='Exercices'&&<div className="course-panel lesson-exercise-panel">
          <h2>{lesson.lesson_type==='quiz'?'Quiz de validation':'Passer à la pratique'}</h2>
          {lesson.lesson_type==='quiz' ? <>
            <p>Répondez honnêtement à ces trois questions. Le but est de vérifier votre autonomie avant de continuer.</p>
            <div className="lesson-quiz-list">
              {[
                'Pouvez-vous expliquer le concept principal sans relire la leçon ?',
                'Pouvez-vous appliquer la méthode sur un exemple différent ?',
                'Savez-vous identifier et corriger une erreur fréquente ?'
              ].map((question,i)=><div className="lesson-quiz-question" key={question}><b>{i+1}. {question}</b><div><button className={quizAnswers[i]==='yes'?'active':''} onClick={()=>setQuizAnswers(a=>a.map((v,j)=>j===i?'yes':v))}>Oui</button><button className={quizAnswers[i]==='notyet'?'active':''} onClick={()=>setQuizAnswers(a=>a.map((v,j)=>j===i?'notyet':v))}>Pas encore</button></div></div>)}
            </div>
            <button className="primary-btn" disabled={quizAnswers.some(a=>!a)} onClick={complete}>{done?'Quiz validé ✓':'Valider mon auto-évaluation'}</button>
          </> : <>
            <p>{lesson.lesson_type==='exercise'?lesson.content:'Reproduisez l’exemple de la leçon sans copier, puis modifiez une valeur ou ajoutez une fonctionnalité.'}</p>
            <div className="exercise-checklist">
              {['J’ai reproduit l’exemple','J’ai testé une variante','J’ai compris les erreurs rencontrées'].map((label,i)=><label key={label}><input type="checkbox" checked={exerciseChecks[i]} onChange={e=>setExerciseChecks(a=>a.map((v,j)=>j===i?e.target.checked:v))}/> {label}</label>)}
            </div>
            <button className="primary-btn" disabled={!exerciseChecks.every(Boolean)} onClick={complete}>{done?'Activité validée ✓':'Valider l’activité'}</button>
          </>}
        </div>}
      </main>
      <aside className="lesson-side-panel">
        <div className="course-panel"><h3>Progression</h3><div className="course-progress-circle" style={{'--progress':`${(done?100:Number(progress?.progress_percent||0))*3.6}deg`}}><strong>{done?100:Math.round(Number(progress?.progress_percent||0))}%</strong></div><button className={`primary-btn full ${done?'success-btn':''}`} onClick={complete}>{done?'Terminée ✓':'Marquer comme terminée'}</button></div>
        <div className="course-panel"><h3>Dans le module</h3>{(lesson.module.lessons||[]).map((l,i)=><Link key={l.id} className={`lesson-mini-link ${String(l.id)===String(id)?'active':''}`} to={`/lessons/${l.id}?course=${encodeURIComponent(courseId)}`}><span>{i+1}</span><b>{l.title}</b></Link>)}</div>
      </aside>
    </section>

    <div className="lesson-navigation"><Link className={`outline-btn ${!prev?'disabled-link':''}`} to={prev?`/lessons/${prev.id}?course=${encodeURIComponent(courseId)}`:`/courses/${courseId}/modules`}>← {prev?'Leçon précédente':'Programme'}</Link><Link className="outline-btn" to={`/courses/${courseId}/modules`}>☰ Programme</Link>{next?<Link className="primary-btn" to={`/lessons/${next.id}?course=${encodeURIComponent(courseId)}`}>Leçon suivante →</Link>:<Link className="primary-btn" to={`/courses/${courseId}`}>Voir mon bilan final ✓</Link>}</div>
  </div></AppShell>
}
