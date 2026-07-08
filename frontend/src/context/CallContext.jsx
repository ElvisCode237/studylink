import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState(null);
  const [busy, setBusy] = useState(false);
  const hiddenRef = useRef(false);

  useEffect(() => {
    hiddenRef.current = document.hidden;
    const onVis = () => { hiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!token || !user) { setIncoming(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await api.getIncomingCall(token);
        if (!cancelled) setIncoming(data.call || null);
      } catch {
        if (!cancelled) setIncoming(null);
      }
    };
    poll();
    const timer = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [token, user?.id]);

  async function accept() {
    if (!incoming || busy) return;
    setBusy(true);
    try {
      await api.acceptCall(incoming.id, token);
      const id = incoming.id;
      setIncoming(null);
      navigate(`/calls/${id}`);
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!incoming || busy) return;
    setBusy(true);
    try { await api.rejectCall(incoming.id, token); setIncoming(null); }
    finally { setBusy(false); }
  }

  return <CallContext.Provider value={{ incoming, accept, reject }}>
    {children}
    {incoming && <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <img src={incoming.caller_avatar || 'https://i.pravatar.cc/160?img=12'} alt=""/>
        <div className="incoming-call-copy">
          <span>Appel {incoming.call_type === 'audio' ? 'audio' : 'vidéo'} entrant</span>
          <h3>{incoming.caller_name || 'Utilisateur StudyLink'}</h3>
          <p>vous appelle…</p>
        </div>
        <div className="incoming-call-actions">
          <button className="call-reject" onClick={reject} disabled={busy}>✕ Refuser</button>
          <button className="call-accept" onClick={accept} disabled={busy}>✓ Accepter</button>
        </div>
      </div>
    </div>}
  </CallContext.Provider>;
}

export function useCalls() { return useContext(CallContext); }
