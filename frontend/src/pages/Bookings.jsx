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

const statusLabels = {
  confirmed: { label: 'Confirmée', className: 'bg-mint-400/15 text-mint-500' },
  cancelled: { label: 'Annulée', className: 'bg-coral-500/15 text-coral-600' },
  completed: { label: 'Terminée', className: 'bg-brand-500/15 text-brand-600' },
};

export default function Bookings() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function refresh() {
    setLoading(true);
    api
      .myBookings(token)
      .then(({ bookings }) => setBookings(bookings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) refresh();
  }, [token]);

  async function handleCancel(id) {
    try {
      await api.cancelBooking(id, token);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-ink/60">Connectez-vous pour voir vos réservations.</p>
        <Link to="/login" className="mt-4 inline-block text-brand-600 hover:underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Mes réservations</h1>
      <p className="mt-1 text-ink/60">
        {user.role === 'tutor' ? 'Vos sessions avec vos élèves.' : 'Vos sessions avec vos tuteurs.'}
      </p>

      {loading && <p className="mt-8 text-sm text-ink/50">Chargement...</p>}
      {error && <p className="mt-8 text-sm text-coral-600">{error}</p>}

      {!loading && bookings.length === 0 && (
        <div className="mt-8 rounded-xl2 border border-dashed border-black/15 p-12 text-center text-ink/50">
          Aucune réservation pour l'instant.
          <br />
          <Link to="/search" className="mt-2 inline-block text-brand-600 hover:underline">
            Trouver un tuteur
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {bookings.map((b) => {
          const isPast = new Date(b.end_time) < new Date();
          const status = statusLabels[b.status] || statusLabels.confirmed;
          return (
            <div
              key={b.id}
              className="flex flex-col items-start justify-between gap-3 rounded-xl2 border border-black/5 bg-white p-5 shadow-card sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-medium text-ink">
                  {user.role === 'tutor' ? b.student_name : b.tutor_name}
                  {b.subject_name && <span className="text-ink/50"> · {b.subject_name}</span>}
                </p>
                <p className="text-sm text-ink/60">{dateFormatter.format(new Date(b.start_time))}</p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
                <span className="text-sm font-semibold text-ink">{b.price}€</span>

                <Link
                  to="/materials"
                  className="rounded-lg border border-black/10 px-4 py-2 text-xs font-medium text-ink/70 transition hover:bg-black/5"
                >
                  Matériel
                </Link>

                {b.status === 'confirmed' && !isPast && (
                  <>
                    <Link
                      to={`/session/${b.id}`}
                      className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      Rejoindre
                    </Link>
                    {user.role === 'student' && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        className="rounded-lg border border-black/10 px-4 py-2 text-xs font-medium text-ink/70 transition hover:bg-black/5"
                      >
                        Annuler
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
