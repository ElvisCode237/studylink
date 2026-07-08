import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { MessageCircle, UsersRound, Bell, FolderOpen } from 'lucide-react';
import { AppShell, PageHeader, Card, Avatar, Progress } from '../../components/AppShell.jsx';
import { demoCourses, demoTutorials, demoPrograms, demoBootcamps } from '../../data/demoContent.js';

const fallbackAvatar='https://i.pravatar.cc/160?img=47';
const featureLinks=[
  ['Développement personnel','/personal-development','✦','Discipline, yoga, méditation'],
  ['Entrepreneuriat','/entrepreneurship','↗','Business plan et outils'],
  ['Bootcamps','/bootcamps','⚑','Formations gratuites'],
  ['Prépa entretien','/career-prep','◎','Simulations et CV']
];

export default function HomePage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [bootcamps,setBootcamps]=useState([]);
  const [counts,setCounts]=useState({messages:0,forum:0,notifications:0});

  useEffect(() => {
    let alive = true;
    api.getCourses().then((data) => alive && setCourses(data.courses || [])).catch(() => {});
    api.getBootcamps({}).then((data)=>alive&&setBootcamps(data.bootcamps||[])).catch(()=>{});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!token) {
      setCounts({ messages: 0, forum: 0, notifications: 0 });
      return undefined;
    }

    let alive = true;
    const loadCounts = () => api.getDashboardCounts(token)
      .then((data) => {
        if (!alive) return;
        setCounts({
          messages: Number(data.messages) || 0,
          forum: Number(data.forum) || 0,
          notifications: Number(data.notifications) || 0
        });
      })
      .catch(() => {});

    loadCounts();
    const intervalId = window.setInterval(loadCounts, 20000);
    const onFocus = () => loadCounts();
    const onVisibility = () => { if (document.visibilityState === 'visible') loadCounts(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token]);

  const quickLinks = useMemo(() => [
    { label: 'Messages', to: '/messages', Icon: MessageCircle, count: counts.messages },
    { label: 'Forum', to: '/forum', Icon: UsersRound, count: counts.forum },
    { label: 'Notifications', to: '/alerts', Icon: Bell, count: counts.notifications },
    { label: 'Documents', to: '/materials', Icon: FolderOpen, count: 0 }
  ], [counts]);

  const displayCourses=useMemo(()=>[...courses,...demoCourses.filter(d=>!courses.some(c=>String(c.id)===String(d.id)))].slice(0,4),[courses]);
  const displayBootcamps=useMemo(()=>[...bootcamps,...demoBootcamps.filter(d=>!bootcamps.some(b=>String(b.id)===String(d.id)))].slice(0,3),[bootcamps]);

  return <AppShell><div className="page">
    <PageHeader title="Bonjour 👋" subtitle="Prêt à avancer dans votre apprentissage ?" />

    <Card className="next-session next-session-compact" role="status" aria-live="polite">
      <div className="next-session-left">
        <span className="session-pulse-dot" aria-hidden="true" />
        <Avatar src={fallbackAvatar}/>
        <div className="next-session-copy">
          <div className="next-session-title-row"><span className="next-session-label">Prochain rendez-vous</span><strong>Python – Programmation avancée</strong></div>
          <p>Marie T. · Aujourd’hui, 14:00–16:00</p>
        </div>
      </div>
      <Link className="session-join-btn" to="/bookings">Rejoindre l’appel</Link>
    </Card>

    <div className="quick-grid">{quickLinks.map(({ label, to, Icon, count }) => <Link to={to} className="quick-card" key={label}><span className="quick-icon" aria-hidden="true"><Icon size={30} strokeWidth={2} /></span><b>{label}</b>{Number(count) > 0 && <span className="badge red" aria-label={`${count} élément${Number(count)>1?'s':''} non lu${Number(count)>1?'s':''}`}>{Number(count) > 99 ? '99+' : count}</span>}</Link>)}</div>

    <div className="section-title"><h2>Mes apprentissages</h2><Link to="/catalogue">Voir tout</Link></div>
    <Card>{[
      ['Python pour débutants',65,'/courses/demo-python'],['Algorithmes & Structures',80,'/courses/demo-algo'],['Préparation Entretien Tech',75,'/career-prep']
    ].map(([name,p,to])=><Link to={to} className="learning-row" key={name}><div className="grow"><b>{name}</b><Progress value={p}/></div><strong>{p}%</strong></Link>)}</Card>

    <div className="section-title"><h2>Nouveaux cours</h2><Link to="/catalogue">Voir tout</Link></div>
    <div className="course-card-grid">{displayCourses.map((course) => <Link to={`/courses/${course.id}`} className="course-card" key={course.id}>
      <div className="course-cover" style={course.cover_url ? { backgroundImage:`url(${course.cover_url})`, backgroundSize:'cover', backgroundPosition:'center' } : undefined}>{!course.cover_url && '◈'}</div>
      <b>{course.title}</b><span>{course.author_name || 'StudyLink'}</span><small>{course.category_name || 'Cours'} · {course.level || 'Tous niveaux'}</small>
    </Link>)}</div>

    <div className="section-title"><h2>Tutoriels rapides</h2><Link to="/catalogue">Voir tout</Link></div>
    <div className="media-strip">{demoTutorials.map(t=><Link key={t.id} to={`/tutorials/${t.id}`}><img src={`https://img.youtube.com/vi/${t.youtube_video_id}/mqdefault.jpg`} alt=""/><b>{t.title}</b><small>{t.estimated_minutes} min · ▶ Lancer</small></Link>)}</div>

    <div className="section-title"><h2>Programmes recommandés</h2><Link to="/personal-development">Voir tout</Link></div>
    <div className="course-card-grid">{demoPrograms.map(p=><Link key={p.id} to={`/personal-development/programs/${p.id}`} className="course-card image-card"><div className="photo" style={{backgroundImage:`url(${p.cover_url})`,backgroundSize:'cover',backgroundPosition:'center'}}></div><b>{p.title}</b><small>{p.duration_days} jours · {p.level}</small></Link>)}</div>

    <div className="section-title"><h2>Bootcamps à découvrir</h2><Link to="/bootcamps">Voir tout</Link></div>
    <div className="stack">{displayBootcamps.map(b=><Link to="/bootcamps" className="bootcamp-card" key={b.id}><div className="boot-icon">🚀</div><div className="grow"><b>{b.title}</b><p>{b.description}</p><small>{b.registered_count||0} participants</small></div><span className="status-pill">Découvrir</span></Link>)}</div>

    <div className="section-title"><h2>Explorer StudyLink</h2></div>
    <div className="feature-grid">{featureLinks.map(([l,to,i,sub]) => <Link to={to} className="feature-card" key={l}><span>{i}</span><b>{l}</b><small>{sub}</small></Link>)}</div>
  </div></AppShell>;
}
