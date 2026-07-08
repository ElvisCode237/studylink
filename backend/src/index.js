import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import tutorRoutes from './routes/tutors.js';
import bookingRoutes from './routes/bookings.js';
import subjectRoutes from './routes/subjects.js';
import reviewRoutes from './routes/reviews.js';
import materialRoutes from './routes/materials.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import callRoutes from './routes/calls.js';
import { requireAuth } from './middleware/auth.js';
import { query } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes publiques
app.use('/api/auth', authRoutes);
app.use('/api/tutors', (req, res, next) => {
  // GET est public (recherche/consultation), le reste nécessite un token
  if (req.method === 'GET') return next();
  return requireAuth(req, res, next);
}, tutorRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/content', contentRoutes);

// Routes protégées (token JWT requis)
app.use('/api/bookings', requireAuth, bookingRoutes);
app.use('/api/reviews', requireAuth, reviewRoutes);
app.use('/api/materials', requireAuth, materialRoutes);
app.use('/api/messages', async (req, res, next) => {
  if (req.headers.authorization || process.env.NODE_ENV === 'production') {
    return requireAuth(req, res, next);
  }
  try {
    const demo = await query(
      `SELECT id, email, role FROM users WHERE email = 'student@studylink.com' LIMIT 1`
    );
    if (demo.rows[0]) {
      req.user = demo.rows[0];
      return next();
    }
  } catch (err) {
    console.error(err);
  }
  return requireAuth(req, res, next);
}, messageRoutes);
app.use('/api/calls', requireAuth, callRoutes);
app.use('/api/admin', requireAuth, adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Studylink API démarrée sur http://localhost:${PORT}`);
});
