import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AdminHeader } from './AdminLayout.jsx';

const emptyLesson = { moduleId: '', title: '', lesson_type: 'youtube', youtube_url: '', content: '', media_url: '', duration_seconds: 0, is_preview: false };

export default function CourseStructurePage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState({ modules: [] });
  const [files, setFiles] = useState([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [lesson, setLesson] = useState(emptyLesson);
  const [lessonFile, setLessonFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [structure, courseFiles] = await Promise.all([
        api.adminCourseStructure(id, token),
        api.adminCourseFiles(id, token).catch(() => ({ files: [] })),
      ]);
      setData(structure);
      setFiles(courseFiles.files || []);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, [id, token]);

  async function addModule(e) {
    e.preventDefault();
    if (!moduleTitle) return;
    await api.adminAddModule(id, { title: moduleTitle }, token);
    setModuleTitle('');
    load();
  }

  async function addLesson(e) {
    e.preventDefault();
    if (!lesson.moduleId || !lesson.title) return;
    setBusy(true);
    setErr('');
    try {
      const payload = { ...lesson };
      if (lessonFile) {
        const uploaded = await api.adminUpload('course-file', lessonFile, token);
        payload.media_url = uploaded.upload.url;
      }
      await api.adminAddLesson(lesson.moduleId, payload, token);
      setLesson(emptyLesson);
      setLessonFile(null);
      setPreview('');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function yid(url) {
    try {
      const u = new URL(url);
      return u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
    } catch { return null; }
  }

  const needsFile = ['pdf', 'audio', 'video_upload'].includes(lesson.lesson_type);

  return (
    <>
      <AdminHeader title={data.course?.title || 'Structure du cours'} subtitle="Organisez les modules, fichiers et leçons" action={<Link className="admin-btn" to="/admin/courses">← Cours</Link>} />
      {err && <div className="admin-error">{err}</div>}

      {files.length > 0 && (
        <section className="admin-panel admin-course-files">
          <h2>Fichiers principaux du cours</h2>
          <div className="admin-file-list">
            {files.map((f) => (
              <div key={f.id}>
                <span>📎</span>
                <div><b>{f.title}</b><small>{f.file_name || f.mime_type || 'Fichier'}</small></div>
                <a href={f.file_url} target="_blank" rel="noreferrer">Ouvrir</a>
                <button type="button" onClick={async () => { if (confirm('Supprimer ce fichier ?')) { await api.adminDeleteCourseFile(f.id, token); load(); } }}>Supprimer</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="admin-structure-grid">
        <section>
          <form className="admin-panel admin-inline-form" onSubmit={addModule}>
            <h2>＋ Ajouter un module</h2>
            <input placeholder="Ex. Module 1 : Introduction" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
            <button className="admin-btn primary">Ajouter</button>
          </form>

          <div className="admin-module-list">
            {data.modules?.map((m, i) => (
              <article className="admin-module" key={m.id}>
                <div className="admin-module-head">
                  <span>{i + 1}</span>
                  <div><h3>{m.title}</h3><small>{m.lessons?.length || 0} leçon(s)</small></div>
                  <button type="button" onClick={async () => { if (confirm('Supprimer ce module ?')) { await api.adminDeleteModule(m.id, token); load(); } }}>×</button>
                </div>
                <div>
                  {m.lessons?.map((l, j) => (
                    <div className="admin-lesson" key={l.id}>
                      <span>{j + 1}</span>
                      <div>
                        <b>{l.title}</b>
                        <small>{l.lesson_type}{l.youtube_url ? ' · YouTube' : ''}{l.media_url ? ' · Fichier joint' : ''}</small>
                      </div>
                      {l.media_url && <a href={l.media_url} target="_blank" rel="noreferrer">Ouvrir</a>}
                      <button type="button" onClick={async () => { await api.adminDeleteLesson(l.id, token); load(); }}>Supprimer</button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="admin-panel">
          <h2>＋ Nouvelle leçon</h2>
          <form className="admin-form" onSubmit={addLesson}>
            <label>Module<select required value={lesson.moduleId} onChange={(e) => setLesson({ ...lesson, moduleId: e.target.value })}><option value="">Choisir...</option>{data.modules?.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
            <label>Titre<input required value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /></label>
            <label>Type<select value={lesson.lesson_type} onChange={(e) => { setLesson({ ...lesson, lesson_type: e.target.value, youtube_url: '', media_url: '' }); setLessonFile(null); setPreview(''); }}><option value="youtube">Vidéo YouTube</option><option value="video_upload">Vidéo depuis l’ordinateur</option><option value="text">Texte</option><option value="pdf">PDF</option><option value="audio">Audio</option><option value="exercise">Exercice</option><option value="quiz">Quiz</option><option value="live">Live</option></select></label>

            {lesson.lesson_type === 'youtube' && (
              <>
                <label>Lien YouTube<input placeholder="https://youtube.com/watch?v=..." value={lesson.youtube_url} onChange={(e) => { setLesson({ ...lesson, youtube_url: e.target.value }); setPreview(yid(e.target.value) || ''); }} /></label>
                {preview && <iframe className="admin-youtube-preview" src={`https://www.youtube.com/embed/${preview}`} allowFullScreen />}
              </>
            )}

            {needsFile && (
              <label className="admin-file-picker">
                <span>{lesson.lesson_type === 'pdf' ? 'Sélectionner le PDF' : lesson.lesson_type === 'audio' ? 'Sélectionner le fichier audio' : 'Sélectionner la vidéo'}</span>
                <input
                  type="file"
                  accept={lesson.lesson_type === 'pdf' ? '.pdf,application/pdf' : lesson.lesson_type === 'audio' ? 'audio/*' : 'video/*'}
                  onChange={(e) => setLessonFile(e.target.files?.[0] || null)}
                />
                <div className="admin-file-box"><b>{lessonFile ? lessonFile.name : 'Choisir un fichier'}</b><small>{lessonFile ? `${(lessonFile.size / 1024 / 1024).toFixed(2)} Mo` : 'Cliquez pour parcourir votre ordinateur'}</small></div>
              </label>
            )}

            <label>Contenu / description<textarea rows="5" value={lesson.content} onChange={(e) => setLesson({ ...lesson, content: e.target.value })} /></label>
            <label>Durée (secondes)<input type="number" value={lesson.duration_seconds} onChange={(e) => setLesson({ ...lesson, duration_seconds: e.target.value })} /></label>
            <label className="admin-check"><input type="checkbox" checked={lesson.is_preview} onChange={(e) => setLesson({ ...lesson, is_preview: e.target.checked })} /> Aperçu gratuit</label>
            <button className="admin-btn primary" disabled={busy}>{busy ? 'Envoi...' : 'Ajouter la leçon'}</button>
          </form>
        </aside>
      </div>
    </>
  );
}
