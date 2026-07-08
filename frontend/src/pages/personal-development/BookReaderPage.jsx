import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bookmark, StickyNote, Moon, Sun, Minus, Plus, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Progress } from '../../components/AppShell.jsx';

export default function BookReaderPage(){
  const {id}=useParams(); const {token}=useAuth(); const [data,setData]=useState(null); const [chapter,setChapter]=useState(1); const [font,setFont]=useState(18); const [night,setNight]=useState(false); const [bookmarked,setBookmarked]=useState(false); const [note,setNote]=useState(''); const [saved,setSaved]=useState(''); const [error,setError]=useState('');
  async function load(){try{const d=await api.getBook(id);setData(d);if(token){const p=await api.getBookProgress(id,token);if(p.progress){setChapter(Number(p.progress.current_page)||1);setFont(Number(p.progress.font_size)||18);setNight(!!p.progress.night_mode)}setBookmarked((p.bookmarks||[]).some(x=>Number(x.page_number)===Number(p.progress?.current_page||1)));}}catch(e){setError(e.message)}}
  useEffect(()=>{load()},[id,token]);
  const chapters=data?.chapters||[]; const current=chapters[Math.max(0,chapter-1)]||null; const total=chapters.length||1; const progress=Math.round(chapter/total*100);
  async function saveProgress(next=chapter){setChapter(next);if(token)await api.saveBookProgress(id,{current_page:next,progress_percent:Math.round(next/total*100),font_size:font,night_mode:night,last_position:{chapter:next}},token).catch(()=>{})}
  async function toggleBookmark(){if(!token){setError('Connectez-vous pour enregistrer un signet.');return;}const r=await api.toggleBookBookmark(id,{page_number:chapter,label:current?.title},token);setBookmarked(r.bookmarked)}
  async function saveNote(){if(!token||!note.trim())return;await api.addBookNote(id,{page_number:chapter,content:note},token);setNote('');setSaved('Note enregistrée');setTimeout(()=>setSaved(''),1800)}
  const paragraphs=useMemo(()=>String(current?.content||data?.book?.description||'').split(/\n\n+/),[current,data]);
  return <AppShell><div className={`page modern-reader ${night?'night':''}`}><PageHeader title="Lecture" back/>{error&&<div className="admin-error">{error}</div>}
    {!data?<div className="course-skeleton">Chargement du livre…</div>:<>
      <section className="reader-book-summary"><div className="reader-cover" style={{backgroundImage:`url(${data.book.cover_url||''})`}}/><div className="grow"><span className="eyebrow">{data.book.category_name||'Guide'}</span><h1>{data.book.title}</h1><p>{data.book.author_name}</p><Progress value={progress}/><small>{progress}% · Chapitre {chapter}/{total}</small></div></section>
      <div className="reader-toolbar"><button onClick={toggleBookmark} className={bookmarked?'active':''}><Bookmark/><small>{bookmarked?'Signet enregistré':'Ajouter un signet'}</small></button><button onClick={()=>setFont(Math.max(14,font-2))}><Minus/><small>Texte</small></button><button onClick={()=>setFont(Math.min(28,font+2))}><Plus/><small>Texte</small></button><button onClick={()=>{setNight(!night);setTimeout(()=>saveProgress(chapter),0)}}>{night?<Sun/>:<Moon/>}<small>{night?'Mode clair':'Mode nuit'}</small></button></div>
      <article className="reader-content-card" style={{fontSize:font}}><div className="reader-chapter-head"><button disabled={chapter<=1} onClick={()=>saveProgress(chapter-1)}><ChevronLeft/></button><div><span>Chapitre {chapter}</span><h2>{current?.title||data.book.title}</h2><small>{current?.estimated_minutes||8} min de lecture</small></div><button disabled={chapter>=total} onClick={()=>saveProgress(chapter+1)}><ChevronRight/></button></div><div className="reader-prose">{paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></article>
      <section className="reader-note-card"><div><StickyNote/><div><h3>Mes notes sur ce chapitre</h3><p>Gardez une idée, une question ou une action à tester.</p></div></div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Écrire une note personnelle..."/><button className="primary-btn" onClick={saveNote}><Save size={17}/>{saved||'Enregistrer ma note'}</button></section>
    </>}
  </div></AppShell>;
}
