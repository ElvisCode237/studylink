import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AdminHeader, Status } from './AdminLayout.jsx';

export default function AdminCoursesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedingAll, setSeedingAll] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => api.adminList('courses', token)
    .then((x) => setItems(x.courses || []))
    .catch((e) => setErr(e.message));

  useEffect(load, [token]);

  async function del(id) {
    if (!confirm('Supprimer ce cours et tout son contenu ?')) return;
    await api.adminDelete('courses', id, token);
    load();
  }

  async function changeStatus(id, status) {
    setBusyId(id);
    setErr('');
    try {
      await api.adminSetCourseStatus(id, status, token);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId('');
    }
  }

  async function installPythonCourse() {
    setSeeding(true); setErr(''); setSuccess('');
    try {
      const result = await api.adminSeedPythonCourse(token);
      setSuccess(`Cours « ${result.course?.title || 'Python pour débutants'} » installé : ${result.course?.module_count || 6} modules et ${result.course?.lesson_count || 18} leçons.`);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setSeeding(false); }
  }


  async function installFullCatalogue() {
    setSeedingAll(true); setErr(''); setSuccess('');
    try {
      const result = await api.adminSeedFullCatalogue(token);
      const summary = result.summary || {};
      setSuccess(`Catalogue complet installé : ${summary.course_count || 32} cours, ${summary.module_count || 160} modules et ${summary.lesson_count || 640} leçons.`);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setSeedingAll(false); }
  }

  const filtered = items.filter((x) => x.title.toLowerCase().includes(q.toLowerCase()));

  return <>
    <AdminHeader
      title="Cours"
      subtitle="Créez, structurez et publiez vos formations"
      action={<div className="admin-header-actions"><button className="admin-btn secondary" onClick={installFullCatalogue} disabled={seedingAll}>{seedingAll ? 'Installation du catalogue...' : '⚡ Installer les 32 formations complètes'}</button><button className="admin-btn secondary" onClick={installPythonCourse} disabled={seeding}>{seeding ? 'Installation...' : 'Python complet'}</button><Link className="admin-btn primary" to="/admin/courses/new">＋ Nouveau cours</Link></div>}
    />

    <div className="admin-toolbar">
      <input placeholder="Rechercher un cours..." value={q} onChange={(e) => setQ(e.target.value)} />
    </div>

    {err && <div className="admin-error">{err}</div>}
    {success && <div className="admin-success">✓ {success}</div>}

    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr><th>Cours</th><th>Catégorie</th><th>Modules</th><th>Statut</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filtered.map((c) => <tr key={c.id}>
            <td><b>{c.title}</b><small>{c.short_description}</small></td>
            <td>{c.category_name || '—'}</td>
            <td>{c.module_count}</td>
            <td><Status value={c.status} /></td>
            <td className="admin-row-actions">
              <Link to={`/admin/courses/${c.id}/structure`}>Structurer</Link>
              <Link to={`/admin/courses/${c.id}/edit`}>Modifier</Link>
              {c.status === 'published' ? (
                <button disabled={busyId === c.id} onClick={() => changeStatus(c.id, 'draft')}>Dépublier</button>
              ) : (
                <button disabled={busyId === c.id} onClick={() => changeStatus(c.id, 'published')} style={{ color: '#087c35' }}>
                  {busyId === c.id ? 'Publication...' : 'Publier'}
                </button>
              )}
              <button onClick={() => del(c.id)}>Supprimer</button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {!filtered.length && <div className="admin-empty">Aucun cours pour le moment.</div>}
    </div>

    <div className="admin-upload-note" style={{ marginTop: 16 }}>
      <b>Installation rapide :</b> le bouton « Installer les 32 formations complètes » crée ou met à jour l’ensemble du catalogue avec 5 modules et 20 leçons par cours, soit 640 leçons suivables de bout en bout. Le bouton Python reste disponible pour réinstaller uniquement ce parcours. Un cours en <b>Brouillon</b> reste invisible pour le public ; cliquez sur <b>Publier</b> pour l’afficher.
    </div>
  </>;
}
