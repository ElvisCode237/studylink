import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { AppShell, PageHeader, Card, Avatar } from '../../components/AppShell.jsx';

const demoTutors = {
  'demo-marc': {
    tutor_id: 'demo-marc', user_id: 'demo-user-marc', full_name: 'Marc T.', avatar_url: 'https://i.pravatar.cc/160?img=12',
    headline: 'Python · IA · Machine Learning', bio: 'Ingénieur en IA et développeur Python passionné.', hourly_rate: 25,
    years_experience: 5, mastery_level: 'Avancé', subjects: ['Python', 'Machine Learning', 'IA'], avg_rating: 4.9, review_count: 284,
  },
  'demo-sophie': {
    tutor_id: 'demo-sophie', user_id: 'demo-user-sophie', full_name: 'Sophie L.', avatar_url: 'https://i.pravatar.cc/160?img=47',
    headline: 'Mathématiques', bio: 'Tutrice en mathématiques, spécialisée dans l’algèbre, l’analyse et les statistiques.', hourly_rate: 20,
    years_experience: 4, mastery_level: 'Avancé', subjects: ['Mathématiques', 'Algèbre', 'Statistiques'], avg_rating: 4.8, review_count: 197,
  },
  'demo-thomas': {
    tutor_id: 'demo-thomas', user_id: 'demo-user-thomas', full_name: 'Thomas D.', avatar_url: 'https://i.pravatar.cc/160?img=13',
    headline: 'Java · Spring Boot', bio: 'Développeur backend et mentor Java/Spring Boot.', hourly_rate: 30,
    years_experience: 6, mastery_level: 'Expert', subjects: ['Java', 'Spring Boot', 'Backend'], avg_rating: 4.7, review_count: 210,
  },
  'demo-amina': {
    tutor_id: 'demo-amina', user_id: 'demo-user-amina', full_name: 'Amina K.', avatar_url: 'https://i.pravatar.cc/160?img=32',
    headline: 'Physique · Mécanique', bio: 'Enseignante en physique et mécanique, avec une pédagogie orientée résolution de problèmes.', hourly_rate: 22,
    years_experience: 5, mastery_level: 'Avancé', subjects: ['Physique', 'Mécanique'], avg_rating: 4.9, review_count: 189,
  },
};

export default function TutorProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);

    if (!id || id === 'undefined' || id === 'null') {
      setError('Identifiant du tuteur invalide. Retournez à la liste et choisissez un profil.');
      setLoading(false);
      return () => { cancelled = true; };
    }

    if (demoTutors[id]) {
      setData({ tutor: demoTutors[id], slots: [], reviews: [] });
      setLoading(false);
      return () => { cancelled = true; };
    }

    api.getTutor(id)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Impossible de charger ce profil de tuteur.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  const tutor = data?.tutor;
  const slots = data?.slots || [];
  const reviews = data?.reviews || [];

  const specialties = useMemo(() => {
    if (!tutor) return [];
    return Array.isArray(tutor.subjects) && tutor.subjects.length
      ? tutor.subjects
      : (tutor.headline ? tutor.headline.split(/[·,]/).map((s) => s.trim()).filter(Boolean) : []);
  }, [tutor]);

  if (loading) {
    return <AppShell><div className="page"><PageHeader title="Profil d’un tuteur" back/><div className="info-banner">Chargement du profil…</div></div></AppShell>;
  }

  if (error || !tutor) {
    return (
      <AppShell>
        <div className="page">
          <PageHeader title="Profil d’un tuteur" back />
          <Card>
            <h2>Profil indisponible</h2>
            <p>{error || 'Ce tuteur est introuvable.'}</p>
            <Link className="primary-btn" to="/tutors">Retour à la liste des tuteurs</Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const contactUserId = tutor.user_id;
  const tutorId = tutor.tutor_id ?? id;

  return (
    <AppShell>
      <div className="page">
        <PageHeader title="Profil d’un tuteur" back />

        <div className="profile-hero">
          <Avatar
            src={tutor.avatar_url || `https://i.pravatar.cc/160?u=${encodeURIComponent(tutorId)}`}
            size="xl"
          />
          <h1>{tutor.full_name}</h1>
          <p>{tutor.headline || specialties.join(' · ') || 'Tuteur StudyLink'}</p>
          <div className="rating-line">
            ★ {tutor.avg_rating ?? '—'}
            <span>({tutor.review_count ?? 0} avis)</span>
            <b>{Number(tutor.hourly_rate ?? 0).toFixed(2)}€/h</b>
          </div>
        </div>

        <div className="metric-row">
          <span>🎓 {tutor.years_experience ?? 0} ans d’expérience</span>
          <span>📚 {specialties.length} spécialité{specialties.length > 1 ? 's' : ''}</span>
          <span>📈 {tutor.mastery_level || 'Niveau non renseigné'}</span>
        </div>

        <div className="tabs">
          <button type="button" className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>À propos</button>
          <button type="button" className={activeTab === 'availability' ? 'active' : ''} onClick={() => setActiveTab('availability')}>Disponibilités</button>
          <button type="button" className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Avis ({reviews.length})</button>
        </div>

        {activeTab === 'about' && (
          <Card>
            <p>{tutor.bio || `${tutor.full_name} accompagne les apprenants sur StudyLink avec un parcours personnalisé.`}</p>
            <div className="detail-list">
              <p><b>Spécialités</b><br/>{specialties.length ? specialties.join(', ') : 'Non renseignées'}</p>
              <p><b>Niveau d’expertise</b><br/>{tutor.mastery_level || 'Non renseigné'}</p>
              <p><b>Expérience</b><br/>{tutor.years_experience ?? 0} ans</p>
            </div>
          </Card>
        )}

        {activeTab === 'availability' && (
          <Card>
            <h3>Créneaux disponibles</h3>
            {slots.length === 0 ? (
              <p>Aucun créneau public disponible pour le moment.</p>
            ) : (
              <div className="stack">
                {slots.map((slot) => (
                  <div className="info-banner" key={slot.id}>
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(slot.start_time))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'reviews' && (
          <Card>
            <h3>Avis des apprenants</h3>
            {reviews.length === 0 ? (
              <p>Aucun avis pour le moment.</p>
            ) : reviews.map((review, index) => (
              <div className="detail-list" key={`${review.student_name}-${index}`}>
                <p><b>{review.student_name}</b> · ★ {review.rating}<br/>{review.comment || 'Sans commentaire'}</p>
              </div>
            ))}
          </Card>
        )}

        <div className="dual-actions">
          {contactUserId ? (
            <Link className="outline-btn" to={`/messages/${encodeURIComponent(contactUserId)}?name=${encodeURIComponent(tutor.full_name)}`}>Contacter</Link>
          ) : (
            <span className="outline-btn" aria-disabled="true">Messagerie indisponible</span>
          )}
          <Link className="primary-btn" to={`/reserve/${encodeURIComponent(tutorId)}`}>Réserver</Link>
        </div>
      </div>
    </AppShell>
  );
}
