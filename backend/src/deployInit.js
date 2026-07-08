import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, query } from './db.js';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(backendRoot, 'migrations');

const migrationFiles = [
  'schema.sql',
  '002_add_messages.sql',
  '003_studylink_complete_modules.sql',
  '005_message_attachments.sql',
  '007_calls_webrtc.sql',
  '008_user_profiles.sql',
  '006_complete_python_course.sql',
  '010_full_catalogue_content.sql',
  '011_complete_all_catalogue_courses.sql',
  '012_complete_personal_development.sql',
  '013_complete_career_module.sql',
  '014_rich_career_content.sql',
  '015_complete_study_space.sql',
  '016_remove_study_space_demo_data.sql',
];

async function hasTable(tableName) {
  const result = await query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName]
  );
  return result.rows[0]?.exists === true;
}

async function createMigrationTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function runMigration(fileName) {
  const alreadyApplied = await query('SELECT 1 FROM schema_migrations WHERE name = $1', [fileName]);
  if (alreadyApplied.rowCount > 0) {
    console.log(`- ${fileName} deja appliquee`);
    return;
  }

  const sql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');
  console.log(`- Application de ${fileName}`);
  await query(sql);
  await query('INSERT INTO schema_migrations (name) VALUES ($1)', [fileName]);
}

async function createRenderCourseFilesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS course_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255),
      mime_type VARCHAR(150),
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_course_files_course ON course_files(course_id, created_at DESC)');
  await query(
    `INSERT INTO schema_migrations (name) VALUES ($1)
     ON CONFLICT (name) DO NOTHING`,
    ['004_admin_storage_uploads_render_safe.sql']
  );
}

async function ensureAdminUser() {
  const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admin.rowCount > 0) return;

  const passwordHash = await bcrypt.hash('password123', 10);
  await query(
    `INSERT INTO users (email, password_hash, full_name, role, avatar_url)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email) DO UPDATE SET role = 'admin'
     RETURNING id`,
    ['admin@studylink.com', passwordHash, 'Admin StudyLink', 'https://i.pravatar.cc/150?img=13']
  );
  console.log('- Compte admin cree: admin@studylink.com / password123');
}

async function seedDemoUsersIfNeeded() {
  const userCount = await query('SELECT COUNT(*)::int AS count FROM users');
  if (userCount.rows[0].count > 0) return;

  console.log('- Base vide: ajout des utilisateurs de demonstration');
  await execFileAsync(process.execPath, ['src/seed.js'], {
    cwd: backendRoot,
    env: process.env,
    windowsHide: true,
  });
}

async function main() {
  console.log('Initialisation Render de la base StudyLink...');
  await createMigrationTable();

  if (!(await hasTable('users'))) {
    await runMigration('schema.sql');
  } else {
    await query(
      `INSERT INTO schema_migrations (name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      ['schema.sql']
    );
  }

  for (const fileName of migrationFiles.filter((name) => name !== 'schema.sql')) {
    if (fileName === '006_complete_python_course.sql') {
      await seedDemoUsersIfNeeded();
      await ensureAdminUser();
    }

    await runMigration(fileName);

    if (fileName === '003_studylink_complete_modules.sql') {
      await createRenderCourseFilesTable();
    }
  }

  await seedDemoUsersIfNeeded();
  await ensureAdminUser();
  console.log('Base StudyLink prete.');
}

main()
  .catch((error) => {
    console.error('Erreur pendant l initialisation Render:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
