import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { AppShell, PageHeader, Card, Chip } from '../../components/AppShell.jsx';
import { demoMaterials } from '../../data/demoContent.js';

const formatSize=(bytes)=>{const n=Number(bytes||0);if(!n)return'';if(n<1024)return`${n} o`;if(n<1024*1024)return`${(n/1024).toFixed(0)} Ko`;return`${(n/1024/1024).toFixed(2)} Mo`};
const extFrom=(m)=>{const name=m.file_name||m.title||'';const ext=name.includes('.')?name.split('.').pop().toUpperCase():'';if(ext)return ext.slice(0,5);const mime=m.mime_type||'';if(mime.includes('pdf'))return'PDF';if(mime.includes('presentation'))return'PPTX';if(mime.includes('word'))return'DOCX';return'FILE'};

export default function MaterialsPage(){
  const [materials,setMaterials]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [query,setQuery]=useState('');const [active,setActive]=useState('all');
  useEffect(()=>{let cancelled=false;api.getPublicMaterials().then(({materials})=>{if(!cancelled)setMaterials(materials||[])}).catch(err=>{if(!cancelled)setError(err.message||'Impossible de charger les documents.')}).finally(()=>!cancelled&&setLoading(false));return()=>{cancelled=true}},[]);
  const allMaterials=useMemo(()=>[...materials,...demoMaterials.filter(d=>!materials.some(m=>String(m.id)===String(d.id)))],[materials]);
  const visible=useMemo(()=>{const needle=query.trim().toLowerCase();return allMaterials.filter(m=>{const hay=[m.title,m.file_name,m.course_title,m.category_name].filter(Boolean).join(' ').toLowerCase();return(!needle||hay.includes(needle))&&(active==='all'||active==='courses')})},[allMaterials,query,active]);
  return <AppShell><div className="page"><PageHeader title="Matériels & Documents" subtitle="Supports publiés et ressources de découverte cliquables"/>
    <div className="search-box">⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un document, un cours..."/><span>☷</span></div>
    <div className="chip-row"><button onClick={()=>setActive('all')}><Chip active={active==='all'}>Tous</Chip></button><button onClick={()=>setActive('courses')}><Chip active={active==='courses'}>Cours</Chip></button><Chip>Sessions</Chip><Chip>Bootcamps</Chip></div>
    {error&&<div className="info-banner">Mode découverte actif : {error}</div>}
    <Card>{visible.map(m=><div className="file-row" key={m.id}><span className={`file-icon type-${extFrom(m).includes('PDF')?'pdf':'doc'}`}>{extFrom(m)}</span><div className="grow"><a href={m.file_url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}><b>{m.title||m.file_name||'Document'}</b></a><p>{m.course_title||'Cours StudyLink'}</p><span>{m.category_name||'Cours'}{m.file_size?` · ${formatSize(m.file_size)}`:''}</span></div><a href={m.file_url} target="_blank" rel="noreferrer" className="admin-btn secondary" style={{textDecoration:'none',whiteSpace:'nowrap'}}>Ouvrir</a></div>)}</Card>
    {loading&&<div className="catalogue-status-card">Synchronisation avec la base de données...</div>}
  </div></AppShell>;
}
