import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen } from 'lucide-react';
import { api } from '../../api.js';
import { AppShell, PageHeader } from '../../components/AppShell.jsx';

export default function PersonalBooksPage(){
  const [books,setBooks]=useState([]); const [q,setQ]=useState(''); const [cat,setCat]=useState('Tous'); const [error,setError]=useState('');
  useEffect(()=>{api.getBooks({q}).then(d=>setBooks(d.books||[])).catch(e=>setError(e.message))},[q]);
  const categories=['Tous',...Array.from(new Set(books.map(b=>b.category_name).filter(Boolean)))];
  const list=useMemo(()=>books.filter(b=>cat==='Tous'||b.category_name===cat),[books,cat]);
  return <AppShell><div className="page personal-library-page"><PageHeader title="Bibliothèque personnelle" subtitle="Des guides originaux StudyLink et vos livres publiés légalement."/>
    <div className="search-box"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un livre, un auteur, un sujet..."/></div>
    <div className="chip-row">{categories.map(x=><button key={x} onClick={()=>setCat(x)} className={`chip ${cat===x?'active':''}`}>{x}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}
    <div className="section-title"><h2>Tous les guides</h2><span>{list.length} contenus</span></div>
    <div className="library-grid">{list.map(b=><Link key={b.id} to={`/personal-development/books/${b.id}`} className="library-card"><div className="library-cover" style={{backgroundImage:`url(${b.cover_url||''})`}}>{!b.cover_url&&<BookOpen/>}</div><div><span>{b.category_name||'Livre'}</span><h3>{b.title}</h3><p>{b.author_name||'StudyLink Academy'}</p><small>{b.chapter_count||0} chapitres · {b.page_count||0} pages</small></div></Link>)}</div>
  </div></AppShell>;
}
