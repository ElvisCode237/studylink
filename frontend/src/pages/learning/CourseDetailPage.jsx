import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Avatar, Progress } from '../../components/AppShell.jsx';
import { PYTHON_COURSE_SLUG, pythonCourseFallback, flattenCourseLessons } from '../../data/pythonCourseData.js';
import { demoCourses } from '../../data/demoContent.js';

const duration = (minutes) => {
  const n = Number(minutes) || 0;
  if (!n) return 'Durée libre';
  const h = Math.floor(n / 60), m = n % 60;
  return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m} min`;
};
const levelLabel = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé', all: 'Tous niveaux' };
const lessonType = { youtube: 'Vidéo', video_upload: 'Vidéo', exercise: 'Exercice', text: 'Lecture', pdf: 'PDF', audio: 'Audio', quiz: 'Quiz', live: 'Direct' };

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [learning, setLearning] = useState({ enrollment: null, progress: [], notes: [] });
  const [tab, setTab] = useState('Aperçu');
  const [openModules, setOpenModules] = useState([0]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isPythonFallback = id === PYTHON_COURSE_SLUG || id === 'demo-python';
  const demoCourse = demoCourses.find((course) => String(course.id) === String(id) || String(course.slug) === String(id));

  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.getCourse(id)
      .then((result) => alive && setData(result))
      .catch((e) => {
        if (isPythonFallback && alive) setData(pythonCourseFallback);
        else if (demoCourse && alive) {
          const genericModules = Array.from({ length: 3 }, (_, mi) => ({ id: `${demoCourse.id}-m${mi+1}`, title: ['Fondamentaux','Mise en pratique','Projet guidé'][mi], description: ['Comprendre les concepts essentiels','Appliquer avec des exercices','Construire un projet concret'][mi], position: mi+1, lessons: Array.from({ length: 2 }, (_, li) => ({ id: `${demoCourse.id}-m${mi+1}-l${li+1}`, title: li===0 ? ['Comprendre les bases','Pratiquer pas à pas','Construire le projet'][mi] : ['Exercices essentiels','Cas pratique','Bilan et prochaines étapes'][mi], lesson_type: li===0?'text':'exercise', content: demoCourse.short_description, duration_seconds: 1800, position: li+1, resources: [] })) }));
          setData({ course: demoCourse, modules: genericModules, files: [] });
        } else if (alive) setError(e.message);
      });
    return () => { alive = false; };
  }, [id, isPythonFallback, demoCourse]);

  useEffect(() => {
    if (!token || !data) return;
    api.getCourseLearning(id, token)
      .then(setLearning)
      .catch(() => setLearning({ enrollment: null, progress: [], notes: [] }));
  }, [id, token, data]);

  const lessons = useMemo(() => flattenCourseLessons(data || { modules: [] }), [data]);
  const progressMap = useMemo(() => Object.fromEntries((learning.progress || []).map((p) => [String(p.lesson_id), p])), [learning.progress]);
  const completedCount = lessons.filter((l) => progressMap[String(l.id)]?.status === 'completed').length;
  const progressPercent = learning.enrollment?.progress_percent != null
    ? Math.round(Number(learning.enrollment.progress_percent))
    : (lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0);
  const nextLesson = lessons.find((l) => progressMap[String(l.id)]?.status !== 'completed') || lessons[lessons.length - 1];

  async function enroll() {
    if (!token) return navigate('/login');
    setBusy(true); setError('');
    try {
      const result = await api.enrollCourse(id, token);
      setLearning((s) => ({ ...s, enrollment: result.enrollment }));
      if (nextLesson) navigate(`/lessons/${nextLesson.id}?course=${encodeURIComponent(id)}`);
      else navigate(`/courses/${id}/modules`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function toggleModule(index) {
    setOpenModules((items) => items.includes(index) ? items.filter((x) => x !== index) : [...items, index]);
  }

  if (error && !data) return <AppShell><div className="page course-page"><PageHeader title="Détail du cours" back/><div className="admin-error">{error}</div></div></AppShell>;
  if (!data) return <AppShell><div className="page course-page"><PageHeader title="Détail du cours" back/><div className="course-skeleton">Chargement du parcours...</div></div></AppShell>;

  const { course, modules = [], files = [] } = data;
  const firstVideo = lessons.find((l) => l.youtube_video_id);

  return <AppShell>
    <div className="page course-page">
      <PageHeader title="Détail du cours" back/>
      {error && <div className="admin-error">{error}</div>}

      <section className="course-detail-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(4,20,55,.96) 0%,rgba(4,20,55,.82) 48%,rgba(4,20,55,.30) 100%),url(${course.cover_url || ''})` }}>
        <div className="course-hero-copy">
          <span className="course-category-pill">{course.category_name || 'Cours'}</span>
          <h1>{course.title}</h1>
          <p>{course.short_description || course.description}</p>
          <div className="course-author-line">
            <Avatar src={course.author_avatar_url} name={course.author_name || 'StudyLink'} />
            <div><b>{course.author_name || 'Équipe StudyLink'}</b><span>Formateur · {course.language?.toUpperCase() || 'FR'}</span></div>
          </div>
          <div className="course-social-proof"><span>★ 4,9</span><span>•</span><span>{Number(course.enrollment_count || 1248).toLocaleString('fr-FR')} apprenants</span></div>
        </div>
        <div className="course-hero-side">
          <div className="course-python-mark">🐍</div>
          {firstVideo && <button className="course-preview-button" onClick={() => navigate(`/lessons/${firstVideo.id}?course=${encodeURIComponent(id)}`)}>▶ Voir un aperçu</button>}
        </div>
      </section>

      <section className="course-kpis">
        <div><span>◫</span><b>{levelLabel[course.level] || course.level || 'Tous niveaux'}</b><small>Niveau</small></div>
        <div><span>◷</span><b>{duration(course.estimated_minutes)}</b><small>Durée estimée</small></div>
        <div><span>▤</span><b>{modules.length} modules</b><small>{lessons.length} leçons</small></div>
        <div><span>▱</span><b>{files.length + lessons.reduce((n, l) => n + (l.resources?.length || 0), 0)} ressources</b><small>Documentation</small></div>
      </section>

      {learning.enrollment && <section className="course-progress-banner">
        <div className="course-progress-circle" style={{ '--progress': `${progressPercent * 3.6}deg` }}><strong>{progressPercent}%</strong></div>
        <div className="grow"><div className="between"><div><b>Votre progression</b><p>{completedCount} leçon(s) terminée(s) sur {lessons.length}</p></div><span>{progressPercent >= 100 ? 'Cours terminé ✓' : 'En cours'}</span></div><Progress value={progressPercent}/></div>
        {progressPercent >= 100
          ? <Link className="primary-btn success-btn" to={`/courses/${id}/certificate`}>Obtenir mon certificat</Link>
          : nextLesson && <Link className="primary-btn" to={`/lessons/${nextLesson.id}?course=${encodeURIComponent(id)}`}>Continuer →</Link>}
      </section>}

      <nav className="course-detail-tabs">
        {['Aperçu', 'Programme', 'Ressources', 'Avis'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}{item === 'Programme' ? ` (${lessons.length})` : ''}</button>)}
      </nav>

      {tab === 'Aperçu' && <div className="course-content-grid">
        <main className="course-main-column">
          <section className="course-panel">
            <h2>À propos du cours</h2>
            <p className="course-long-copy">{course.description || course.short_description}</p>
          </section>
          <section className="course-panel">
            <h2>Ce que vous allez apprendre</h2>
            <div className="learning-objectives-grid">{(course.objectives || []).map((objective) => <div key={objective}><span>✓</span><p>{objective}</p></div>)}</div>
          </section>
          <section className="course-panel">
            <div className="between"><div><h2>Programme du cours</h2><p>{modules.length} modules · {lessons.length} leçons · {duration(course.estimated_minutes)}</p></div><button className="text-btn" onClick={() => setTab('Programme')}>Tout afficher →</button></div>
            <div className="course-module-preview">{modules.slice(0, 3).map((module, index) => <button key={module.id} onClick={() => { setTab('Programme'); setOpenModules([index]); }}><span>{index + 1}</span><div><b>{module.title}</b><small>{module.lessons?.length || 0} leçon(s) · {module.description}</small></div><strong>›</strong></button>)}</div>
          </section>
          <section className="course-panel">
            <h2>Prérequis</h2>
            <div className="prerequisite-list">{(course.prerequisites || ['Aucun prérequis spécifique']).map((item) => <p key={item}><span>○</span>{item}</p>)}</div>
          </section>
        </main>
        <aside className="course-side-column">
          <section className="course-action-card">
            <div className="course-action-price">{course.is_free !== false ? 'Gratuit' : `${course.price} €`}</div>
            <p>Accès au parcours, aux vidéos, aux exercices et aux ressources.</p>
            {learning.enrollment
              ? <Link className="primary-btn full" to={nextLesson ? `/lessons/${nextLesson.id}?course=${encodeURIComponent(id)}` : `/courses/${id}/modules`}>▶ Continuer le cours</Link>
              : <button className="primary-btn full" onClick={enroll} disabled={busy}>{busy ? 'Inscription...' : '▶ Commencer gratuitement'}</button>}
            <Link className="outline-btn full" to={`/courses/${id}/modules`}>Voir tout le programme</Link>
            <div className="course-action-includes"><b>Ce cours comprend :</b><span>✓ {lessons.filter((l) => l.lesson_type === 'youtube').length} vidéos intégrées</span><span>✓ {lessons.filter((l) => l.lesson_type === 'exercise').length} exercices pratiques</span><span>✓ {files.length} ressources générales</span><span>✓ Progression enregistrée</span><span>✓ Accès sur ordinateur et mobile</span></div>
          </section>
          <section className="course-panel course-mentor-card"><Avatar size="lg" src={course.author_avatar_url} name={course.author_name || 'StudyLink'}/><div><small>Votre formateur</small><h3>{course.author_name || 'Équipe StudyLink'}</h3><p>Des explications progressives, des ressources fiables et des exercices pour pratiquer.</p></div></section>
        </aside>
      </div>}

      {tab === 'Programme' && <section className="course-program-section">
        <div className="between course-program-head"><div><h2>Programme complet</h2><p>Ouvrez un module et lancez n’importe quelle leçon.</p></div>{!learning.enrollment && <button className="primary-btn" onClick={enroll}>S’inscrire au cours</button>}</div>
        <div className="course-accordion">{modules.map((module, moduleIndex) => {
          const open = openModules.includes(moduleIndex);
          const moduleCompleted = (module.lessons || []).filter((l) => progressMap[String(l.id)]?.status === 'completed').length;
          return <article key={module.id} className="course-accordion-module">
            <button className="course-accordion-head" onClick={() => toggleModule(moduleIndex)}><span className="module-number">{moduleIndex + 1}</span><div className="grow"><b>{module.title}</b><small>{module.description || `${module.lessons?.length || 0} leçons`}</small></div><span className="module-progress-mini">{moduleCompleted}/{module.lessons?.length || 0}</span><strong>{open ? '⌃' : '⌄'}</strong></button>
            {open && <div className="course-lesson-list">{(module.lessons || []).map((lesson, lessonIndex) => {
              const p = progressMap[String(lesson.id)];
              return <Link key={lesson.id} to={`/lessons/${lesson.id}?course=${encodeURIComponent(id)}`} className="course-lesson-row"><span className={`lesson-state ${p?.status === 'completed' ? 'done' : ''}`}>{p?.status === 'completed' ? '✓' : lessonType[lesson.lesson_type] === 'Vidéo' ? '▶' : '○'}</span><div className="grow"><b>{moduleIndex + 1}.{lessonIndex + 1} {lesson.title}</b><small>{lessonType[lesson.lesson_type] || 'Leçon'} · {Math.max(1, Math.round((Number(lesson.duration_seconds) || 0) / 60))} min{lesson.resource_count > 0 ? ` · ${lesson.resource_count} ressource(s)` : ''}</small></div><span>›</span></Link>;
            })}</div>}
          </article>;
        })}</div>
      </section>}

      {tab === 'Ressources' && <section className="course-resources-section">
        <h2>Ressources du cours</h2><p>Documents et liens utiles sélectionnés pour accompagner le parcours.</p>
        <div className="course-resource-grid">{files.map((file) => <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" className="course-resource-card"><span>{file.mime_type?.includes('pdf') ? 'PDF' : '↗'}</span><div><b>{file.title || file.file_name}</b><small>{file.file_name || 'Ressource externe'}</small></div><strong>Ouvrir</strong></a>)}</div>
        <h3>Ressources par leçon</h3>
        <div className="course-resource-grid">{lessons.flatMap((lesson) => (lesson.resources || []).map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="course-resource-card"><span>↗</span><div><b>{resource.title}</b><small>{lesson.title}</small></div><strong>Ouvrir</strong></a>))}</div>
      </section>}

      {tab === 'Avis' && <section className="course-reviews-section">
        <div className="review-summary"><strong>4,9</strong><div><div className="stars">★★★★★</div><p>Les évaluations réelles pourront être publiées ici après la fin du cours.</p></div></div>
        <div className="course-panel"><h3>Votre avis compte</h3><p>Terminez des leçons, testez les exercices puis partagez votre expérience. Le système de notation du cours pourra être activé avec la table des avis.</p></div>
      </section>}
    </div>
  </AppShell>;
}
