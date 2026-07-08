import { Link } from 'react-router-dom';

function Stars({ rating }) {
  const full = Math.round(rating);
  return (
    <span className="text-coral-500" aria-label={`Note : ${rating} sur 5`}>
      {'★'.repeat(full)}
      <span className="text-black/15">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export default function TutorCard({ tutor }) {
  return (
    <Link
      to={`/tutors/${tutor.tutor_id}`}
      className="group flex items-center gap-5 rounded-xl2 border border-black/5 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <img
        src={tutor.avatar_url || `https://i.pravatar.cc/150?u=${tutor.tutor_id}`}
        alt={tutor.full_name}
        className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-semibold text-ink group-hover:text-brand-600">
          {tutor.full_name}
        </h3>
        <p className="truncate text-sm text-ink/60">
          {tutor.subjects?.join(', ') || 'Matière non renseignée'}
        </p>
        <p className="text-sm text-ink/50">{tutor.headline}</p>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <span className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-card transition group-hover:bg-brand-600">
          {tutor.hourly_rate}€/h
        </span>
        <div className="flex items-center gap-1 text-sm">
          <Stars rating={Number(tutor.avg_rating)} />
          <span className="text-ink/50">({tutor.review_count})</span>
        </div>
      </div>
    </Link>
  );
}
