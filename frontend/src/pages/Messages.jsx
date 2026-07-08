import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export default function Messages() {
  const { user, token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  function loadContacts() {
    return api
      .getContacts(token)
      .then(({ contacts }) => {
        setContacts(contacts);
        return contacts;
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    if (!token) return;
    loadContacts().then((contacts) => {
      setLoadingContacts(false);
      if (contacts && contacts.length > 0) setSelected(contacts[0]);
    });
  }, [token]);

  function loadThread(contact) {
    setLoadingThread(true);
    api
      .getThread(contact.id, token)
      .then(({ messages }) => setThread(messages))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingThread(false));
    api.markThreadRead(contact.id, token).then(() => loadContacts());
  }

  useEffect(() => {
    if (selected) loadThread(selected);
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selected) return;
    setError('');
    try {
      await api.sendMessage({ recipientId: selected.id, content: draft.trim() }, token);
      setDraft('');
      loadThread(selected);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-ink/60">Connectez-vous pour accéder à votre messagerie.</p>
        <Link to="/login" className="mt-4 inline-block text-brand-600 hover:underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Messagerie</h1>
      <p className="mt-1 text-ink/60">
        Discutez avec {user.role === 'tutor' ? 'vos élèves' : 'vos tuteurs'} — disponible dès qu'une
        session est réservée ensemble.
      </p>

      {error && <p className="mt-4 text-sm text-coral-600">{error}</p>}

      {loadingContacts ? (
        <p className="mt-8 text-sm text-ink/50">Chargement...</p>
      ) : contacts.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-black/15 p-12 text-center text-ink/50">
          Aucun contact pour l'instant — la messagerie s'active dès qu'une réservation est faite.
          <br />
          <Link to="/search" className="mt-2 inline-block text-brand-600 hover:underline">
            Trouver un tuteur
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]" style={{ height: '65vh' }}>
          {/* Liste des contacts */}
          <aside className="overflow-y-auto rounded-xl2 border border-black/5 bg-white p-3 shadow-card">
            <div className="flex flex-col gap-1">
              {contacts.map((c) => {
                const active = c.id === selected?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? 'bg-brand-50' : 'hover:bg-black/5'
                    }`}
                  >
                    <img
                      src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.full_name}`}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.full_name}</p>
                      <p className="truncate text-xs text-ink/50">
                        {c.lastMessage ? c.lastMessage.content : 'Aucun message'}
                      </p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-coral-500 px-1.5 text-[11px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Fil de discussion */}
          <div className="flex flex-col rounded-xl2 border border-black/5 bg-white shadow-card">
            {selected && (
              <div className="flex items-center gap-3 border-b border-black/5 px-5 py-4">
                <img
                  src={
                    selected.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${selected.full_name}`
                  }
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
                <p className="font-display font-semibold text-ink">{selected.full_name}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingThread ? (
                <p className="text-sm text-ink/50">Chargement...</p>
              ) : thread.length === 0 ? (
                <p className="mt-8 text-center text-sm text-ink/40">
                  Aucun message pour l'instant. Dites bonjour !
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {thread.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            mine ? 'bg-brand-500 text-white' : 'bg-black/5 text-ink'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-ink/40'}`}>
                            {dateFormatter.format(new Date(m.created_at))} ·{' '}
                            {timeFormatter.format(new Date(m.created_at))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {selected && (
              <form onSubmit={handleSend} className="flex gap-2 border-t border-black/5 p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrivez un message..."
                  className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                  Envoyer
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
