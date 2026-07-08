import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TutorCard from '../components/TutorCard.jsx';

export default function SearchTutors() {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    subject: '',
    masteryLevel: '',
    minPrice: 0,
    maxPrice: 300,
  });

  useEffect(() => {
    api.getSubjects().then(({ subjects }) => setSubjects(subjects)).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      api
        .searchTutors(filters)
        .then(({ tutors }) => setTutors(tutors))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300); // debounce léger pour éviter trop d'appels pendant la frappe
    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Trouvez votre tuteur</h1>
        <p className="mt-1 text-ink/60">Filtrez par matière, niveau et budget pour trouver le bon match.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* Barre latérale de filtres, reproduisant la maquette Studylink */}
        <aside className="h-fit rounded-xl2 border border-black/5 bg-white p-5 shadow-card">
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Recherche</label>
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Chercher un tuteur..."
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Matière</label>
            <select
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Toutes les matières</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-semibold text-ink">Niveau</label>
            <select
              value={filters.masteryLevel}
              onChange={(e) => setFilters({ ...filters, masteryLevel: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Tous les niveaux</option>
              <option value="Native Speaker">Native Speaker</option>
              <option value="Master's Degree">Master's Degree</option>
              <option value="5 Years Experience">5 Years Experience</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-semibold text-ink">
              Budget : {filters.minPrice}€ – {filters.maxPrice}€/h
            </label>
            <input
              type="range"
              min="0"
              max="300"
              step="5"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
              className="w-full accent-brand-500"
            />
          </div>
        </aside>

        {/* Résultats */}
        <div>
          {loading && <p className="text-sm text-ink/50">Recherche en cours...</p>}
          {error && <p className="text-sm text-coral-600">{error}</p>}
          {!loading && tutors.length === 0 && (
            <div className="rounded-xl2 border border-dashed border-black/15 p-12 text-center text-ink/50">
              Aucun tuteur ne correspond à ces critères. Essayez d'élargir votre recherche.
            </div>
          )}
          <div className="flex flex-col gap-4">
            {tutors.map((tutor) => (
              <TutorCard key={tutor.tutor_id} tutor={tutor} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
