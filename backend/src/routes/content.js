import { Router } from 'express';
import { query, pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import { uploadBuffer } from '../storage.js';

const router = Router();
const careerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const ok = (res, data, status = 200) => res.status(status).json(data);
const fail = (res, e, status = 500) => {
  console.error(e);
  res.status(e.status || status).json({ error: e.message || 'Erreur serveur.' });
};

function whereSearch(q, fields, values) {
  const term = (q || '').toString().trim();
  if (!term) return '';
  values.push(`%${term}%`);
  const i = values.length;
  return ` AND (${fields.map((f) => `${f} ILIKE $${i}`).join(' OR ')})`;
}

async function resolvePublishedCourse(identifier) {
  return (await query(`
    SELECT c.*, lc.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar_url,
      (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id=c.id) AS enrollment_count,
      (SELECT COUNT(*) FROM course_modules cm WHERE cm.course_id=c.id) AS module_count,
      (SELECT COUNT(*) FROM lessons l JOIN course_modules cm ON cm.id=l.module_id WHERE cm.course_id=c.id) AS lesson_count
    FROM courses c
    LEFT JOIN learning_categories lc ON lc.id=c.category_id
    LEFT JOIN users u ON u.id=c.author_id
    WHERE (c.id::text=$1 OR c.slug=$1) AND c.status='published'
    LIMIT 1`, [identifier])).rows[0];
}

async function loadCourseStructure(courseId) {
  const modules = (await query('SELECT * FROM course_modules WHERE course_id=$1 ORDER BY position', [courseId])).rows;
  for (const m of modules) {
    m.lessons = (await query(`SELECT l.*,
      (SELECT COUNT(*) FROM lesson_resources lr WHERE lr.lesson_id=l.id) AS resource_count
      FROM lessons l WHERE l.module_id=$1 ORDER BY l.position`, [m.id])).rows;
    for (const lesson of m.lessons) {
      lesson.resources = (await query('SELECT * FROM lesson_resources WHERE lesson_id=$1 ORDER BY created_at', [lesson.id])).rows;
    }
  }
  return modules;
}

// -----------------------------------------------------------------------------
// CATALOGUE / COURS PUBLICS
// -----------------------------------------------------------------------------
router.get('/courses', async (req, res) => {
  try {
    const values = [];
    let sql = `
      SELECT
        c.*,
        lc.name AS category_name,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar_url,
        (SELECT COUNT(*) FROM course_modules m WHERE m.course_id=c.id) AS module_count,
        (SELECT COUNT(*) FROM course_files cf WHERE cf.course_id=c.id) AS file_count,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id=c.id) AS enrollment_count
      FROM courses c
      LEFT JOIN learning_categories lc ON lc.id=c.category_id
      LEFT JOIN users u ON u.id=c.author_id
      WHERE c.status='published'
    `;
    sql += whereSearch(req.query.q, ['c.title', "COALESCE(c.short_description,'')", "COALESCE(c.description,'')", "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY COALESCE(c.published_at,c.created_at) DESC LIMIT 200';
    const result = await query(sql, values);
    ok(res, { courses: result.rows });
  } catch (e) { fail(res, e); }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = await resolvePublishedCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable ou non publié.' });
    const modules = await loadCourseStructure(course.id);
    const files = (await query('SELECT * FROM course_files WHERE course_id=$1 ORDER BY created_at DESC', [course.id])).rows;
    ok(res, { course, modules, files });
  } catch (e) { fail(res, e); }
});

router.get('/courses/:id/learning', requireAuth, async (req, res) => {
  try {
    const course = await resolvePublishedCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable ou non publié.' });
    const enrollment = (await query('SELECT * FROM course_enrollments WHERE course_id=$1 AND user_id=$2 LIMIT 1', [course.id, req.user.id])).rows[0] || null;
    const progress = (await query(`SELECT lp.* FROM lesson_progress lp
      JOIN lessons l ON l.id=lp.lesson_id JOIN course_modules cm ON cm.id=l.module_id
      WHERE cm.course_id=$1 AND lp.user_id=$2`, [course.id, req.user.id])).rows;
    const notes = (await query(`SELECT ln.* FROM lesson_notes ln
      JOIN lessons l ON l.id=ln.lesson_id JOIN course_modules cm ON cm.id=l.module_id
      WHERE cm.course_id=$1 AND ln.user_id=$2 ORDER BY ln.updated_at DESC`, [course.id, req.user.id])).rows;
    ok(res, { enrollment, progress, notes });
  } catch (e) { fail(res, e); }
});

router.post('/courses/:id/enroll', requireAuth, async (req, res) => {
  try {
    const course = await resolvePublishedCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable ou non publié.' });
    const r = await query(`INSERT INTO course_enrollments(user_id,course_id,status)
      VALUES($1,$2,'active') ON CONFLICT (course_id,user_id) DO UPDATE SET status='active', updated_at=now()
      RETURNING *`, [req.user.id, course.id]);
    ok(res, { enrollment: r.rows[0] }, 201);
  } catch (e) { fail(res, e); }
});

router.get('/my/learning', requireAuth, async (req, res) => {
  try {
    const r = await query(`SELECT ce.*, c.title, c.cover_url, c.level, lc.name AS category_name,
      COALESCE((SELECT ROUND(AVG(CASE WHEN lp.status='completed' THEN 100 ELSE COALESCE(lp.progress_percent,0) END))
        FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id JOIN course_modules cm ON cm.id=l.module_id
        WHERE cm.course_id=c.id AND lp.user_id=$1),0) AS progress_percent
      FROM course_enrollments ce
      JOIN courses c ON c.id=ce.course_id
      LEFT JOIN learning_categories lc ON lc.id=c.category_id
      WHERE ce.user_id=$1
      ORDER BY ce.updated_at DESC`, [req.user.id]);
    ok(res, { enrollments: r.rows });
  } catch (e) { fail(res, e); }
});

router.post('/lessons/:id/progress', requireAuth, async (req, res) => {
  try {
    const percent = Math.max(0, Math.min(100, Number(req.body.progress_percent ?? 0)));
    const completed = Boolean(req.body.completed) || percent >= 100;
    const status = completed ? 'completed' : (percent > 0 ? 'in_progress' : 'not_started');
    const lesson = (await query(`SELECT l.id, cm.course_id FROM lessons l JOIN course_modules cm ON cm.id=l.module_id WHERE l.id=$1`, [req.params.id])).rows[0];
    if (!lesson) return res.status(404).json({ error: 'Leçon introuvable.' });
    const r = await query(`INSERT INTO lesson_progress(user_id,lesson_id,progress_percent,progress_seconds,status,completed_at)
      VALUES($1,$2,$3,$4,$5,CASE WHEN $5='completed' THEN now() ELSE NULL END)
      ON CONFLICT (user_id,lesson_id)
      DO UPDATE SET progress_percent=$3,progress_seconds=$4,status=$5,
        completed_at=CASE WHEN $5='completed' THEN COALESCE(lesson_progress.completed_at,now()) ELSE NULL END,
        updated_at=now()
      RETURNING *`, [req.user.id, req.params.id, percent, Number(req.body.last_position_seconds)||0, status]);

    await query(`INSERT INTO course_enrollments(user_id,course_id,status,last_lesson_id)
      VALUES($1,$2,'active',$3)
      ON CONFLICT (course_id,user_id) DO UPDATE SET last_lesson_id=$3, status='active', updated_at=now()`, [req.user.id, lesson.course_id, lesson.id]);
    const aggregate = (await query(`SELECT COALESCE(ROUND(AVG(COALESCE(lp.progress_percent,0))),0) AS progress
      FROM lessons l JOIN course_modules cm ON cm.id=l.module_id
      LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1
      WHERE cm.course_id=$2`, [req.user.id, lesson.course_id])).rows[0];
    const courseProgress = Number(aggregate?.progress || 0);
    await query(`UPDATE course_enrollments SET progress_percent=$1,
      status=CASE WHEN $1>=100 THEN 'completed' ELSE 'active' END,
      completed_at=CASE WHEN $1>=100 THEN COALESCE(completed_at,now()) ELSE NULL END,
      updated_at=now() WHERE course_id=$2 AND user_id=$3`, [courseProgress, lesson.course_id, req.user.id]);
    ok(res, { progress: r.rows[0], course_progress_percent: courseProgress });
  } catch (e) { fail(res, e); }
});

router.post('/lessons/:id/notes', requireAuth, async (req, res) => {
  try {
    const content = (req.body.content || '').toString().trim();
    if (!content) {
      await query('DELETE FROM lesson_notes WHERE lesson_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      return ok(res, { note: null });
    }
    const existing = (await query('SELECT id FROM lesson_notes WHERE lesson_id=$1 AND user_id=$2 ORDER BY updated_at DESC LIMIT 1', [req.params.id, req.user.id])).rows[0];
    const result = existing
      ? await query('UPDATE lesson_notes SET content=$1,updated_at=now() WHERE id=$2 RETURNING *', [content, existing.id])
      : await query('INSERT INTO lesson_notes(lesson_id,user_id,content) VALUES($1,$2,$3) RETURNING *', [req.params.id, req.user.id, content]);
    ok(res, { note: result.rows[0] });
  } catch (e) { fail(res, e); }
});


router.post('/courses/:id/certificate', requireAuth, async (req, res) => {
  try {
    const course = await resolvePublishedCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable.' });

    const stats = (await query(`SELECT
      COUNT(*)::int AS total,
      COUNT(lp.lesson_id) FILTER (WHERE lp.status='completed')::int AS completed
      FROM lessons l
      JOIN course_modules cm ON cm.id=l.module_id
      LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.user_id=$1
      WHERE cm.course_id=$2`, [req.user.id, course.id])).rows[0];

    if (!stats.total || Number(stats.completed) < Number(stats.total)) {
      return res.status(400).json({ error: `Terminez les ${stats.total || 0} leçons avant d’obtenir le certificat.` });
    }

    let certificate = (await query(`SELECT * FROM certificates WHERE user_id=$1 AND course_id=$2 ORDER BY issued_at DESC LIMIT 1`,
      [req.user.id, course.id])).rows[0];

    if (!certificate) {
      const code = `SL-${new Date().getFullYear()}-${course.id.slice(0,8).toUpperCase()}-${req.user.id.slice(0,8).toUpperCase()}`;
      certificate = (await query(`INSERT INTO certificates(user_id,course_id,certificate_code,title)
        VALUES($1,$2,$3,$4) RETURNING *`, [req.user.id, course.id, code, `Certificat de réussite — ${course.title}`])).rows[0];
    }

    await query(`UPDATE course_enrollments SET status='completed', progress_percent=100,
      completed_at=COALESCE(completed_at,now()), updated_at=now()
      WHERE user_id=$1 AND course_id=$2`, [req.user.id, course.id]);

    ok(res, { certificate, course: { id: course.id, title: course.title } });
  } catch (e) { fail(res, e); }
});

router.get('/courses/:id/certificate', requireAuth, async (req, res) => {
  try {
    const course = await resolvePublishedCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours introuvable.' });
    const certificate = (await query(`SELECT c.*, u.full_name AS learner_name
      FROM certificates c JOIN users u ON u.id=c.user_id
      WHERE c.user_id=$1 AND c.course_id=$2 ORDER BY c.issued_at DESC LIMIT 1`,
      [req.user.id, course.id])).rows[0] || null;
    ok(res, { certificate, course: { id: course.id, title: course.title, author_name: course.author_name } });
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// DOCUMENTS PUBLICS
// -----------------------------------------------------------------------------
router.get('/materials', async (req, res) => {
  try {
    const values = [];
    let sql = `
      SELECT cf.id, cf.title, cf.file_url, cf.file_name, cf.mime_type, cf.file_size, cf.created_at,
        c.id AS course_id, c.title AS course_title, c.cover_url AS course_cover_url,
        c.level, c.language, lc.name AS category_name, u.full_name AS uploaded_by_name, 'course'::text AS source_type
      FROM course_files cf
      JOIN courses c ON c.id = cf.course_id
      LEFT JOIN learning_categories lc ON lc.id = c.category_id
      LEFT JOIN users u ON u.id = cf.uploaded_by
      WHERE c.status='published'
    `;
    sql += whereSearch(req.query.q, ['cf.title', 'cf.file_name', 'c.title', "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY cf.created_at DESC LIMIT 300';
    const result = await query(sql, values);
    ok(res, { materials: result.rows });
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// TUTORIELS PUBLICS
// -----------------------------------------------------------------------------
router.get('/tutorials', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT t.*, lc.name AS category_name, u.full_name AS author_name,
        (SELECT COUNT(*) FROM tutorial_steps s WHERE s.tutorial_id=t.id) AS step_count,
        (SELECT s.youtube_video_id FROM tutorial_steps s WHERE s.tutorial_id=t.id AND s.youtube_video_id IS NOT NULL ORDER BY s.position LIMIT 1) AS youtube_video_id
      FROM tutorials t
      LEFT JOIN learning_categories lc ON lc.id=t.category_id
      LEFT JOIN users u ON u.id=t.author_id
      WHERE t.status='published'`;
    sql += whereSearch(req.query.q, ['t.title', "COALESCE(t.description,'')", "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY t.created_at DESC LIMIT 200';
    const result = await query(sql, values);
    ok(res, { tutorials: result.rows });
  } catch (e) { fail(res, e); }
});

router.get('/tutorials/:id', async (req, res) => {
  try {
    const tutorial = (await query(`SELECT t.*, lc.name AS category_name, u.full_name AS author_name
      FROM tutorials t LEFT JOIN learning_categories lc ON lc.id=t.category_id LEFT JOIN users u ON u.id=t.author_id
      WHERE t.id=$1 AND t.status='published' LIMIT 1`, [req.params.id])).rows[0];
    if (!tutorial) return res.status(404).json({ error: 'Tutoriel introuvable ou non publié.' });
    const steps = (await query('SELECT * FROM tutorial_steps WHERE tutorial_id=$1 ORDER BY position ASC', [req.params.id])).rows;
    ok(res, { tutorial, steps });
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// FORUM PUBLIC + ACTIONS UTILISATEUR
// -----------------------------------------------------------------------------
router.get('/forum/categories', async (_req, res) => {
  try {
    const categories = (await query('SELECT * FROM forum_categories ORDER BY name')).rows;
    ok(res, { categories });
  } catch (e) { fail(res, e); }
});

router.get('/forum/topics', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT ft.*, fc.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar_url,
      (SELECT COUNT(*) FROM forum_posts fp WHERE fp.topic_id=ft.id) AS reply_count
      FROM forum_topics ft
      LEFT JOIN forum_categories fc ON fc.id=ft.category_id
      LEFT JOIN users u ON u.id=ft.author_id
      WHERE ft.status='open'`;
    if (req.query.category_id) { values.push(req.query.category_id); sql += ` AND ft.category_id=$${values.length}`; }
    sql += whereSearch(req.query.q, ['ft.title', "COALESCE(ft.content,'')", "COALESCE(fc.name,'')"], values);
    sql += ' ORDER BY ft.last_activity_at DESC LIMIT 200';
    const topics = (await query(sql, values)).rows;
    ok(res, { topics });
  } catch (e) { fail(res, e); }
});

router.get('/forum/topics/:id', async (req, res) => {
  try {
    const topic = (await query(`SELECT ft.*, fc.name AS category_name, u.full_name AS author_name, u.avatar_url AS author_avatar_url
      FROM forum_topics ft LEFT JOIN forum_categories fc ON fc.id=ft.category_id LEFT JOIN users u ON u.id=ft.author_id
      WHERE ft.id=$1`, [req.params.id])).rows[0];
    if (!topic) return res.status(404).json({ error: 'Discussion introuvable.' });
    const posts = (await query(`SELECT fp.*, u.full_name AS author_name, u.avatar_url AS author_avatar_url
      FROM forum_posts fp LEFT JOIN users u ON u.id=fp.author_id WHERE fp.topic_id=$1 ORDER BY fp.created_at`, [req.params.id])).rows;
    ok(res, { topic, posts });
  } catch (e) { fail(res, e); }
});

router.post('/forum/topics', requireAuth, async (req, res) => {
  try {
    const { category_id, title, content } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Titre requis.' });
    const r = await query(`INSERT INTO forum_topics(category_id,author_id,title,content,last_activity_at) VALUES($1,$2,$3,$4,now()) RETURNING *`, [category_id || null, req.user.id, title.trim(), content || '']);
    await query(`INSERT INTO forum_topic_follows(topic_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [r.rows[0].id, req.user.id]);
    ok(res, { topic: r.rows[0] }, 201);
  } catch (e) { fail(res, e); }
});

router.post('/forum/topics/:id/posts', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message requis.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const topicResult = await client.query('SELECT id,title,author_id FROM forum_topics WHERE id=$1 FOR UPDATE', [req.params.id]);
      const topic = topicResult.rows[0];
      if (!topic) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Discussion introuvable.' });
      }

      const r = await client.query('INSERT INTO forum_posts(topic_id,author_id,content) VALUES($1,$2,$3) RETURNING *', [req.params.id, req.user.id, content.trim()]);
      await client.query('UPDATE forum_topics SET last_activity_at=now() WHERE id=$1', [req.params.id]);
      await client.query(`INSERT INTO forum_topic_follows(topic_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, req.user.id]);

      const recipients = await client.query(`
        SELECT DISTINCT user_id FROM (
          SELECT author_id AS user_id FROM forum_topics WHERE id=$1
          UNION
          SELECT user_id FROM forum_topic_follows WHERE topic_id=$1
        ) recipients
        WHERE user_id <> $2`, [req.params.id, req.user.id]);

      for (const recipient of recipients.rows) {
        await client.query(`INSERT INTO notifications(user_id,type,title,body,data,action_url)
          VALUES($1,'forum',$2,$3,$4::jsonb,$5)`, [
          recipient.user_id,
          'Nouvelle réponse sur le forum',
          `Une nouvelle réponse a été publiée dans « ${topic.title} ».`,
          JSON.stringify({ topic_id: req.params.id, post_id: r.rows[0].id }),
          `/forum?topic=${req.params.id}`
        ]);
      }

      await client.query('COMMIT');
      ok(res, { post: r.rows[0] }, 201);
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// BOOTCAMPS
// -----------------------------------------------------------------------------
router.get('/bootcamps', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT b.*, lc.name AS category_name, u.full_name AS tutor_name, u.avatar_url AS tutor_avatar_url,
      (SELECT COUNT(*) FROM bootcamp_registrations br WHERE br.bootcamp_id=b.id AND br.status='registered') AS registered_count
      FROM bootcamps b
      LEFT JOIN learning_categories lc ON lc.id=b.category_id
      JOIN tutor_profiles tp ON tp.id=b.tutor_id
      JOIN users u ON u.id=tp.user_id
      WHERE b.status IN ('project','upcoming','ongoing','completed')`;
    sql += whereSearch(req.query.q, ['b.title', "COALESCE(b.description,'')", "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY b.start_at NULLS LAST, b.created_at DESC LIMIT 200';
    ok(res, { bootcamps: (await query(sql, values)).rows });
  } catch (e) { fail(res, e); }
});

router.post('/bootcamps/:id/register', requireAuth, async (req, res) => {
  try {
    const r = await query(`INSERT INTO bootcamp_registrations(bootcamp_id,user_id,status) VALUES($1,$2,'registered')
      ON CONFLICT (bootcamp_id,user_id) DO UPDATE SET status='registered', registered_at=now()
      RETURNING *`, [req.params.id, req.user.id]);
    ok(res, { registration: r.rows[0] }, 201);
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// DEVELOPPEMENT PERSONNEL / LIVRES / HABITUDES
// -----------------------------------------------------------------------------
router.get('/personal-programs', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT pp.*, lc.name AS category_name, u.full_name AS author_name,
      (SELECT COUNT(*) FROM personal_program_days pd WHERE pd.program_id=pp.id) AS day_count
      FROM personal_programs pp
      LEFT JOIN learning_categories lc ON lc.id=pp.category_id
      LEFT JOIN users u ON u.id=pp.author_id
      WHERE pp.status='published'`;
    sql += whereSearch(req.query.q, ['pp.title', "COALESCE(pp.description,'')", "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY pp.created_at DESC LIMIT 200';
    ok(res, { programs: (await query(sql, values)).rows });
  } catch (e) { fail(res, e); }
});

router.get('/personal-programs/:id', async (req, res) => {
  try {
    const program = (await query(`SELECT pp.*, lc.name AS category_name, u.full_name AS author_name
      FROM personal_programs pp
      LEFT JOIN learning_categories lc ON lc.id=pp.category_id
      LEFT JOIN users u ON u.id=pp.author_id
      WHERE (pp.id::text=$1 OR pp.slug=$1) AND pp.status='published' LIMIT 1`, [req.params.id])).rows[0];
    if (!program) return res.status(404).json({ error: 'Programme introuvable.' });
    const days = (await query(`SELECT pd.*,
      COALESCE(json_agg(json_build_object('id',pt.id,'title',pt.title,'description',pt.description,'position',pt.position)
        ORDER BY pt.position) FILTER (WHERE pt.id IS NOT NULL),'[]'::json) AS tasks
      FROM personal_program_days pd
      LEFT JOIN personal_program_tasks pt ON pt.program_day_id=pd.id
      WHERE pd.program_id=$1 GROUP BY pd.id ORDER BY pd.day_number`, [program.id])).rows;
    ok(res, { program, days });
  } catch (e) { fail(res, e); }
});

router.post('/personal-programs/:id/start', requireAuth, async (req, res) => {
  try {
    const program = (await query(`SELECT id FROM personal_programs WHERE (id::text=$1 OR slug=$1) AND status='published'`, [req.params.id])).rows[0];
    if (!program) return res.status(404).json({ error: 'Programme introuvable.' });
    const r = await query(`INSERT INTO personal_program_enrollments(user_id,program_id,current_day,progress_percent)
      VALUES($1,$2,1,0)
      ON CONFLICT (program_id,user_id) DO UPDATE SET updated_at=now()
      RETURNING *`, [req.user.id, program.id]);
    ok(res, { enrollment: r.rows[0] }, 201);
  } catch (e) { fail(res, e); }
});

router.get('/personal-programs/:id/my-progress', requireAuth, async (req, res) => {
  try {
    const program = (await query(`SELECT id FROM personal_programs WHERE (id::text=$1 OR slug=$1)`, [req.params.id])).rows[0];
    if (!program) return res.status(404).json({ error: 'Programme introuvable.' });
    const enrollment = (await query('SELECT * FROM personal_program_enrollments WHERE program_id=$1 AND user_id=$2', [program.id, req.user.id])).rows[0] || null;
    const completions = (await query(`SELECT ptc.task_id FROM personal_task_completions ptc
      JOIN personal_program_tasks pt ON pt.id=ptc.task_id
      JOIN personal_program_days pd ON pd.id=pt.program_day_id
      WHERE pd.program_id=$1 AND ptc.user_id=$2`, [program.id, req.user.id])).rows.map(r => r.task_id);
    ok(res, { enrollment, completed_task_ids: completions });
  } catch (e) { fail(res, e); }
});

router.post('/personal-tasks/:id/toggle', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const task = (await client.query(`SELECT pt.id,pd.program_id,pd.day_number
      FROM personal_program_tasks pt JOIN personal_program_days pd ON pd.id=pt.program_day_id WHERE pt.id=$1`, [req.params.id])).rows[0];
    if (!task) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Tâche introuvable.' }); }
    const existing = (await client.query('SELECT 1 FROM personal_task_completions WHERE task_id=$1 AND user_id=$2', [task.id, req.user.id])).rows[0];
    if (existing) await client.query('DELETE FROM personal_task_completions WHERE task_id=$1 AND user_id=$2', [task.id, req.user.id]);
    else await client.query('INSERT INTO personal_task_completions(task_id,user_id) VALUES($1,$2)', [task.id, req.user.id]);

    const stats = (await client.query(`SELECT COUNT(*)::int AS total,
      COUNT(ptc.task_id)::int AS done,
      COALESCE(MAX(CASE WHEN ptc.task_id IS NOT NULL THEN pd.day_number END),1)::int AS current_day
      FROM personal_program_tasks pt
      JOIN personal_program_days pd ON pd.id=pt.program_day_id
      LEFT JOIN personal_task_completions ptc ON ptc.task_id=pt.id AND ptc.user_id=$2
      WHERE pd.program_id=$1`, [task.program_id, req.user.id])).rows[0];
    const progress = stats.total ? Math.round(stats.done * 10000 / stats.total) / 100 : 0;
    const completedAt = progress >= 100 ? new Date() : null;
    const enrollment = (await client.query(`INSERT INTO personal_program_enrollments(program_id,user_id,current_day,progress_percent,completed_at)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (program_id,user_id) DO UPDATE SET current_day=$3,progress_percent=$4,completed_at=$5,updated_at=now()
      RETURNING *`, [task.program_id, req.user.id, stats.current_day, progress, completedAt])).rows[0];
    await client.query('COMMIT');
    ok(res, { completed: !existing, enrollment });
  } catch (e) { await client.query('ROLLBACK'); fail(res, e); }
  finally { client.release(); }
});

router.get('/personal-dashboard', requireAuth, async (req, res) => {
  try {
    const enrollments = (await query(`SELECT pe.*, pp.title,pp.slug,pp.cover_url,pp.duration_days,lc.name AS category_name
      FROM personal_program_enrollments pe
      JOIN personal_programs pp ON pp.id=pe.program_id
      LEFT JOIN learning_categories lc ON lc.id=pp.category_id
      WHERE pe.user_id=$1 ORDER BY pe.updated_at DESC LIMIT 8`, [req.user.id])).rows;
    const habits = (await query(`SELECT h.*,
      COALESCE(hl.completed_count,0) AS completed_today,
      EXISTS(SELECT 1 FROM habit_logs hx WHERE hx.habit_id=h.id AND hx.log_date=CURRENT_DATE) AS done_today
      FROM habits h LEFT JOIN habit_logs hl ON hl.habit_id=h.id AND hl.log_date=CURRENT_DATE
      WHERE h.user_id=$1 AND h.is_active=true ORDER BY h.created_at`, [req.user.id])).rows;
    const last30 = (await query(`SELECT COUNT(DISTINCT log_date)::int AS active_days
      FROM habit_logs WHERE user_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '29 days'`, [req.user.id])).rows[0];
    ok(res, { enrollments, habits, stats: { active_days: last30?.active_days || 0, active_programs: enrollments.filter(e => Number(e.progress_percent) < 100).length } });
  } catch (e) { fail(res, e); }
});

router.get('/habits', requireAuth, async (req, res) => {
  try {
    const habits = (await query(`SELECT h.*,
      COALESCE(hl.completed_count,0) AS completed_today,
      EXISTS(SELECT 1 FROM habit_logs hx WHERE hx.habit_id=h.id AND hx.log_date=CURRENT_DATE) AS done_today,
      (SELECT COUNT(*) FROM habit_logs hs WHERE hs.habit_id=h.id AND hs.log_date >= CURRENT_DATE - INTERVAL '30 days') AS completions_30d
      FROM habits h LEFT JOIN habit_logs hl ON hl.habit_id=h.id AND hl.log_date=CURRENT_DATE
      WHERE h.user_id=$1 AND h.is_active=true ORDER BY h.created_at`, [req.user.id])).rows;
    ok(res, { habits });
  } catch (e) { fail(res, e); }
});

router.post('/habits', requireAuth, async (req, res) => {
  try {
    const title = (req.body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Le titre est obligatoire.' });
    const r = await query(`INSERT INTO habits(user_id,title,icon,color,frequency,target_per_day)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [req.user.id,title,req.body.icon||'check-circle',req.body.color||'#1768ff',req.body.frequency||'daily',Number(req.body.target_per_day)||1]);
    ok(res, { habit:r.rows[0] }, 201);
  } catch (e) { fail(res, e); }
});

router.patch('/habits/:id', requireAuth, async (req, res) => {
  try {
    const r = await query(`UPDATE habits SET title=COALESCE($3,title),is_active=COALESCE($4,is_active),updated_at=now()
      WHERE id=$1 AND user_id=$2 RETURNING *`, [req.params.id,req.user.id,req.body.title ?? null,req.body.is_active ?? null]);
    if (!r.rows[0]) return res.status(404).json({ error:'Habitude introuvable.' });
    ok(res,{habit:r.rows[0]});
  } catch(e){ fail(res,e); }
});

router.post('/habits/:id/toggle-today', requireAuth, async (req, res) => {
  try {
    const habit = (await query('SELECT * FROM habits WHERE id=$1 AND user_id=$2', [req.params.id,req.user.id])).rows[0];
    if (!habit) return res.status(404).json({ error:'Habitude introuvable.' });
    const existing = (await query('SELECT 1 FROM habit_logs WHERE habit_id=$1 AND log_date=CURRENT_DATE', [habit.id])).rows[0];
    if (existing) await query('DELETE FROM habit_logs WHERE habit_id=$1 AND log_date=CURRENT_DATE', [habit.id]);
    else await query('INSERT INTO habit_logs(habit_id,user_id,log_date,completed_count) VALUES($1,$2,CURRENT_DATE,1)', [habit.id,req.user.id]);
    ok(res,{done:!existing});
  } catch(e){ fail(res,e); }
});

router.get('/books', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT b.*, lc.name AS category_name, u.full_name AS uploaded_by_name,
      (SELECT COUNT(*) FROM book_chapters bc WHERE bc.book_id=b.id) AS chapter_count
      FROM books b LEFT JOIN learning_categories lc ON lc.id=b.category_id LEFT JOIN users u ON u.id=b.uploaded_by
      WHERE b.status='published'`;
    sql += whereSearch(req.query.q, ['b.title', "COALESCE(b.author_name,'')", "COALESCE(b.description,'')", "COALESCE(lc.name,'')"], values);
    sql += ' ORDER BY b.created_at DESC LIMIT 200';
    ok(res, { books: (await query(sql, values)).rows });
  } catch (e) { fail(res, e); }
});

router.get('/books/:id', async (req, res) => {
  try {
    const book = (await query(`SELECT b.*,lc.name AS category_name FROM books b LEFT JOIN learning_categories lc ON lc.id=b.category_id
      WHERE (b.id::text=$1 OR b.slug=$1) AND b.status='published'`, [req.params.id])).rows[0];
    if (!book) return res.status(404).json({ error: 'Livre introuvable.' });
    const chapters = (await query('SELECT * FROM book_chapters WHERE book_id=$1 ORDER BY chapter_number', [book.id])).rows;
    ok(res, { book, chapters });
  } catch (e) { fail(res, e); }
});

router.get('/books/:id/my-progress', requireAuth, async (req, res) => {
  try {
    const book = (await query('SELECT id FROM books WHERE id::text=$1 OR slug=$1', [req.params.id])).rows[0];
    if (!book) return res.status(404).json({error:'Livre introuvable.'});
    const progress = (await query('SELECT * FROM book_progress WHERE book_id=$1 AND user_id=$2', [book.id,req.user.id])).rows[0] || null;
    const bookmarks = (await query('SELECT * FROM book_bookmarks WHERE book_id=$1 AND user_id=$2 ORDER BY created_at DESC', [book.id,req.user.id])).rows;
    const notes = (await query('SELECT * FROM book_notes WHERE book_id=$1 AND user_id=$2 ORDER BY created_at DESC', [book.id,req.user.id])).rows;
    ok(res,{progress,bookmarks,notes});
  } catch(e){ fail(res,e); }
});

router.post('/books/:id/progress', requireAuth, async (req, res) => {
  try {
    const book = (await query('SELECT id FROM books WHERE id::text=$1 OR slug=$1', [req.params.id])).rows[0];
    if (!book) return res.status(404).json({error:'Livre introuvable.'});
    const r = await query(`INSERT INTO book_progress(user_id,book_id,current_page,progress_percent,font_size,night_mode,last_position)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (book_id,user_id) DO UPDATE SET current_page=$3,progress_percent=$4,font_size=$5,night_mode=$6,last_position=$7,updated_at=now()
      RETURNING *`, [req.user.id,book.id,Number(req.body.current_page)||1,Number(req.body.progress_percent)||0,Number(req.body.font_size)||18,!!req.body.night_mode,req.body.last_position||{}]);
    ok(res, { progress: r.rows[0] });
  } catch (e) { fail(res, e); }
});

router.post('/books/:id/bookmarks', requireAuth, async (req, res) => {
  try {
    const book = (await query('SELECT id FROM books WHERE id::text=$1 OR slug=$1', [req.params.id])).rows[0];
    if (!book) return res.status(404).json({error:'Livre introuvable.'});
    const chapter = Number(req.body.page_number)||1;
    const existing=(await query('SELECT id FROM book_bookmarks WHERE book_id=$1 AND user_id=$2 AND page_number=$3',[book.id,req.user.id,chapter])).rows[0];
    if(existing){ await query('DELETE FROM book_bookmarks WHERE id=$1',[existing.id]); return ok(res,{bookmarked:false}); }
    const r=await query('INSERT INTO book_bookmarks(book_id,user_id,page_number,label) VALUES($1,$2,$3,$4) RETURNING *',[book.id,req.user.id,chapter,req.body.label||`Chapitre ${chapter}`]);
    ok(res,{bookmarked:true,bookmark:r.rows[0]},201);
  } catch(e){ fail(res,e); }
});

router.post('/books/:id/notes', requireAuth, async (req, res) => {
  try {
    const book=(await query('SELECT id FROM books WHERE id::text=$1 OR slug=$1',[req.params.id])).rows[0];
    if(!book) return res.status(404).json({error:'Livre introuvable.'});
    const content=(req.body.content||'').trim();
    if(!content) return res.status(400).json({error:'La note est vide.'});
    const r=await query('INSERT INTO book_notes(book_id,user_id,page_number,content) VALUES($1,$2,$3,$4) RETURNING *',[book.id,req.user.id,Number(req.body.page_number)||1,content]);
    ok(res,{note:r.rows[0]},201);
  } catch(e){ fail(res,e); }
});

// -----------------------------------------------------------------------------
// ENTREPRENEURIAT
// -----------------------------------------------------------------------------
router.get('/entrepreneur-tools', async (req, res) => {
  try {
    const values = [];
    let sql = `SELECT * FROM entrepreneur_tools WHERE status='published'`;
    sql += whereSearch(req.query.q, ['title', "COALESCE(description,'')", "COALESCE(category,'')"], values);
    sql += ' ORDER BY created_at DESC LIMIT 200';
    ok(res, { tools: (await query(sql, values)).rows });
  } catch (e) { fail(res, e); }
});

router.get('/entrepreneur-projects/me', requireAuth, async (req, res) => {
  try {
    let project = (await query('SELECT * FROM entrepreneur_projects WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id])).rows[0];
    if (!project) {
      project = (await query(`INSERT INTO entrepreneur_projects(user_id,name,idea,stage,status,budget_total)
        VALUES($1,'Mon projet entrepreneurial','Décrivez votre idée ici','idea','active',10000) RETURNING *`, [req.user.id])).rows[0];
      const tasks = ['Étude de marché','Création du logo','Rédaction du business plan','Recherche des premiers clients'];
      for (let i=0;i<tasks.length;i++) await query('INSERT INTO entrepreneur_project_tasks(project_id,title,position,status) VALUES($1,$2,$3,$4)', [project.id, tasks[i], i+1, i<2?'done':'todo']);
    }
    const tasks = (await query('SELECT * FROM entrepreneur_project_tasks WHERE project_id=$1 ORDER BY position', [project.id])).rows;
    const goals = (await query('SELECT * FROM entrepreneur_project_goals WHERE project_id=$1 ORDER BY created_at', [project.id])).rows;
    const budget = (await query('SELECT * FROM entrepreneur_budget_entries WHERE project_id=$1 ORDER BY entry_date DESC', [project.id])).rows;
    const docs = (await query('SELECT * FROM entrepreneur_project_documents WHERE project_id=$1 ORDER BY created_at DESC', [project.id])).rows;
    ok(res, { project, tasks, goals, budget, documents: docs });
  } catch (e) { fail(res, e); }
});

router.patch('/entrepreneur-tasks/:id', requireAuth, async (req, res) => {
  try {
    const status = req.body.status === 'done' ? 'done' : 'todo';
    const r = await query(`UPDATE entrepreneur_project_tasks t SET status=$1, completed_at=CASE WHEN $1='done' THEN now() ELSE NULL END, updated_at=now()
      FROM entrepreneur_projects p WHERE t.project_id=p.id AND p.user_id=$2 AND t.id=$3 RETURNING t.*`, [status, req.user.id, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Tâche introuvable.' });
    ok(res, { task: r.rows[0] });
  } catch (e) { fail(res, e); }
});

// -----------------------------------------------------------------------------
// NOTIFICATIONS UTILISATEUR
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// COMPTEURS DU TABLEAU DE BORD (PROPRES A L'UTILISATEUR CONNECTE)
// -----------------------------------------------------------------------------
router.get('/dashboard-counts', requireAuth, async (req, res) => {
  try {
    const [messagesResult, forumResult, notificationsResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count
             FROM messages
             WHERE recipient_id=$1 AND read_at IS NULL`, [req.user.id]),
      query(`SELECT COUNT(*)::int AS count
             FROM notifications
             WHERE user_id=$1 AND read_at IS NULL AND type='forum'`, [req.user.id]),
      query(`SELECT COUNT(*)::int AS count
             FROM notifications
             WHERE user_id=$1 AND read_at IS NULL
               AND type NOT IN ('message','forum')`, [req.user.id])
    ]);

    ok(res, {
      messages: messagesResult.rows[0]?.count || 0,
      forum: forumResult.rows[0]?.count || 0,
      notifications: notificationsResult.rows[0]?.count || 0
    });
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/read-by-type/:type', requireAuth, async (req, res) => {
  try {
    const allowed = new Set(['message','forum','booking','session','bootcamp','course','career','personal_development','entrepreneurship','system']);
    const type = String(req.params.type || '').toLowerCase();
    if (!allowed.has(type)) return res.status(400).json({ error: 'Type de notification invalide.' });
    const r = await query(`UPDATE notifications
      SET read_at=now()
      WHERE user_id=$1 AND type=$2 AND read_at IS NULL
      RETURNING id`, [req.user.id, type]);
    ok(res, { updated: r.rowCount });
  } catch (e) { fail(res, e); }
});

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const r = await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [req.user.id]);
    ok(res, { notifications: r.rows });
  } catch (e) { fail(res, e); }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await query('UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    ok(res, { ok: true });
  } catch (e) { fail(res, e); }
});


// -----------------------------------------------------------------------------
// CARRIERE : TABLEAU DE BORD, OUTILS, CV ET PRATIQUE
// -----------------------------------------------------------------------------
router.get('/career/dashboard', requireAuth, async (req, res) => {
  try {
    const [resources, questions, sessions, cvs, goals, stats, mentors, attempts] = await Promise.all([
      query(`SELECT * FROM career_resources ORDER BY created_at DESC LIMIT 30`),
      query(`SELECT * FROM career_interview_questions ORDER BY category,sort_order LIMIT 80`),
      query(`SELECT cs.*, tp.user_id AS mentor_user_id, u.full_name AS mentor_name, u.avatar_url AS mentor_avatar,
        tp.professional_title AS mentor_title, s.start_time, s.end_time
        FROM career_sessions cs
        LEFT JOIN tutor_profiles tp ON tp.id=cs.mentor_id
        LEFT JOIN users u ON u.id=tp.user_id
        LEFT JOIN bookings b ON b.id=cs.booking_id
        LEFT JOIN availability_slots s ON s.id=b.slot_id
        WHERE cs.student_id=$1 ORDER BY COALESCE(s.start_time,cs.created_at) DESC LIMIT 20`, [req.user.id]),
      query(`SELECT * FROM career_cv_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [req.user.id]),
      query(`SELECT * FROM career_user_goals WHERE user_id=$1 LIMIT 1`, [req.user.id]),
      query(`SELECT COUNT(*)::int AS attempts, COALESCE(ROUND(AVG(confidence),1),0) AS avg_confidence
        FROM career_practice_attempts WHERE user_id=$1`, [req.user.id]),
      query(`SELECT tp.id AS tutor_id,tp.user_id,u.full_name,u.avatar_url,tp.professional_title,tp.bio,tp.hourly_rate,
        tp.experience_years,COALESCE(AVG(r.rating),0)::numeric(3,2) AS rating,COUNT(r.id)::int AS review_count
        FROM tutor_profiles tp JOIN users u ON u.id=tp.user_id LEFT JOIN reviews r ON r.tutor_id=tp.id
        WHERE lower(COALESCE(tp.professional_title,'')) ~ '(career|recrut|rh|emploi|soft|coach|mentor)'
        OR lower(COALESCE(tp.bio,'')) ~ '(career|recrut|entretien|cv|emploi)'
        GROUP BY tp.id,u.id ORDER BY rating DESC,experience_years DESC LIMIT 6`),
      query(`SELECT cpa.*, ciq.question, ciq.category FROM career_practice_attempts cpa
        LEFT JOIN career_interview_questions ciq ON ciq.id=cpa.question_id
        WHERE cpa.user_id=$1 ORDER BY cpa.completed_at DESC LIMIT 30`, [req.user.id])
    ]);
    ok(res, {
      resources: resources.rows,
      questions: questions.rows,
      sessions: sessions.rows,
      cv_submissions: cvs.rows,
      goals: goals.rows[0] || null,
      stats: stats.rows[0],
      mentors: mentors.rows,
      attempts: attempts.rows
    });
  } catch (e) { fail(res,e); }
});

router.post('/career/practice', requireAuth, async (req,res) => {
  try {
    const { question_id, answer_text='', confidence=3 } = req.body || {};
    const r=await query(`INSERT INTO career_practice_attempts(user_id,question_id,answer_text,confidence)
      VALUES($1,$2,$3,$4) RETURNING *`,[req.user.id,question_id||null,String(answer_text).trim(),Math.max(1,Math.min(5,Number(confidence)||3))]);
    ok(res,{attempt:r.rows[0]},201);
  } catch(e){ fail(res,e); }
});



router.post('/career/cv', requireAuth, careerUpload.single('file'), async (req,res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier CV requis.' });
    const allowed = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
    if (!allowed.has(req.file.mimetype)) return res.status(400).json({ error: 'Format accepté : PDF, DOC ou DOCX.' });
    const stored = await uploadBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      folder: `career/${req.user.id}/cv`
    });
    const title = String(req.body?.title || req.file.originalname || 'Mon CV').trim().slice(0,255);
    const r = await query(`INSERT INTO career_cv_submissions(user_id,title,file_url,file_name,mime_type,status)
      VALUES($1,$2,$3,$4,$5,'submitted') RETURNING *`,
      [req.user.id,title,stored.publicUrl,req.file.originalname,req.file.mimetype]);
    ok(res,{submission:r.rows[0]},201);
  } catch(e){ fail(res,e); }
});

router.post('/career/goals', requireAuth, async (req,res) => {
  try {
    const { target_role='',target_sector='',target_location='',interview_date=null,weekly_target=3 }=req.body||{};
    const r=await query(`INSERT INTO career_user_goals(user_id,target_role,target_sector,target_location,interview_date,weekly_target)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(user_id) DO UPDATE SET target_role=$2,target_sector=$3,target_location=$4,interview_date=$5,weekly_target=$6,updated_at=now()
      RETURNING *`,[req.user.id,target_role,target_sector,target_location,interview_date||null,Math.max(1,Math.min(14,Number(weekly_target)||3))]);
    ok(res,{goals:r.rows[0]});
  } catch(e){ fail(res,e); }
});


// -----------------------------------------------------------------------------
// MON ESPACE D'ETUDE PRIVE
// -----------------------------------------------------------------------------
router.get('/study-space/dashboard', requireAuth, async (req,res) => {
  try {
    const [tasks,events,notes,goals,focus,distractions,bookings,learning,materials] = await Promise.all([
      query(`SELECT * FROM study_tasks WHERE user_id=$1 AND (completed_at IS NULL OR completed_at >= CURRENT_DATE) ORDER BY completed_at NULLS FIRST, due_at NULLS LAST, created_at`,[req.user.id]),
      query(`SELECT * FROM study_planner_events WHERE user_id=$1 AND start_at >= date_trunc('day',now()) - interval '1 day' AND start_at < date_trunc('day',now()) + interval '8 days' ORDER BY start_at`,[req.user.id]),
      query(`SELECT * FROM study_notes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 12`,[req.user.id]),
      query(`SELECT g.*, COALESCE(json_agg(json_build_object('id',m.id,'title',m.title,'position',m.position,'completed_at',m.completed_at) ORDER BY m.position) FILTER (WHERE m.id IS NOT NULL),'[]'::json) milestones
        FROM study_goals g LEFT JOIN study_goal_milestones m ON m.goal_id=g.id WHERE g.user_id=$1 AND g.status='active' GROUP BY g.id ORDER BY g.created_at`,[req.user.id]),
      query(`SELECT * FROM study_focus_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 50`,[req.user.id]),
      query(`SELECT * FROM study_distractions WHERE user_id=$1 AND resolved_at IS NULL ORDER BY created_at DESC LIMIT 20`,[req.user.id]),
      query(`SELECT b.*, s.start_time, s.end_time, u.full_name AS tutor_name, u.avatar_url AS tutor_avatar
        FROM bookings b
        JOIN availability_slots s ON s.id=b.slot_id
        JOIN tutor_profiles tp ON tp.id=b.tutor_id
        JOIN users u ON u.id=tp.user_id
        WHERE b.student_id=$1 AND s.start_time >= now() AND b.status IN ('confirmed','pending')
        ORDER BY s.start_time LIMIT 5`,[req.user.id]),
      query(`SELECT ce.*,c.title,c.cover_url,COALESCE(ce.progress_percent,0) progress_percent FROM course_enrollments ce JOIN courses c ON c.id=ce.course_id WHERE ce.user_id=$1 ORDER BY ce.updated_at DESC LIMIT 6`,[req.user.id]),
      query(`SELECT cf.*,c.title AS course_title FROM course_files cf JOIN courses c ON c.id=cf.course_id JOIN course_enrollments ce ON ce.course_id=c.id AND ce.user_id=$1 ORDER BY cf.created_at DESC LIMIT 6`,[req.user.id])
    ]);
    ok(res,{tasks:tasks.rows,events:events.rows,notes:notes.rows,goals:goals.rows,focus_sessions:focus.rows,distractions:distractions.rows,bookings:bookings.rows,learning:learning.rows,materials:materials.rows});
  } catch(e){ fail(res,e); }
});

router.post('/study-space/tasks', requireAuth, async (req,res) => {
  try { const {title,description='',category='Général',priority='medium',due_at=null,estimated_minutes=30,color='#1768ff'}=req.body||{};
    if(!String(title||'').trim()) return res.status(400).json({error:'Titre requis.'});
    const r=await query(`INSERT INTO study_tasks(user_id,title,description,category,priority,due_at,estimated_minutes,color) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.id,String(title).trim(),description,category,priority,due_at||null,Number(estimated_minutes)||30,color]);
    ok(res,{task:r.rows[0]},201);
  } catch(e){ fail(res,e); }
});
router.patch('/study-space/tasks/:id', requireAuth, async (req,res) => {
  try { const fields=req.body||{}; const current=(await query('SELECT * FROM study_tasks WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0]; if(!current) return res.status(404).json({error:'Tâche introuvable.'});
    const r=await query(`UPDATE study_tasks SET title=$1,description=$2,category=$3,priority=$4,due_at=$5,estimated_minutes=$6,color=$7,completed_at=$8,updated_at=now() WHERE id=$9 AND user_id=$10 RETURNING *`,[
      fields.title??current.title,fields.description??current.description,fields.category??current.category,fields.priority??current.priority,fields.due_at===undefined?current.due_at:fields.due_at,Number(fields.estimated_minutes??current.estimated_minutes),fields.color??current.color,fields.completed===undefined?current.completed_at:(fields.completed?new Date():null),req.params.id,req.user.id]);
    ok(res,{task:r.rows[0]});
  } catch(e){ fail(res,e); }
});
router.delete('/study-space/tasks/:id', requireAuth, async (req,res)=>{ try{ await query('DELETE FROM study_tasks WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]); ok(res,{ok:true}); }catch(e){fail(res,e);} });

router.post('/study-space/events', requireAuth, async (req,res)=>{ try{ const {title,description='',category='Étude',color='#1768ff',start_at,end_at,location=''}=req.body||{}; if(!title||!start_at||!end_at) return res.status(400).json({error:'Titre, début et fin requis.'}); const r=await query(`INSERT INTO study_planner_events(user_id,title,description,category,color,start_at,end_at,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.id,title,description,category,color,start_at,end_at,location]); ok(res,{event:r.rows[0]},201);}catch(e){fail(res,e);} });
router.patch('/study-space/events/:id', requireAuth, async(req,res)=>{ try{const c=(await query('SELECT * FROM study_planner_events WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0]; if(!c)return res.status(404).json({error:'Bloc introuvable.'}); const b=req.body||{}; const r=await query(`UPDATE study_planner_events SET title=$1,description=$2,category=$3,color=$4,start_at=$5,end_at=$6,location=$7,updated_at=now() WHERE id=$8 AND user_id=$9 RETURNING *`,[b.title??c.title,b.description??c.description,b.category??c.category,b.color??c.color,b.start_at??c.start_at,b.end_at??c.end_at,b.location??c.location,req.params.id,req.user.id]); ok(res,{event:r.rows[0]});}catch(e){fail(res,e);} });
router.delete('/study-space/events/:id', requireAuth, async(req,res)=>{try{await query('DELETE FROM study_planner_events WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);ok(res,{ok:true});}catch(e){fail(res,e);}});

router.post('/study-space/focus', requireAuth, async(req,res)=>{try{const {subject='Session d’étude',objective='Avancer sur mon apprentissage',mode='50/10',planned_minutes=50,category='Étude'}=req.body||{}; const r=await query(`INSERT INTO study_focus_sessions(user_id,subject,objective,mode,planned_minutes,category) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,subject,objective,mode,Number(planned_minutes)||50,category]);ok(res,{session:r.rows[0]},201);}catch(e){fail(res,e);}});
router.patch('/study-space/focus/:id', requireAuth, async(req,res)=>{try{const c=(await query('SELECT * FROM study_focus_sessions WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!c)return res.status(404).json({error:'Session introuvable.'});const b=req.body||{};const status=b.status??c.status;const r=await query(`UPDATE study_focus_sessions SET elapsed_seconds=$1,focus_score=$2,status=$3,ended_at=CASE WHEN $3 IN ('completed','abandoned') THEN COALESCE(ended_at,now()) ELSE ended_at END,updated_at=now() WHERE id=$4 AND user_id=$5 RETURNING *`,[Number(b.elapsed_seconds??c.elapsed_seconds),b.focus_score??c.focus_score,status,req.params.id,req.user.id]);ok(res,{session:r.rows[0]});}catch(e){fail(res,e);}});
router.post('/study-space/distractions', requireAuth, async(req,res)=>{try{const content=String(req.body?.content||'').trim();if(!content)return res.status(400).json({error:'Contenu requis.'});const r=await query('INSERT INTO study_distractions(user_id,focus_session_id,content) VALUES($1,$2,$3) RETURNING *',[req.user.id,req.body?.focus_session_id||null,content]);ok(res,{distraction:r.rows[0]},201);}catch(e){fail(res,e);}});
router.patch('/study-space/distractions/:id', requireAuth, async(req,res)=>{try{const r=await query(`UPDATE study_distractions SET resolved_at=CASE WHEN $1 THEN now() ELSE NULL END WHERE id=$2 AND user_id=$3 RETURNING *`,[Boolean(req.body?.resolved),req.params.id,req.user.id]);ok(res,{distraction:r.rows[0]});}catch(e){fail(res,e);}});

router.post('/study-space/notes', requireAuth, async(req,res)=>{try{const {title='Nouvelle note',content='',category='Toutes les notes',tags=[],favorite=false}=req.body||{};const r=await query(`INSERT INTO study_notes(user_id,title,content,category,tags,favorite) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,title,content,category,Array.isArray(tags)?tags:[],Boolean(favorite)]);ok(res,{note:r.rows[0]},201);}catch(e){fail(res,e);}});
router.patch('/study-space/notes/:id', requireAuth, async(req,res)=>{try{const c=(await query('SELECT * FROM study_notes WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!c)return res.status(404).json({error:'Note introuvable.'});const b=req.body||{};const r=await query(`UPDATE study_notes SET title=$1,content=$2,category=$3,tags=$4,favorite=$5,updated_at=now() WHERE id=$6 AND user_id=$7 RETURNING *`,[b.title??c.title,b.content??c.content,b.category??c.category,Array.isArray(b.tags)?b.tags:c.tags,b.favorite===undefined?c.favorite:Boolean(b.favorite),req.params.id,req.user.id]);ok(res,{note:r.rows[0]});}catch(e){fail(res,e);}});
router.delete('/study-space/notes/:id', requireAuth, async(req,res)=>{try{await query('DELETE FROM study_notes WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);ok(res,{ok:true});}catch(e){fail(res,e);}});

router.post('/study-space/goals', requireAuth, async(req,res)=>{try{const {title,description='',category='Apprentissage',color='#1768ff',target_date=null,effort_hours_per_week=3,priority='medium',milestones=[]}=req.body||{};if(!title)return res.status(400).json({error:'Titre requis.'});const client=await pool.connect();try{await client.query('BEGIN');const g=(await client.query(`INSERT INTO study_goals(user_id,title,description,category,color,target_date,effort_hours_per_week,priority) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.user.id,title,description,category,color,target_date||null,Number(effort_hours_per_week)||3,priority])).rows[0];for(let i=0;i<milestones.length;i++)await client.query('INSERT INTO study_goal_milestones(goal_id,title,position) VALUES($1,$2,$3)',[g.id,milestones[i],i+1]);await client.query('COMMIT');ok(res,{goal:g},201);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}catch(e){fail(res,e);}});
router.patch('/study-space/goals/:id', requireAuth, async(req,res)=>{try{const c=(await query('SELECT * FROM study_goals WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!c)return res.status(404).json({error:'Objectif introuvable.'});const b=req.body||{};const r=await query(`UPDATE study_goals SET title=$1,description=$2,category=$3,color=$4,target_date=$5,effort_hours_per_week=$6,priority=$7,progress_percent=$8,status=$9,updated_at=now() WHERE id=$10 AND user_id=$11 RETURNING *`,[b.title??c.title,b.description??c.description,b.category??c.category,b.color??c.color,b.target_date===undefined?c.target_date:b.target_date,Number(b.effort_hours_per_week??c.effort_hours_per_week),b.priority??c.priority,Math.max(0,Math.min(100,Number(b.progress_percent??c.progress_percent))),b.status??c.status,req.params.id,req.user.id]);ok(res,{goal:r.rows[0]});}catch(e){fail(res,e);}});
router.post('/study-space/milestones/:id/toggle', requireAuth, async(req,res)=>{try{const r=await query(`UPDATE study_goal_milestones m SET completed_at=CASE WHEN completed_at IS NULL THEN now() ELSE NULL END FROM study_goals g WHERE m.id=$1 AND m.goal_id=g.id AND g.user_id=$2 RETURNING m.*`,[req.params.id,req.user.id]);if(!r.rows[0])return res.status(404).json({error:'Étape introuvable.'});const goalId=(await query('SELECT goal_id FROM study_goal_milestones WHERE id=$1',[req.params.id])).rows[0].goal_id;const stats=(await query(`SELECT COUNT(*)::int total,COUNT(completed_at)::int done FROM study_goal_milestones WHERE goal_id=$1`,[goalId])).rows[0];const progress=stats.total?Math.round(stats.done*10000/stats.total)/100:0;await query(`UPDATE study_goals SET progress_percent=$1,status=CASE WHEN $1>=100 THEN 'completed' ELSE 'active' END,updated_at=now() WHERE id=$2`,[progress,goalId]);ok(res,{milestone:r.rows[0],progress_percent:progress});}catch(e){fail(res,e);}});

router.get('/study-space/stats', requireAuth, async(req,res)=>{try{const [summary,daily,subjects,goals] = await Promise.all([
  query(`SELECT COALESCE(SUM(elapsed_seconds),0)::int total_seconds,COUNT(*)::int sessions,COALESCE(ROUND(AVG(focus_score),1),0) avg_focus,COUNT(*) FILTER (WHERE status='completed')::int completed_sessions FROM study_focus_sessions WHERE user_id=$1 AND started_at>=CURRENT_DATE-INTERVAL '30 days'`,[req.user.id]),
  query(`SELECT DATE(started_at) day,COALESCE(SUM(elapsed_seconds),0)::int seconds,COUNT(*)::int sessions,COALESCE(ROUND(AVG(focus_score),1),0) focus FROM study_focus_sessions WHERE user_id=$1 AND started_at>=CURRENT_DATE-INTERVAL '13 days' GROUP BY DATE(started_at) ORDER BY day`,[req.user.id]),
  query(`SELECT category,COALESCE(SUM(elapsed_seconds),0)::int seconds FROM study_focus_sessions WHERE user_id=$1 AND started_at>=CURRENT_DATE-INTERVAL '30 days' GROUP BY category ORDER BY seconds DESC`,[req.user.id]),
  query(`SELECT COUNT(*)::int total,COUNT(*) FILTER (WHERE status='completed')::int completed,COALESCE(ROUND(AVG(progress_percent),0),0) avg_progress FROM study_goals WHERE user_id=$1`,[req.user.id])
]);ok(res,{summary:summary.rows[0],daily:daily.rows,subjects:subjects.rows,goals:goals.rows[0]});}catch(e){fail(res,e);}});

export default router;
