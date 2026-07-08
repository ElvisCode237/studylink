import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AdminHeader, Status } from './AdminLayout.jsx';

const cfg = {
  tutorials: {
    title: 'Tutoriels', subtitle: 'Créez des guides courts et pratiques', resource: 'tutorials', key: 'tutorials',
    coverKind: 'tutorial-cover', coverLabel: 'Image de couverture depuis votre ordinateur',
    fields: [
      ['title','Titre'], ['description','Description','textarea'],
      ['youtube_url','Lien YouTube de la vidéo','url'],
      ['level','Niveau','select','beginner|intermediate|advanced'], ['language','Langue'],
      ['estimated_minutes','Durée (minutes)','number'], ['status','Statut','select','draft|review|published|archived']
    ]
  },
  books: {
    title: 'Livres', subtitle: 'Ajoutez des livres autorisés, PDF, ePub, audio ou liens externes', resource: 'books', key: 'books',
    coverKind: 'book-cover', coverLabel: 'Couverture du livre',
    fileKind: 'book-file', fileLabel: 'Sélectionner le livre sur votre ordinateur', fileAccept: '.pdf,.epub,.mp3,.m4a,.wav,audio/*,application/pdf,application/epub+zip',
    fields: [
      ['title','Titre'], ['author_name','Auteur'], ['description','Description','textarea'],
      ['file_type','Format','select','pdf|epub|audio|external'], ['rights_status','Droits','select','licensed|public_domain|owned|external_link'],
      ['page_count','Nombre de pages','number'], ['language','Langue'], ['status','Statut','select','draft|published|archived']
    ]
  },
  bootcamps: {
    title: 'Bootcamps', subtitle: 'Planifiez et publiez des formations gratuites', resource: 'bootcamps', key: 'bootcamps',
    coverKind: 'bootcamp-cover', coverLabel: 'Image du bootcamp',
    fields: [
      ['title','Titre'], ['description','Description','textarea'], ['mode','Mode','select','online|in_person|hybrid'],
      ['start_at','Date de début','datetime-local'], ['end_at','Date de fin','datetime-local'],
      ['max_participants','Places maximum','number'], ['meeting_url','Lien de visioconférence'],
      ['replay_url','Replay (URL)'], ['status','Statut','select','project|upcoming|ongoing|completed|cancelled']
    ]
  },
  personal: {
    title: 'Développement personnel', subtitle: 'Créez des programmes de discipline, yoga, méditation et habitudes', resource: 'personal-programs', key: 'programs',
    coverKind: 'personal-cover', coverLabel: 'Image du programme',
    fields: [
      ['title','Titre'], ['description','Description','textarea'], ['duration_days','Durée (jours)','number'],
      ['level','Niveau'], ['status','Statut','select','draft|published|archived']
    ]
  },
  entrepreneurship: {
    title: 'Entrepreneuriat', subtitle: 'Gérez la boîte à outils des entrepreneurs', resource: 'entrepreneur-tools', key: 'tools',
    coverKind: 'entrepreneur-cover', coverLabel: 'Image de couverture',
    fileKind: 'entrepreneur-file', fileLabel: 'Sélectionner le modèle ou document', fileAccept: '.doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.zip',
    fields: [
      ['title','Titre'], ['description','Description','textarea'], ['category','Catégorie'],
      ['file_type','Type de fichier','select','docx|xlsx|pdf|pptx|link|other'], ['status','Statut','select','draft|published|archived']
    ]
  }
};

