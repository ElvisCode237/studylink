import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.login(form);
      login(token, user);
      navigate(location.state?.from || '/search');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">Bon retour parmi nous</h1>
      <p className="mt-2 text-ink/60">Connectez-vous pour retrouver vos tuteurs et réservations.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-4 py-2.5 outline-none transition focus:border-brand-500"
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink/80">Mot de passe</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-black/10 px-4 py-2.5 outline-none transition focus:border-brand-500"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-coral-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>

      <div className="mt-8 rounded-lg bg-brand-50 p-4 text-xs text-ink/60">
        <strong className="text-ink/80">Comptes de démo :</strong>
        <br />
        Tuteur : emily.chen@studylink.com — Élève : student@studylink.com
        <br />
        Mot de passe : password123
      </div>
    </div>
  );
}
