import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { AppShell, PageHeader, Chip } from '../../components/AppShell.jsx';
const cats=['Idée & Validation','Business Plan','Finance','Marketing','Vente','E-commerce','Leadership','Business en ligne'];
const fallbackTools=[
  {id:'demo-tool-1',title:'Modèle de business plan',file_type:'DOCX',category:'Modèles'},
  {id:'demo-tool-2',title:'Prévision financière',file_type:'XLSX',category:'Finances'},
  {id:'demo-tool-3',title:'Checklist de lancement',file_type:'PDF',category:'Documents'},
];
export default function EntrepreneurshipPage(){
  const [tools,setTools]=useState([]);const [q,setQ]=useState('');
  useEffect(()=>{api.getEntrepreneurTools({q}).then(d=>setTools(d.tools||[])).catch(()=>{})},[q]);
  const displayTools=tools.length?tools:[...fallbackTools];
  return <AppShell><div className="page"><PageHeader title="Entrepreneuriat" subtitle="Créez, lancez et développez votre projet"/>
    <div className="search-box">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un cours, une compétence, un sujet..."/></div>
    <div className="chip-row"><Chip>Catégories⌄</Chip><Chip>Niveau⌄</Chip><Chip>Type⌄</Chip><Chip>Format⌄</Chip></div>
    <div className="category-grid entrepreneur">{cats.map((c,i)=><button type="button" className={`category-card e${i}`} key={c} onClick={()=>setQ(c)}><span>{['💡','▤','◔','⌁','▣','🛒','♟','◎'][i]}</span><b>{c}</b><small>Explorer</small></button>)}</div>
    <div className="section-title"><h2>Parcours populaires</h2><Link to="/entrepreneurship/project">Mon projet</Link></div>
    <div className="course-card-grid"><Link to="/entrepreneurship/business-plan" className="path-card"><Chip tone="green">Intermédiaire</Chip><h3>Business plan complet</h3><p>Réalisez un business plan solide et convaincant.</p><small>10 modules · 7 h 45</small></Link><Link to="/entrepreneurship/project" className="path-card"><Chip>Projet</Chip><h3>Mon projet entrepreneurial</h3><p>Suivez vos tâches, budget et documents.</p><small>Données personnelles</small></Link><Link to="/entrepreneurship/toolkit" className="path-card"><Chip>Outils</Chip><h3>Boîte à outils entrepreneur</h3><p>{displayTools.length} ressource(s) disponible(s)</p><small>Ouvrir →</small></Link></div>
    <div className="section-title"><h2>Ressources & Modèles</h2><Link to="/entrepreneurship/toolkit">Voir tout</Link></div><div className="resource-grid">{displayTools.slice(0,3).map(t=><Link to="/entrepreneurship/toolkit" key={t.id}>▤ <b>{t.title}</b><br/><small>{t.file_type||t.category}</small></Link>)}</div>
  </div></AppShell>;
}