function FilePicker({ label, accept, file, onChange, hint }) {
  return (
    <label className="admin-file-picker">
      <span>{label}</span>
      <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div className="admin-file-box">
        <b>{file ? file.name : 'Choisir un fichier'}</b>
        <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} Mo` : hint || 'Cliquez pour parcourir les fichiers de votre ordinateur'}</small>
      </div>
    </label>
  );
}

export default function GenericContentPage({ type }) {
  const c = cfg[type];
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [coverFile, setCoverFile] = useState(null);
  const [contentFile, setContentFile] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setErr('');
    api.adminList(c.resource, token)
      .then((x) => setItems(x[c.key] || []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, [type, token]);

  function closeModal() {
    setOpen(false);
    setForm({});
    setCoverFile(null);
    setContentFile(null);
    setErr('');
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const payload = { ...form };

      if (coverFile && c.coverKind) {
        const result = await api.adminUpload(c.coverKind, coverFile, token);
        payload.cover_url = result.upload.url;
      }

      if (contentFile && c.fileKind) {
        const result = await api.adminUpload(c.fileKind, contentFile, token);
        payload.file_url = result.upload.url;
        if (type === 'books') {
          if (contentFile.type.startsWith('audio/')) payload.audio_url = result.upload.url;
          if (!payload.file_type) {
            const ext = contentFile.name.split('.').pop()?.toLowerCase();
            payload.file_type = contentFile.type.startsWith('audio/') ? 'audio' : (ext === 'epub' ? 'epub' : 'pdf');
          }
        }
      }

      const created = await api.adminCreate(c.resource, payload, token);

      // Pour un tutoriel vidéo, on crée automatiquement la première étape.
      // La vidéo reste hébergée sur YouTube mais devient jouable directement dans StudyLink.
      if (type === 'tutorials' && payload.youtube_url && created?.tutorial?.id) {
        await api.adminAddTutorialStep(created.tutorial.id, {
          title: payload.title || 'Vidéo du tutoriel',
          content: payload.description || '',
          youtube_url: payload.youtube_url,
          estimated_minutes: Number(payload.estimated_minutes) || 0,
          position: 1,
        }, token);
      }

      closeModal();
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    if (!confirm('Supprimer cet élément ?')) return;
    try {
      await api.adminDelete(c.resource, id, token);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addYoutubeToTutorial(item) {
    const url = window.prompt('Collez le lien YouTube complet de la vidéo :');
    if (!url) return;
    try {
      setBusy(true);
      setErr('');
      await api.adminAddTutorialStep(item.id, {
        title: item.title || 'Vidéo du tutoriel',
        content: item.description || '',
        youtube_url: url,
        estimated_minutes: Number(item.estimated_minutes) || 0,
      }, token);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function installPersonalModule() {
    try {
      setBusy(true); setErr('');
      const r = await api.adminSeedPersonalDevelopment(token);
      alert(`Module installé : ${r.summary?.program_count || 0} programmes, ${r.summary?.day_count || 0} jours, ${r.summary?.book_count || 0} livres.`);
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (!c) return <div className="admin-error">Module administrateur inconnu.</div>;

  return (
    <>
      <AdminHeader
        title={c.title}
        subtitle={c.subtitle}
        action={<div className="admin-actions">{type==='personal' && <button className="admin-btn" type="button" disabled={busy} onClick={installPersonalModule}>⚡ Installer le module complet</button>}<button className="admin-btn primary" type="button" onClick={() => setOpen(true)}>＋ Ajouter</button></div>}
      />

      {err && <div className="admin-error">{err}</div>}

      <div className="admin-content-grid">
        {items.map((x) => (
          <article className={`admin-content-card ${type === 'tutorials' && x.youtube_video_id ? 'with-video' : ''}`} key={x.id}>
            {type === 'tutorials' && x.youtube_video_id ? (
              <iframe
                className="admin-tutorial-video"
                src={`https://www.youtube-nocookie.com/embed/${x.youtube_video_id}`}
                title={x.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="admin-cover" style={x.cover_url ? { backgroundImage: `url(${x.cover_url})` } : {}}>{!x.cover_url && '◆'}</div>
            )}
            <div>
              <h3>{x.title}</h3>
              <p>{x.description || x.author_name || x.category || 'Aucune description'}</p>
              <Status value={x.status} />
              {x.file_url && <a className="admin-file-link" href={x.file_url} target="_blank" rel="noreferrer">Ouvrir le fichier</a>}
              {type === 'tutorials' && x.youtube_video_id && <a className="admin-file-link" href={`/tutorials/${x.id}`} target="_blank" rel="noreferrer">Voir le tutoriel dans l’application</a>}
              {type === 'tutorials' && !x.youtube_video_id && <button className="admin-btn" type="button" disabled={busy} onClick={() => addYoutubeToTutorial(x)}>▶ Ajouter une vidéo YouTube</button>}
            </div>
            <button type="button" onClick={() => del(x.id)}>Supprimer</button>
          </article>
        ))}
      </div>

      {!items.length && <div className="admin-empty">Aucun contenu pour le moment. Cliquez sur « Ajouter ».</div>}

      {open && (
        <div className="admin-modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <form className="admin-modal" onSubmit={submit}>
            <div className="admin-modal-head">
              <h2>Ajouter · {c.title}</h2>
              <button type="button" onClick={closeModal}>×</button>
            </div>

            {c.coverKind && (
              <FilePicker
                label={c.coverLabel}
                accept="image/png,image/jpeg,image/webp"
                file={coverFile}
                onChange={setCoverFile}
                hint="PNG, JPG ou WebP"
              />
            )}

            {c.fileKind && (
              <FilePicker
                label={c.fileLabel}
                accept={c.fileAccept}
                file={contentFile}
                onChange={setContentFile}
              />
            )}

            {c.fields.map(([k, l, t = 'text', opts]) => (
              <label key={k}>
                {l}
                {t === 'textarea' ? (
                  <textarea rows="4" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                ) : t === 'select' ? (
                  <select value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>
                    <option value="">Choisir...</option>
                    {opts.split('|').map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={t} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                )}
              </label>
            ))}

            <div className="admin-upload-note">
              Les fichiers sont envoyés dans Supabase Storage puis leur URL est enregistrée automatiquement dans la base de données.
            </div>

            <div className="admin-actions">
              <button className="admin-btn primary" disabled={busy}>{busy ? 'Envoi et enregistrement...' : 'Enregistrer'}</button>
              <button type="button" className="admin-btn" onClick={closeModal} disabled={busy}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
