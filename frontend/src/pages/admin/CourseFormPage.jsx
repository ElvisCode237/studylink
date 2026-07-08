import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AdminHeader } from './AdminLayout.jsx';

const initial = {
  title: '', category_id: '', short_description: '', description: '', cover_url: '',
  level: 'beginner', language: 'fr', estimated_minutes: 0, price: 0, is_free: true,
  status: 'draft', content_type: 'course', objectives: [], prerequisites: []
};

function FilePicker({ label, file, accept, onChange, hint }) {
  return (
    <label className="admin-file-picker">
      <span>{label}</span>
      <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div className="admin-file-box">
        <b>{file ? file.name : 'Choisir un fichier'}</b>
        <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} Mo` : hint}</small>
      </div>
    </label>
  );
}

export default function CourseFormPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState(initial);
  const [cats, setCats] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [courseFile, setCourseFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.adminCategories(token).then((x) => setCats(x.categories || [])).catch((e) => setErr(e.message));
    if (id) {
      api.adminList('courses', token).then((x) => {
        const c = (x.courses || []).find((v) => v.id === id);
        if (c) setF({ ...initial, ...c, category_id: c.category_id || '', objectives: c.objectives || [], prerequisites: c.prerequisites || [] });
      }).catch((e) => setErr(e.message));
    }
  }, [id, token]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const payload = {
        ...f,
        objectives: typeof f.objectives === 'string' ? f.objectives.split('\n').filter(Boolean) : f.objectives,
        prerequisites: typeof f.prerequisites === 'string' ? f.prerequisites.split('\n').filter(Boolean) : f.prerequisites,
      };

      if (coverFile) {
        const uploaded = await api.adminUpload('course-cover', coverFile, token);
        payload.cover_url = uploaded.upload.url;
      }

      const result = id
        ? await api.adminUpdateCourse(id, payload, token)
        : await api.adminCreate('courses', payload, token);

      const courseId = result.course.id;

      if (courseFile) {
        const uploaded = await api.adminUpload('course-file', courseFile, token);
        await api.adminAddCourseFile(courseId, {
          title: courseFile.name,
          file_url: uploaded.upload.url,
          file_name: uploaded.upload.file_name,
          mime_type: uploaded.upload.mime_type,
          file_size: uploaded.upload.size,
        }, token);
      }

      nav(`/admin/courses/${courseId}/structure`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AdminHeader title={id ? 'Modifier le cours' : 'Nouveau cours'} subtitle="Créez un parcours pédagogique complet" />
      <form className="admin-form admin-panel" onSubmit={submit}>
        {err && <div className="admin-error">{err}</div>}

        <div className="admin-upload-grid">
          <FilePicker
            label="Image de couverture"
            file={coverFile}
            accept="image/png,image/jpeg,image/webp"
            onChange={setCoverFile}
            hint="PNG, JPG ou WebP"
          />
          <FilePicker
            label="Fichier principal du cours (facultatif)"
            file={courseFile}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.mp3,.mp4,application/pdf,video/*,audio/*"
            onChange={setCourseFile}
            hint="PDF, Word, PowerPoint, ZIP, audio ou vidéo — max. 50 Mo"
          />
        </div>

        <div className="admin-form-grid">
          <label>Titre<input value={f.title} onChange={(e) => set('title', e.target.value)} required /></label>
          <label>Catégorie<select value={f.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Sans catégorie</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.universe}</option>)}</select></label>
          <label>Type<select value={f.content_type} onChange={(e) => set('content_type', e.target.value)}><option value="course">Cours</option><option value="career_path">Parcours carrière</option><option value="personal_program">Développement personnel</option><option value="entrepreneur_path">Entrepreneuriat</option></select></label>
          <label>Niveau<select value={f.level} onChange={(e) => set('level', e.target.value)}><option value="beginner">Débutant</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancé</option><option value="all">Tous niveaux</option></select></label>
          <label>Langue<input value={f.language} onChange={(e) => set('language', e.target.value)} /></label>
          <label>Durée estimée (minutes)<input type="number" value={f.estimated_minutes} onChange={(e) => set('estimated_minutes', e.target.value)} /></label>
          <label>Prix<input type="number" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} /></label>
          <label>Statut<select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="draft">Brouillon</option><option value="review">En validation</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label>
        </div>

        {f.cover_url && !coverFile && <div className="admin-current-file"><span>Couverture actuelle</span><img src={f.cover_url} alt="Couverture actuelle" /></div>}
        <label>Résumé<input value={f.short_description || ''} onChange={(e) => set('short_description', e.target.value)} /></label>
        <label>Description<textarea rows="6" value={f.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="admin-form-grid">
          <label>Objectifs (1 par ligne)<textarea rows="5" value={Array.isArray(f.objectives) ? f.objectives.join('\n') : f.objectives} onChange={(e) => set('objectives', e.target.value)} /></label>
          <label>Prérequis (1 par ligne)<textarea rows="5" value={Array.isArray(f.prerequisites) ? f.prerequisites.join('\n') : f.prerequisites} onChange={(e) => set('prerequisites', e.target.value)} /></label>
        </div>
        <label className="admin-check"><input type="checkbox" checked={f.is_free} onChange={(e) => set('is_free', e.target.checked)} /> Cours gratuit</label>
        <div className="admin-upload-note">Les fichiers sélectionnés sont envoyés dans Supabase Storage et leurs références sont enregistrées dans PostgreSQL.</div>
        <div className="admin-actions">
          <button className="admin-btn primary" disabled={busy}>{busy ? 'Envoi et enregistrement...' : 'Enregistrer et structurer le cours'}</button>
          <button type="button" className="admin-btn" onClick={() => nav('/admin/courses')} disabled={busy}>Annuler</button>
        </div>
      </form>
    </>
  );
}
