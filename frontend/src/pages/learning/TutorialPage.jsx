import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { AppShell, PageHeader, Card, Chip } from '../../components/AppShell.jsx';
import { demoTutorials } from '../../data/demoContent.js';

const demoSteps=(tutorial)=>[
  {id:`${tutorial.id}-1`,title:'Découvrir le sujet',youtube_video_id:tutorial.youtube_video_id,content:tutorial.description},
  {id:`${tutorial.id}-2`,title:'Mettre en pratique',content:'Suivez les étapes montrées dans la vidéo et reproduisez-les sur votre ordinateur.'},
  {id:`${tutorial.id}-3`,title:'Vérifier le résultat',content:'Contrôlez que tout fonctionne, puis notez les points importants.'},
  {id:`${tutorial.id}-4`,title:'Aller plus loin',content:'Passez à la ressource suivante et continuez votre progression.'}
];

export default function TutorialPage(){
  const {id}=useParams(); const [tutorial,setTutorial]=useState(null); const [steps,setSteps]=useState([]); const [activeIndex,setActiveIndex]=useState(0); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const demo=useMemo(()=>demoTutorials.find(t=>String(t.id)===String(id)),[id]);
  useEffect(()=>{if(demo){setTutorial(demo);setSteps(demoSteps(demo));setLoading(false);return;}let alive=true;api.getTutorial(id).then(data=>{if(!alive)return;setTutorial(data.tutorial);setSteps(data.steps||[]);setActiveIndex(0)}).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[id,demo]);
  const step=steps[activeIndex]; const progress=steps.length?Math.round(((activeIndex+1)/steps.length)*100):0;
  if(loading)return <AppShell><div className="page"><PageHeader title="Tutoriel" back/><Card>Chargement du tutoriel...</Card></div></AppShell>;
  if(error||!tutorial)return <AppShell><div className="page"><PageHeader title="Tutoriel" back/><div className="admin-error">{error||'Tutoriel introuvable.'}</div></div></AppShell>;
  return <AppShell><div className="page"><PageHeader title="Tutoriel" back/><h1>{tutorial.title}</h1><p>{tutorial.description||'Suivez ce tutoriel étape par étape.'}</p>
    <div className="tutorial-layout"><aside>{steps.map((item,index)=><button type="button" key={item.id} className={index===activeIndex?'tutorial-step active':'tutorial-step'} onClick={()=>setActiveIndex(index)}><span>{index+1}</span>{item.title}</button>)}</aside>
      <div>{step?.youtube_video_id&&<div className="tutorial-video-wrap"><iframe className="tutorial-video-frame" src={`https://www.youtube-nocookie.com/embed/${step.youtube_video_id}?rel=0`} title={step.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>}
        <Card><Chip active>Étape {activeIndex+1}</Chip><h2>{step?.title}</h2><p className="tutorial-content-text">{step?.content||'Regardez la vidéo puis passez à l’étape suivante.'}</p><div className="tutorial-progress-text">Progression : {progress}%</div></Card></div></div>
    <div className="dual-actions"><button className="outline-btn" disabled={activeIndex===0} onClick={()=>setActiveIndex(v=>Math.max(0,v-1))}>← Étape précédente</button><button className="primary-btn" disabled={activeIndex>=steps.length-1} onClick={()=>setActiveIndex(v=>Math.min(steps.length-1,v+1))}>Étape suivante →</button></div>
  </div></AppShell>;
}
