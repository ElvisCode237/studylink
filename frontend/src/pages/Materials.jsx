import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function Materials() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [form, setForm] = useState({ fileName: '', fileUrl: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    api
      .myBookings(token)
      .then(({ bookings }) => {
        // On ne garde que les sessions confirmées ou terminées (pas les annulées)
        const relevant = bookings.filter((b) => b.status !== 'cancelled');
        setBookings(relevant);
        if (relevant.length > 0) setSelectedId(relevant[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingBookings(false));
  }, [token]);

  function loadMaterials(bookingId) {
    setLoadingMaterials(true);
    api
      .getMaterials(bookingId, token)
      .then(({ materials }) => setMaterials(materials))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingMaterials(false));
  }

  useEffect(() => {
    if (selectedId) loadMaterials(selectedId);
  }, [selectedId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.fileName.trim() || !form.fileUrl.trim()) return;
    setError('');
    try {
      await api.addMaterial({ bookingId: selectedId, ...form }, token);
      setForm({ fileName: '', fileUrl: '' });
      loadMaterials(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteMaterial(id, token);
      loadMaterials(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-ink/60">Connectez-vous pour accéder au matériel de vos sessions.</p>
        <Link to="/login" className="mt-4 inline-block text-brand-600 hover:underline">
          Se connecter
        </Link>
      </div>
    );
  }

  const selectedBooking = bookings.find((b) => b.id === selectedId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Matériel de session</h1>
      <p className="mt-1 text-ink/60">
        Documents et liens partagés entre vous et {user.role === 'tutor' ? 'vos élèves' : 'vos tuteurs'}.
      </p>

      {error && <p className="mt-4 text-sm text-coral-600">{error}</p>}

      {loadingBookings ? (
        <p className="mt-8 text-sm text-ink/50">Chargement...</p>
      ) : bookings.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-black/15 p-12 text-center text-ink/50">
          Aucune session pour l'instant — le matériel apparaît ici une fois qu'une réservation est faite.
          <br />
          <Link to="/search" className="mt-2 inline-block text-brand-600 hover:underline">
            Trouver un tuteur
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Liste des sessions */}
          <aside className="h-fit rounded-xl2 border border-black/5 bg-white p-3 shadow-card">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-ink/40">
              Vos sessions
            </p>
            <div className="flex flex-col gap-1">
              {bookings.map((b) => {
                const name = user.role === 'tutor' ? b.student_name : b.tutor_name;
                const active = b.id === selectedId;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-ink/70 hover:bg-black/5'
                    }`}
                  >
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-ink/50">{dateFormatter.format(new Date(b.start_time))}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Matériel de la session sélectionnée */}
          <div className="rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
            {selectedBooking && (
              <div className="mb-5 flex items-center justify-between border-b border-black/5 pb-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {user.role === 'tutor' ? selectedBooking.student_name : selectedBooking.tutor_name}
                    {selectedBooking.subject_name && (
                      <span className="text-ink/50"> · {selectedBooking.subject_name}</span>
                    )}
                  </h2>
                  <p className="text-sm text-ink/50">
                    {dateFormatter.format(new Date(selectedBooking.start_time))}
                  </p>
                </div>
                <Link
                  to={`/session/${selectedBooking.id}`}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                >
                  Rejoindre la session
                </Link>
              </div>
            )}

            {loadingMaterials ? (
              <p className="text-sm text-ink/50">Chargement du matériel...</p>
            ) : materials.length === 0 ? (
              <p className="rounded-lg bg-black/[0.03] p-6 text-center text-sm text-ink/50">
                Aucun document partagé pour cette session pour l'instant.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium text-brand-600 hover:underline"
                      >
                        {m.file_name}
                      </a>
                      <p className="text-xs text-ink/40">
                        Ajouté par {m.uploaded_by_name} ·{' '}
                        {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
                          new Date(m.created_at)
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="shrink-0 text-xs text-ink/40 transition hover:text-coral-600"
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-3 border-t border-black/5 pt-5 sm:flex-row">
              <input
                value={form.fileName}
                onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                placeholder="Nom du document (ex : Fiche d'exercices)"
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="Lien (Google Drive, PDF...)"
                className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <button className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                Ajouter
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
