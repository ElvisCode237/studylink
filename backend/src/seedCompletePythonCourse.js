import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(__dirname, '../migrations/006_complete_python_course.sql');

try {
  const sql = await fs.readFile(migrationPath, 'utf8');
  await pool.query(sql);
  console.log('✓ Cours Python complet ajouté ou mis à jour dans la base StudyLink.');
} catch (error) {
  console.error('Échec du seed Python :', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
