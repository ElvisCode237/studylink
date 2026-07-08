import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, Avatar } from '../../components/AppShell.jsx';

const fallbackAvatar='';
const sizeLabel=(bytes)=>{const n=Number(bytes)||0;if(!n)return'';if(n<1024*1024)return`${Math.round(n/1024)} Ko`;return`${(n/1024/1024).toFixed(2)} Mo`};

export default function ConversationPage() {
  const { id }=useParams();
  const { token,user }=useAuth();
  const nav=useNavigate();
  const location=useLocation();
  const queryName=new URLSearchParams(location.search).get('name')||'Contact';
  const inputRef=useRef(null);
  const [messages,setMessages]=useState([]);
  const [contact,setContact]=useState(null);
  const [text,setText]=useState('');
  const [file,setFile]=useState(null);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [calling,setCalling]=useState(false);

  const load=async()=>{
    if(!token)return;
    try{
      const data=await api.getThread(id,token);
      setMessages(data.messages||[]);
      setContact(data.contact||null);
      api.markThreadRead(id,token).catch(()=>{});
    }catch(e){setError(e.message)}finally{setLoading(false)}
  };

  useEffect(()=>{load()},[id,token]);

  async function submit(e){
    e.preventDefault();
    if((!text.trim()&&!file)||sending)return;
    setSending(true);setError('');
    try{
      const result=await api.sendMessageWithFile({recipientId:id,content:text.trim(),file},token);
      setMessages((prev)=>[...prev,result.message]);
      setText('');setFile(null);
      if(inputRef.current)inputRef.current.value='';
    }catch(e){setError(e.message)}finally{setSending(false)}
  }


  async function startCall(callType='video'){
    if(!token||calling)return;
    setCalling(true);setError('');
    try{
      const data=await api.startCall({calleeId:id,callType},token);
      nav(`/calls/${data.call.id}`);
    }catch(e){
      if(e.message?.includes('déjà en cours')){ setError(e.message); } else setError(e.message);
    }finally{setCalling(false)}
  }

  return <AppShell><div className="page conversation-page">
    <div className="chat-header">
      <button onClick={()=>nav(-1)}>←</button>
      <Avatar src={contact?.avatar_url||fallbackAvatar} name={contact?.full_name||queryName}/>
      <div className="grow">
        <h2>{contact?.full_name||queryName}</h2>
        <p>{contact?.role==='tutor' ? 'Tuteur · Conversation privée' : 'Conversation privée'}</p>
      </div>
      <div className="chat-call-actions"><button title="Appel audio" onClick={()=>startCall('audio')} disabled={calling}>☎</button><button title="Appel vidéo" onClick={()=>startCall('video')} disabled={calling}>📹</button><button>⋮</button></div>
    </div>
    {error&&<div className="admin-error" style={{margin:12}}>{error}</div>}
    <div className="chat-body"><span className="day-pill">Aujourd’hui</span>
      {loading ? <p>Chargement...</p> : messages.map((m)=>{
        const mine=m.sender_id===user?.id;
        return <div key={m.id} className={`bubble ${mine?'outgoing':'incoming'}`}>
          {m.content&&<div>{m.content}</div>}
          {(m.attachments||[]).map((a)=><a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{display:'flex',gap:10,alignItems:'center',marginTop:8,padding:10,border:'1px solid rgba(0,70,200,.18)',borderRadius:10,textDecoration:'none',color:'inherit',background:'rgba(255,255,255,.75)'}}>
            <span style={{fontSize:28}}>📎</span><span><b>{a.file_name}</b><br/><small>{a.mime_type||'Document'}{a.file_size_bytes?` · ${sizeLabel(a.file_size_bytes)}`:''}</small></span>
          </a>)}
          <small>{new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at))}{mine?' ✓✓':''}</small>
        </div>
      })}
    </div>

    {file&&<div style={{margin:'0 12px 8px',padding:'10px 14px',border:'1px solid #cbd9f5',borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f6f9ff'}}><span>📎 <b>{file.name}</b> · {sizeLabel(file.size)}</span><button type="button" onClick={()=>{setFile(null);if(inputRef.current)inputRef.current.value=''}}>Retirer</button></div>}

    <form className="composer" onSubmit={submit}>
      <label title="Joindre un document" style={{cursor:'pointer',fontSize:24}}>📎<input ref={inputRef} type="file" hidden onChange={(e)=>setFile(e.target.files?.[0]||null)} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*,audio/*,video/*"/></label>
      <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Écrire un message..."/>
      <button disabled={sending}>{sending?'…':'➤'}</button>
    </form>
  </div></AppShell>;
}
