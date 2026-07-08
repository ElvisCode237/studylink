import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-4 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
          Cours particuliers en ligne
        </p>
        <h1 className="font-display text-5xl font-semibold leading-tight text-ink sm:text-6xl">
          Le bon tuteur,
          <br />
          au bon moment.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink/60">
          Trouvez un tuteur qualifié, réservez un créneau en quelques clics et démarrez votre
          session en visio directement sur Studylink.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/search"
            className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600"
          >
            Trouver un tuteur
          </Link>
          <Link
            to="/register"
            className="rounded-lg border border-black/10 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-black/5"
          >
            Devenir tuteur
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          { title: 'Recherchez', desc: 'Filtrez par matière, niveau et budget pour trouver le bon tuteur.', color: 'bg-brand-500' },
          { title: 'Réservez', desc: 'Choisissez un créneau disponible dans un agenda clair et en temps réel.', color: 'bg-mint-500' },
          { title: 'Apprenez', desc: 'Rejoignez votre session en visio avec chat et partage d\'écran intégrés.', color: 'bg-coral-500' },
        ].map((step, i) => (
          <div key={step.title} className="rounded-xl2 border border-black/5 bg-white p-6 shadow-card">
            <span className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${step.color} text-sm font-semibold text-white`}>
              {i + 1}
            </span>
            <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
            <p className="mt-1 text-sm text-ink/60">{step.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
