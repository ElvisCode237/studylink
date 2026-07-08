import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Card, Chip, Avatar } from '../../components/AppShell.jsx';

const fallbackAvatar='';

export default function MessagesPage() {
  const { token } = useAuth();
  const [contacts,setContacts]=useState([]);
  const [users,setUsers]=useState([]);
  const [q,setQ]=useState('');
  const [role,setRole]=useState('Tous');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const loadContacts = async () => {
    try {
      const data = await api.getContacts(token);
      setContacts(data.contacts || []);
    } catch(e) { setError(e.message || 'Impossible de charger les conversations.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadContacts(); },[token]);
  useEffect(()=>{
    const t=setTimeout(()=>{
      api.searchUsers(q,token).then((data)=>setUsers(data.users||[])).catch(()=>{});
    },250);
    return ()=>clearTimeout(t);
  },[q,token]);

  const filteredContacts = useMemo(()=>contacts.filter((c)=>{
    const okRole = role==='Tous' || (role==='Tuteurs' ? c.role==='tutor' : c.role==='student');
    const text = [c.full_name,c.email,c.role,c.lastMessage?.content].filter(Boolean).join(' ').toLowerCase();
    return okRole && (!q.trim() || text.includes(q.toLowerCase()));
  }),[contacts,q,role]);

  const contactIds = new Set(contacts.map((c)=>c.id));
  const suggestions = users.filter((u)=>!contactIds.has(u.id)).slice(0,8);

  return <AppShell><div className="page">
    <PageHeader title="Messages" subtitle="Chaque utilisateur voit uniquement ses propres conversations" />
    <div className="search-box">⌕<input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Rechercher un utilisateur ou une conversation..."/></div>
    <div className="chip-row">{['Tous','Tuteurs','Apprenants'].map(x=><button key={x} onClick={()=>setRole(x)} className={`chip ${role===x?'active':''}`}>{x}</button>)}</div>
    {error&&<div className="admin-error">{error}</div>}

    <h2>Conversations</h2>
    {loading ? <Card><p style={{padding:18}}>Chargement des conversations...</p></Card> : filteredContacts.length ? <Card>
      {filteredContacts.map((contact)=><Link
        to={`/messages/${contact.id}?name=${encodeURIComponent(contact.full_name||'Contact')}`}
        className="message-row"
        key={contact.id}
      >
        <Avatar src={contact.avatar_url||fallbackAvatar} size="lg"/>
        <div className="grow"><h3>{contact.full_name||'Utilisateur StudyLink'}</h3><p>{contact.lastMessage?.content || (contact.lastMessage?.has_attachment ? '📎 Document envoyé' : 'Commencer la conversation')}</p></div>
        <div>{contact.lastMessage?.created_at&&<span>{new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(contact.lastMessage.created_at))}</span>}{contact.unreadCount>0&&<b className="badge blue">{contact.unreadCount}</b>}</div>
      </Link>)}
    </Card> : <Card><div style={{padding:24,textAlign:'center'}}><b>Aucune conversation trouvée.</b><p style={{marginTop:8,opacity:.65}}>Cherchez un utilisateur ci-dessous et envoyez-lui un message privé.</p></div></Card>}

    <h2 style={{marginTop:24}}>Démarrer une nouvelle conversation</h2>
    <Card>
      {suggestions.length ? suggestions.map((u)=><Link key={u.id} to={`/messages/${u.id}?name=${encodeURIComponent(u.full_name||'Utilisateur')}`} className="message-row">
        <Avatar src={u.avatar_url||fallbackAvatar} size="lg"/>
        <div className="grow"><h3>{u.full_name}</h3><p>{u.role==='tutor'?'Tuteur':'Apprenant'} · {u.email}</p></div>
        <span>Écrire →</span>
      </Link>) : <p style={{padding:18,opacity:.7}}>Aucun autre utilisateur à afficher pour le moment.</p>}
    </Card>
  </div></AppShell>;
}
