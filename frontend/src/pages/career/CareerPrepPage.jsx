import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardCheck, FileText, Goal, MessageSquareText, Mic2, PlayCircle, Search, Sparkles, Star, Target, Upload, UsersRound, X } from 'lucide-react';
import { AppShell, PageHeader, Avatar } from '../../components/AppShell.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { api } from '../../api.js';
import { CAREER_RESOURCES } from './careerContent.js';

const ACTIONS=[
  {key:'mock',title:"Simulation d’entretien",subtitle:'Répondez à des questions réelles',icon:Mic2},
  {key:'cv',title:'Correction de CV',subtitle:'Analysez votre CV étape par étape',icon:FileText},
  {key:'hr',title:'Simulation RH',subtitle:'Questions comportementales',icon:UsersRound},
  {key:'questions',title:'Questions fréquentes',subtitle:'Banque de questions classées',icon:MessageSquareText},
  {key:'feedback',title:'Feedback personnalisé',subtitle:'Suivez vos progrès',icon:ClipboardCheck},
  {key:'workshop',title:'Atelier pratique',subtitle:'Sessions et bootcamps',icon:BriefcaseBusiness},
];

export default function CareerPrepPage(){
  const {token}=useAuth(); const {notify}=useAppData(); const navigate=useNavigate();
  const [data,setData]=useState({resources:[],questions:[],sessions:[],cv_submissions:[],mentors:[],stats:{attempts:0,avg_confidence:0},goals:null});
  const [loading,setLoading]=useState(true); const [showGoal,setShowGoal]=useState(false); const [query,setQuery]=useState('');
  const [questionIndex,setQuestionIndex]=useState(0); const [answer,setAnswer]=useState(''); const [confidence,setConfidence]=useState(3);
  const [goals,setGoals]=useState({target_role:'',target_sector:'',target_location:'',interview_date:'',weekly_target:3});

  async function load(){ if(!token) return; setLoading(true); try{const r=await api.getCareerDashboard(token);setData(r);setGoals({...goals,...(r.goals||{})});}catch(e){notify(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[token]);

  const resourcePool=useMemo(()=>data.resources?.length?data.resources:CAREER_RESOURCES.map((r,i)=>({id:`fallback-${i}`,title:r.title,description:r.summary,resource_type:r.type?.toLowerCase()||'article',url:`/career-prep?tool=${r.slug}`})),[data.resources]);
  const filteredResources=useMemo(()=>resourcePool.filter(r=>`${r.title} ${r.description||''}`.toLowerCase().includes(query.toLowerCase())),[resourcePool,query]);
  const upcoming=data.sessions.find(s=>s.status==='scheduled' && (!s.start_time || new Date(s.start_time)>new Date()));

  async function saveGoals(){try{await api.saveCareerGoals(goals,token);notify('Objectif carrière enregistré');load()}catch(e){notify(e.message)}}
  function openAction(key){ navigate(`/career-prep/${key}`); }

  return <AppShell><div className="career-page-v2"><PageHeader title="Carrière & emploi" subtitle="Préparez vos candidatures, entraînez-vous et suivez vos progrès."/>
    <section className="career-overview-grid">
      <div className="career-goal-card"><div className="career-card-head"><div><span className="eyebrow">Votre objectif</span><h2>{data.goals?.target_role||'Définissez votre prochain poste'}</h2></div><Target size={34}/></div>
        <div className="career-stats-row"><span><b>{data.stats?.attempts||0}</b> entraînements</span><span><b>{data.stats?.avg_confidence||0}/5</b> confiance</span><span><b>{data.cv_submissions?.length||0}</b> CV suivis</span></div>
        <button className="career-link-btn" onClick={()=>setShowGoal(v=>!v)}>Mettre à jour mon objectif</button></div>
      <div className="career-next-card"><span className="eyebrow">Prochain rendez-vous</span>{upcoming?<><h3>{labelSession(upcoming.session_type)}</h3><p>{upcoming.mentor_name||'Mentor carrière'}{upcoming.start_time?` · ${new Date(upcoming.start_time).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`:''}</p><button className="primary-btn" onClick={()=>navigate(upcoming.booking_id?`/sessions/${upcoming.booking_id}`:'/sessions')}>Voir la session</button></>:<><h3>Aucune session planifiée</h3><p>Réservez un mentor pour un entretien blanc ou une correction de CV.</p><button className="primary-btn" onClick={()=>navigate('/search')}>Trouver un mentor</button></>}</div>
    </section>
    {showGoal&&<section className="career-content-panel goal-inline"><h2>Définir mon objectif professionnel</h2><div className="career-form-grid"><label>Poste visé<input value={goals.target_role||''} onChange={e=>setGoals({...goals,target_role:e.target.value})}/></label><label>Secteur<input value={goals.target_sector||''} onChange={e=>setGoals({...goals,target_sector:e.target.value})}/></label><label>Localisation<input value={goals.target_location||''} onChange={e=>setGoals({...goals,target_location:e.target.value})}/></label><label>Date d’entretien<input type="date" value={goals.interview_date?.slice?.(0,10)||''} onChange={e=>setGoals({...goals,interview_date:e.target.value})}/></label></div><button className="primary-btn" onClick={()=>saveGoals().then?.(()=>setShowGoal(false))}>Enregistrer</button></section>}

    <div className="section-title"><h2>Outils de préparation</h2><span>6 outils</span></div>
    <div className="career-tools-grid">{ACTIONS.map(a=>{const I=a.icon;return <button key={a.key} className="career-tool-card" onClick={()=>openAction(a.key)}><span className="career-tool-icon"><I size={25}/></span><b>{a.title}</b><small>{a.subtitle}</small><span className="tool-open">Ouvrir →</span></button>})}</div>

    <div className="section-title"><h2>Mentors recommandés</h2><button onClick={()=>navigate('/search')}>Voir tous</button></div>
    <div className="career-mentor-grid">{data.mentors.length?data.mentors.map(m=><article className="career-mentor-card" key={m.tutor_id}><Avatar src={m.avatar_url} size="lg"/><div><h3>{m.full_name}</h3><p>{m.professional_title||'Mentor carrière'}</p><small><Star size={14} fill="currentColor"/> {Number(m.rating||0).toFixed(1)} · {m.experience_years||0} ans d’expérience</small></div><div className="mentor-actions"><button onClick={()=>navigate(`/tutors/${m.tutor_id}`)}>Profil</button><button className="primary-btn" onClick={()=>navigate(`/tutors/${m.tutor_id}`)}>Réserver</button></div></article>):['Entretien & recrutement','CV & candidature','Carrière tech'].map((title,i)=><button key={title} className="mentor-discovery-card" onClick={()=>navigate(`/search?q=${encodeURIComponent(title)}`)}><span>{i+1}</span><div><h3>{title}</h3><p>Trouver un mentor disponible et réserver une session individuelle.</p></div><b>Explorer →</b></button>)}</div>

    <div className="section-title"><h2>Ressources pour vous</h2><span>{filteredResources.length} ressources</span></div>
    <div className="career-resource-toolbar"><div className="career-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une ressource…"/></div></div>
    <div className="career-resource-grid">{filteredResources.map(r=><button key={r.id} className="career-resource-card" onClick={()=>{const slug=resourceSlug(r); if(slug) navigate(`/career-prep/resource/${slug}`); else if(r.url) window.open(r.url,'_blank')}}><ResourceIcon type={r.resource_type}/><div><b>{r.title}</b><p>{r.description}</p><small>{resourceLabel(r.resource_type)} · Gratuit</small></div></button>)}</div>
  </div></AppShell>
}

function PracticeTool({title,question,answer,setAnswer,confidence,setConfidence,save,next}){return <><span className="eyebrow">Entraînement guidé</span><h2>{title}</h2>{question?<><div className="career-question"><Sparkles/><div><b>{question.question}</b><p>{question.guidance}</p></div></div><label>Votre réponse<textarea rows="7" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Écrivez votre réponse comme si vous étiez en entretien…"/></label><div className="confidence-row"><span>Votre niveau de confiance</span>{[1,2,3,4,5].map(n=><button className={confidence===n?'active':''} onClick={()=>setConfidence(n)} key={n}>{n}</button>)}</div><div className="modal-actions"><button onClick={next}>Question suivante</button><button className="primary-btn" disabled={!answer.trim()} onClick={save}>Enregistrer ma réponse</button></div></>:<p>Aucune question disponible. Exécutez la migration 013.</p>}</>}
function GoalEditor({goals,setGoals,save}){return <><span className="eyebrow">Plan de carrière</span><h2>Définir mon objectif</h2><div className="career-form-grid"><label>Poste visé<input value={goals.target_role||''} onChange={e=>setGoals({...goals,target_role:e.target.value})}/></label><label>Secteur<input value={goals.target_sector||''} onChange={e=>setGoals({...goals,target_sector:e.target.value})}/></label><label>Localisation<input value={goals.target_location||''} onChange={e=>setGoals({...goals,target_location:e.target.value})}/></label><label>Date d’entretien<input type="date" value={goals.interview_date?.slice?.(0,10)||''} onChange={e=>setGoals({...goals,interview_date:e.target.value})}/></label><label>Entraînements par semaine<input type="number" min="1" max="14" value={goals.weekly_target||3} onChange={e=>setGoals({...goals,weekly_target:e.target.value})}/></label></div><button className="primary-btn wide" onClick={save}>Enregistrer mon objectif</button></>}
function CvTool({submissions,notify}){return <><span className="eyebrow">CV</span><h2>Contrôle qualité de votre CV</h2><div className="cv-checklist">{['Titre clair et adapté au poste','Expériences orientées résultats','Verbes d’action précis','Compétences cohérentes avec l’offre','Mise en page lisible','Aucune faute visible','Coordonnées à jour','Longueur adaptée'].map(x=><label key={x}><input type="checkbox"/> {x}</label>)}</div><button className="primary-btn wide" onClick={()=>notify('Checklist CV enregistrée')}>Terminer la vérification</button>{submissions.length>0&&<div className="cv-history"><h3>Historique</h3>{submissions.map(s=><div key={s.id}><FileText size={18}/><span>{s.title}</span><small>{s.status}</small></div>)}</div>}</>}
function FeedbackTool({data}){return <><span className="eyebrow">Vos progrès</span><h2>Feedback personnalisé</h2><div className="feedback-score"><strong>{data.stats?.avg_confidence||0}/5</strong><span>Confiance moyenne</span></div><p>Vous avez enregistré <b>{data.stats?.attempts||0}</b> entraînement(s). Répétez vos réponses à voix haute et cherchez des exemples plus précis à chaque passage.</p><div className="feedback-tips"><p>✓ Répondez avec des faits, pas seulement des qualités.</p><p>✓ Utilisez des résultats mesurables lorsque c’est possible.</p><p>✓ Gardez les réponses importantes sous 2 minutes.</p></div></>}
function QuestionLibrary({questions}){const groups=Object.groupBy?Object.groupBy(questions,q=>q.category):questions.reduce((a,q)=>((a[q.category]??=[]).push(q),a),{});return <><span className="eyebrow">Banque de questions</span><h2>Questions fréquentes</h2><div className="question-library">{Object.entries(groups).map(([g,qs])=><section key={g}><h3>{g==='hr'?'Ressources humaines':g==='technical'?'Technique':'Comportemental'}</h3>{qs.map(q=><details key={q.id}><summary>{q.question}</summary><p>{q.guidance}</p></details>)}</section>)}</div></>}
function ResourceIcon({type}){const I=type==='video'?PlayCircle:type==='checklist'?CheckCircle2:type==='interview_questions'?MessageSquareText:type==='cv_template'?FileText:ClipboardCheck;return <span className="career-resource-icon"><I size={24}/></span>}
function resourceLabel(t){return ({video:'Vidéo',checklist:'Checklist',interview_questions:'Questions',cv_template:'CV',cover_letter:'Modèle',article:'Guide',pdf:'PDF'})[t]||'Ressource'}
function resourceSlug(r){const u=r.url||'';for(const slug of ['star','pitch','checklist','cv','questions-to-ask','technical','salary','follow-up'])if(u.includes(slug))return slug; if(r.title?.toLowerCase().includes('star'))return 'star'; if(r.title?.toLowerCase().includes('pitch'))return 'pitch'; if(r.title?.toLowerCase().includes('checklist'))return 'checklist'; if(r.title?.toLowerCase().includes('cv'))return 'cv'; if(r.title?.toLowerCase().includes('salaire'))return 'salary'; if(r.title?.toLowerCase().includes('relance'))return 'follow-up'; return 'questions-to-ask'}
function labelSession(t){return ({mock_interview:"Simulation d’entretien",cv_review:'Correction de CV',hr_interview:'Simulation RH',technical_interview:'Entretien technique',career_coaching:'Coaching carrière'})[t]||'Session carrière'}
