import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card } from '../../components/AppShell.jsx';

export default function ForumPage(){
  const {token}=useAuth();
  const [topics,setTopics]=useState([]);
  const [categories,setCategories]=useState([]);
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('');
  const [open,setOpen]=useState(false);
  const [active,setActive]=useState(null);
  const [posts,setPosts]=useState([]);
  const [reply,setReply]=useState('');
  const [form,setForm]=useState({title:'',content:'',category_id:''});
  const [error,setError]=useState('');
  const load=()=>Promise.all([api.getForumCategories(),api.getForumTopics({q,category_id:cat})]).then(([c,t])=>{setCategories(c.categories||[]);setTopics(t.topics||[])}).catch(e=>setError(e.message));
  useEffect(()=>{load()},[cat]);
  useEffect(()=>{if(token) api.markNotificationsReadByType('forum',token).catch(()=>{});},[token]);
  useEffect(()=>{const t=setTimeout(load,300);return()=>clearTimeout(t)},[q]);
  async function create(e){e.preventDefault(); if(!token){setError('Connectez-vous pour publier.');return;} try{await api.createForumTopic(form,token); setForm({title:'',content:'',category_id:''}); setOpen(false); load();}catch(e){setError(e.message)}}
  async function openTopic(topic){setActive(topic); try{const d=await api.getForumTopic(topic.id); setPosts(d.posts||[]);}catch(e){setError(e.message)}}
  async function sendReply(e){e.preventDefault(); if(!reply.trim())return; try{await api.createForumPost(active.id,{content:reply},token); setReply(''); openTopic(active); load();}catch(e){setError(e.message)}}
  return <AppShell><div className="page"><PageHeader title="Forum" subtitle="Discussions réelles de la communauté"/>
    <div className="search-box">⌕<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher dans le forum..."/></div>
    <div className="chip-row"><button onClick={()=>setCat('')} className={`chip ${!cat?'active':''}`}>Toutes</button>{categories.map(c=><button key={c.id} onClick={()=>setCat(c.id)} className={`chip ${cat===c.id?'active':''}`}>{c.name}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}
    <Card>{topics.length?topics.map(t=><button className="forum-row" key={t.id} onClick={()=>openTopic(t)}><div className="topic-icon">◈</div><div className="grow"><h3>{t.title}</h3><p>{t.content||'Cliquez pour lire et répondre à la discussion.'}</p><span>{t.category_name||'Forum'} · {t.reply_count||0} réponses · {new Date(t.last_activity_at||t.created_at).toLocaleString('fr-FR')}</span></div></button>):<p style={{padding:18}}>Aucune discussion pour le moment.</p>}</Card>
    <button className="primary-btn full" onClick={()=>setOpen(true)}>＋ Nouvelle discussion</button>
    {open&&<div className="modal-backdrop" onClick={()=>setOpen(false)}><div className="modal-card" onClick={e=>e.stopPropagation()}><h2>Nouvelle discussion</h2><form onSubmit={create}><input autoFocus value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Titre de votre question"/><select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Catégorie</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Expliquez votre question..."/><div className="dual-actions"><button type="button" className="outline-btn" onClick={()=>setOpen(false)}>Annuler</button><button className="primary-btn">Publier</button></div></form></div></div>}
    {active&&<div className="modal-backdrop" onClick={()=>setActive(null)}><div className="modal-card wide" onClick={e=>e.stopPropagation()}><h2>{active.title}</h2><p>{active.content}</p><div className="stack">{posts.map(p=><div className="file-row" key={p.id}><div className="grow"><b>{p.author_name}</b><p>{p.content}</p><small>{new Date(p.created_at).toLocaleString('fr-FR')}</small></div></div>)}</div>{token?<form onSubmit={sendReply}><textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder="Votre réponse..."/><button className="primary-btn">Répondre</button></form>:<p>Connectez-vous pour répondre.</p>}</div></div>}
  </div></AppShell>}
