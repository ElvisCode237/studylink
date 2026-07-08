import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// Interface de visioconférence "maquette" — reproduit fidèlement l'écran fourni.
// Note : ceci est une interface fonctionnelle (mute/caméra/chat toggles) mais sans
// vrai flux vidéo WebRTC. Voir le README pour l'intégrer avec Twilio/Daily/LiveKit.
export default function Session() {
  const { id } = useParams();
  const { user } = useAuth();
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { author: 'Dr. Emily Chen', text: 'Bienvenue, commençons par réviser les dérivées.' },
  ]);
  const [draft, setDraft] = useState('');

  const participants = [
    { name: user?.full_name || 'Vous', you: true },
    { name: 'Dr. Emily Chen', you: false },
  ];

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((m) => [...m, { author: user?.full_name || 'Vous', text: draft }]);
    setDraft('');
  }

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-6xl flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between rounded-xl2 bg-ink px-5 py-3 text-white">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mint-400" />
          Session en cours — Réservation #{id}
        </div>
        <Link to="/bookings" className="text-xs text-white/70 hover:text-white">
          Quitter la session
        </Link>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {participants.map((p) => (
            <div
              key={p.name}
              className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl2 bg-slate-950"
            >
              {p.you && videoOff ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-semibold text-white">
                  {p.name.charAt(0)}
                </div>
              ) : (
                <img
                  src={`https://i.pravatar.cc/400?u=${p.name}`}
                  alt={p.name}
                  className="h-full w-full object-cover opacity-90"
                />
              )}
              <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                {p.name} {p.you && '(vous)'}
              </span>
            </div>
          ))}
        </div>

        {chatOpen && (
          <div className="flex w-72 flex-col rounded-xl2 border border-black/5 bg-white shadow-card">
            <div className="border-b border-black/5 p-4 font-medium text-ink">Chat</div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-ink">{m.author}: </span>
                  <span className="text-ink/70">{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t border-black/5 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message..."
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm text-white">Envoyer</button>
            </form>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 rounded-xl2 border border-black/5 bg-white p-4 shadow-card">
        <button
          onClick={() => setMuted((m) => !m)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            muted ? 'bg-coral-500 text-white' : 'bg-black/5 text-ink hover:bg-black/10'
          }`}
        >
          {muted ? 'Micro coupé' : 'Muet'}
        </button>
        <button
          onClick={() => setVideoOff((v) => !v)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            videoOff ? 'bg-coral-500 text-white' : 'bg-black/5 text-ink hover:bg-black/10'
          }`}
        >
          {videoOff ? 'Caméra coupée' : 'Caméra'}
        </button>
        <button
          onClick={() => setChatOpen((c) => !c)}
          className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/10"
        >
          Chat
        </button>
        <button className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/10">
          Partager l'écran
        </button>
        <Link
          to="/materials"
          className="rounded-lg bg-black/5 px-4 py-2 text-sm font-medium text-ink transition hover:bg-black/10"
        >
          Matériel
        </Link>
        <Link
          to="/bookings"
          className="rounded-lg bg-coral-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Terminer l'appel
        </Link>
      </div>
    </div>
  );
}
