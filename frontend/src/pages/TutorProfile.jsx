import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CalendarPicker from '../components/CalendarPicker.jsx';

export default function TutorProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTutor(id).then(setData).catch((err) => setError(err.message));
  }, [id]);

  async function handleBook() {
    if (!user) {
      navigate('/login', { state: { from: `/tutors/${id}` } });
      return;
    }
    if (!selectedSlot) return;

    setBooking(true);
    setError('');
    try {
      await api.createBooking({ slotId: selectedSlot.id }, token);
      setMessage('Réservation confirmée ! Retrouvez-la dans "Mes réservations".');
      const refreshed = await api.getTutor(id);
      setData(refreshed);
      setSelectedSlot(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (error && !data) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-coral-600">{error}</div>;
  }
  if (!data) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-ink/50">Chargement du profil...</div>;
  }

  const { tutor, slots, reviews } = data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-6 rounded-xl2 border border-black/5 bg-white p-8 shadow-card sm:flex-row sm:items-center">
        <img
          src={tutor.avatar_url || `https://i.pravatar.cc/150?u=${tutor.tutor_id}`}
          alt={tutor.full_name}
          className="h-24 w-24 rounded-full object-cover"
        />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-ink">{tutor.full_name}</h1>
          <p className="text-ink/60">{tutor.headline}</p>
          <p className="mt-1 text-sm text-ink/50">
            {tutor.subjects.join(', ')} · {tutor.mastery_level} · {tutor.years_experience} ans d'expérience
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-coral-500">★ {tutor.avg_rating || '—'}</span>
            <span className="text-ink/50">({tutor.review_count} avis)</span>
          </div>
        </div>
        <div className="rounded-xl bg-brand-500 px-6 py-4 text-center text-white shadow-card">
          <p className="text-2xl font-bold">{tutor.hourly_rate}€</p>
          <p className="text-xs opacity-80">par heure</p>
        </div>
      </div>

      {tutor.bio && (
        <div className="mt-6 rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">À propos</h2>
          <p className="text-sm leading-relaxed text-ink/70">{tutor.bio}</p>
        </div>
      )}

      <div className="mt-6 rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Choisissez un créneau</h2>
        <CalendarPicker slots={slots} onSelect={setSelectedSlot} />

        {selectedSlot && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-lg bg-brand-50 p-4 sm:flex-row">
            <p className="text-sm text-ink/80">
              Créneau sélectionné :{' '}
              <strong>
                {new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(selectedSlot.start_time))}
              </strong>
            </p>
            <button
              onClick={handleBook}
              disabled={booking}
              className="w-full rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
            >
              {booking ? 'Réservation...' : 'Confirmer la réservation'}
            </button>
          </div>
        )}

        {message && <p className="mt-4 text-sm text-mint-500">{message}</p>}
        {error && <p className="mt-4 text-sm text-coral-600">{error}</p>}
      </div>

      {reviews.length > 0 && (
        <div className="mt-6 rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Avis des élèves</h2>
          <div className="flex flex-col gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="border-b border-black/5 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{r.student_name}</span>
                  <span className="text-coral-500 text-sm">{'★'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-ink/60">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
