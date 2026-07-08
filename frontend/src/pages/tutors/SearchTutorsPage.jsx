import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShell, PageHeader, Avatar } from '../../components/AppShell.jsx';

const avatars = [
  'https://i.pravatar.cc/160?img=12',
  'https://i.pravatar.cc/160?img=47',
  'https://i.pravatar.cc/160?img=13',
  'https://i.pravatar.cc/160?img=32',
  'https://i.pravatar.cc/160?img=5',
];

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeLabel = (value) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const dayLabel = (date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
const monthDay = (date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(date);

function getTutorId(tutor) {
  return tutor?.tutor_id ?? tutor?.id ?? null;
}

function buildFallbackSlots(seedIndex = 0) {
  const out = [];
  const now = new Date();
  for (let day = 0; day < 7; day += 1) {
    [9, 12, 15, 18].forEach((hour, i) => {
      const start = new Date(now);
      start.setDate(now.getDate() + day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const status = ((day + i + seedIndex) % 5 === 0) ? 'booked' : ((day + i + seedIndex) % 7 === 0 ? 'busy' : 'available');
      out.push({ id: `demo-${seedIndex}-${day}-${hour}`, start_time: start.toISOString(), end_time: end.toISOString(), status, is_demo: true });
    });
  }
  return out;
}

const tutorFallback = [
  { tutor_id: 'demo-marc', user_id: 'demo-user-marc', full_name: 'Marc T.', headline: 'Python · IA · Machine Learning', avg_rating: 4.9, review_count: 284, hourly_rate: 25, years_experience: 5, avatar_url: avatars[0] },
  { tutor_id: 'demo-sophie', user_id: 'demo-user-sophie', full_name: 'Sophie L.', headline: 'Mathématiques · Statistiques', avg_rating: 4.8, review_count: 197, hourly_rate: 20, years_experience: 4, avatar_url: avatars[1] },
  { tutor_id: 'demo-thomas', user_id: 'demo-user-thomas', full_name: 'Thomas D.', headline: 'Java · Spring Boot', avg_rating: 4.7, review_count: 210, hourly_rate: 30, years_experience: 6, avatar_url: avatars[2] },
  { tutor_id: 'demo-amina', user_id: 'demo-user-amina', full_name: 'Amina K.', headline: 'Physique · Mécanique', avg_rating: 4.9, review_count: 189, hourly_rate: 22, years_experience: 5, avatar_url: avatars[3] },
].map((t, index) => ({ ...t, slots: buildFallbackSlots(index), is_demo: true }));

export default function SearchTutorsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [maxPrice, setMaxPrice] = useState(80);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingTutor, setBookingTutor] = useState(null);
  const [bookingSlot, setBookingSlot] = useState('');
  const [objective, setObjective] = useState('');
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');

  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + index);
    return d;
  }), []);

  useEffect(() => {
    api.getSubjects().then((r) => setSubjects(r?.subjects || [])).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      let cancelled = false;
      setLoading(true);
      setError('');
      api.searchTutors({
        search: q,
        subject,
        maxPrice,
        availableOn: availableOnly ? selectedDate : '',
      })
        .then((response) => {
          if (cancelled) return;
          const rows = Array.isArray(response?.tutors) ? response.tutors : [];
          setTutors(rows.length ? rows : tutorFallback);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err?.message || 'Impossible de charger les tuteurs.');
          setTutors(tutorFallback);
        })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, 280);
    return () => clearTimeout(timer);
  }, [q, subject, maxPrice, availableOnly, selectedDate]);

  const visibleTutors = useMemo(() => tutors.filter((tutor) => {
    const id = getTutorId(tutor);
    if (!id) return false;
    if (Number(tutor.hourly_rate || 0) > Number(maxPrice)) return false;
    if (!availableOnly) return true;
    return (tutor.slots || []).some((slot) => dateKey(slot.start_time) === selectedDate && slot.status === 'available');
  }), [tutors, maxPrice, availableOnly, selectedDate]);

  function slotsForDay(tutor, day) {
    return (tutor.slots || []).filter((slot) => dateKey(slot.start_time) === dateKey(day)).slice(0, 4);
  }

  function openBooking(tutor) {
    const daySlots = (tutor.slots || []).filter((slot) => dateKey(slot.start_time) === selectedDate && slot.status === 'available');
    setBookingTutor(tutor);
    setBookingSlot(daySlots[0]?.id || '');
    setBookingMessage('');
  }

  async function confirmBooking() {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!bookingSlot) {
      setBookingMessage('Choisissez un créneau disponible.');
      return;
    }
    if (String(bookingSlot).startsWith('demo-')) {
      setBookingMessage('Ce profil est un exemple visuel. Ajoutez de vraies disponibilités depuis un compte tuteur pour réserver.');
      return;
    }
    setBookingBusy(true);
    setBookingMessage('');
    try {
      await api.createBooking({ slotId: bookingSlot, objective }, token);
      setTutors((current) => current.map((t) => ({
        ...t,
        slots: (t.slots || []).map((s) => s.id === bookingSlot ? { ...s, status: 'booked' } : s),
      })));
      setBookingTutor(null);
      navigate('/bookings');
    } catch (e) {
      setBookingMessage(e.message);
    } finally {
      setBookingBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page tutor-search-v3">
        <PageHeader title="Mentors professionnels" subtitle="Comparez les profils, voyez les disponibilités réelles et réservez immédiatement." back />

        <section className="mentor-search-panel">
          <div className="search-box mentor-search-input">
            <span>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, compétence, matière…" />
            <span>☷</span>
          </div>

          <div className="mentor-filter-grid">
            <label>
              <span>Matière</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">Toutes les matières</option>
                {subjects.map((s) => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
              </select>
            </label>
            <label>
              <span>Tarif maximum</span>
              <div className="price-filter-line"><input type="range" min="10" max="150" step="5" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /><b>{maxPrice} €/h</b></div>
            </label>
            <label className="availability-toggle">
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
              <span>Disponibles le jour choisi</span>
            </label>
          </div>

          <div className="date-strip">
            {week.map((day) => {
              const key = dateKey(day);
              return <button key={key} className={selectedDate === key ? 'active' : ''} onClick={() => setSelectedDate(key)}><small>{dayLabel(day)}</small><b>{day.getDate()}</b><span>{monthDay(day).slice(3)}</span></button>;
            })}
          </div>

          <div className="availability-legend">
            <span><i className="legend-dot available" />Disponible</span>
            <span><i className="legend-dot booked" />Réservé</span>
            <span><i className="legend-dot busy" />Occupé</span>
          </div>
        </section>

        {loading && <div className="info-banner">Chargement des profils et des calendriers…</div>}
        {error && <div className="info-banner">{error} Les profils de découverte restent disponibles.</div>}

        <div className="mentor-results-head"><h2>{visibleTutors.length} mentor{visibleTutors.length > 1 ? 's' : ''}</h2><span>Créneaux sur 7 jours</span></div>

        <div className="mentor-pro-list">
          {visibleTutors.map((tutor, index) => {
            const tutorId = getTutorId(tutor);
            const selectedDaySlots = (tutor.slots || []).filter((slot) => dateKey(slot.start_time) === selectedDate);
            const hasAvailable = selectedDaySlots.some((slot) => slot.status === 'available');
            return (
              <article className="mentor-pro-card" key={tutorId}>
                <div className="mentor-identity-col">
                  <Link to={`/tutors/${encodeURIComponent(tutorId)}`} className="mentor-avatar-link">
                    <Avatar src={tutor.avatar_url || avatars[index % avatars.length]} size="lg" />
                  </Link>
                  <div className="mentor-main-info">
                    <Link to={`/tutors/${encodeURIComponent(tutorId)}`}><h3>{tutor.full_name || 'Tuteur StudyLink'}</h3></Link>
                    <p>{tutor.headline || tutor.subjects?.join(' · ') || 'Expert StudyLink'}</p>
                    <div className="mentor-meta-line"><span>📍 {tutor.city || tutor.country || 'En ligne'}</span><span>🎓 {tutor.years_experience || 0} ans</span></div>
                    <div className="mentor-rating">★ <b>{tutor.avg_rating ?? 0}</b> <span>({tutor.review_count ?? 0} avis)</span></div>
                  </div>
                </div>

                <div className="mentor-week-grid">
                  {week.map((day) => {
                    const daySlots = slotsForDay(tutor, day);
                    return <div className="mentor-day-column" key={dateKey(day)}><header><b>{dayLabel(day)}</b><small>{day.getDate()}</small></header>{daySlots.length ? daySlots.map((slot) => <button key={slot.id} className={`mini-slot ${slot.status}`} disabled={slot.status !== 'available'} onClick={() => { setSelectedDate(dateKey(day)); setBookingTutor(tutor); setBookingSlot(slot.id); setBookingMessage(''); }}>{timeLabel(slot.start_time)}</button>) : <span className="no-slot">—</span>}</div>;
                  })}
                </div>

                <div className="mentor-action-col">
                  <b className="mentor-price">{Number(tutor.hourly_rate || 0).toFixed(2)} €/h</b>
                  <span className={`availability-state ${hasAvailable ? 'yes' : 'no'}`}>{hasAvailable ? '● Disponible' : 'Aucun créneau ce jour'}</span>
                  <button className="primary-btn" onClick={() => openBooking(tutor)} disabled={!hasAvailable}>Réserver</button>
                  <Link className="outline-btn" to={`/tutors/${encodeURIComponent(tutorId)}`}>Voir le profil</Link>
                </div>
              </article>
            );
          })}
        </div>

        {!loading && visibleTutors.length === 0 && <div className="ui-card admin-empty"><h3>Aucun tuteur ne correspond aux filtres.</h3><p>Essayez une autre date, un tarif plus élevé ou retirez le filtre de disponibilité.</p></div>}

        {bookingTutor && (
          <div className="admin-modal-bg" onMouseDown={() => setBookingTutor(null)}>
            <div className="admin-modal mentor-booking-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="admin-modal-head"><div><small>RÉSERVATION DIRECTE</small><h2>Session avec {bookingTutor.full_name}</h2></div><button onClick={() => setBookingTutor(null)}>×</button></div>
              <div className="booking-modal-mentor"><Avatar src={bookingTutor.avatar_url} size="md" /><div><b>{bookingTutor.headline}</b><span>★ {bookingTutor.avg_rating || 0} · {Number(bookingTutor.hourly_rate || 0).toFixed(2)} €/h</span></div></div>
              <label><span>Créneaux disponibles le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</span><div className="booking-slot-grid">{(bookingTutor.slots || []).filter((s) => dateKey(s.start_time) === selectedDate).map((slot) => <button key={slot.id} className={`booking-slot-choice ${slot.status} ${bookingSlot === slot.id ? 'selected' : ''}`} disabled={slot.status !== 'available'} onClick={() => setBookingSlot(slot.id)}><b>{timeLabel(slot.start_time)}</b><small>{slot.status === 'available' ? 'Disponible' : slot.status === 'booked' ? 'Réservé' : 'Occupé'}</small></button>)}</div></label>
              <label><span>Objectif de la session (facultatif)</span><textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex. Réviser un chapitre, corriger un CV, préparer un entretien…" /></label>
              {bookingMessage && <div className="admin-error">{bookingMessage}</div>}
              <button className="primary-btn full" onClick={confirmBooking} disabled={bookingBusy || !bookingSlot}>{bookingBusy ? 'Réservation en cours…' : 'Confirmer la réservation'}</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
