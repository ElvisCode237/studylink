import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, query } from './db.js';

dotenv.config();

// Génère des créneaux pour les 7 prochains jours ouvrés, entre 9h et 17h
function buildSlots(daysAhead = 7) {
  const slots = [];
  const now = new Date();
  for (let d = 1; d <= daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    if (day.getDay() === 0 || day.getDay() === 6) continue; // saute le week-end
    for (let hour = 9; hour < 17; hour++) {
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1, 0, 0, 0);
      // Statut aléatoire pour simuler un agenda réaliste (comme la maquette)
      const roll = Math.random();
      const status = roll < 0.6 ? 'available' : roll < 0.85 ? 'booked' : 'busy';
      slots.push({ start, end, status });
    }
  }
  return slots;
}

async function seed() {
  console.log('🌱 Démarrage du seed...');
  const passwordHash = await bcrypt.hash('password123', 10);

  await query('TRUNCATE reviews, bookings, availability_slots, tutor_subjects, tutor_profiles, users RESTART IDENTITY CASCADE');

  const subjectsRes = await query('SELECT id, name FROM subjects');
  const subjectMap = Object.fromEntries(subjectsRes.rows.map((s) => [s.name, s.id]));

  const tutorsData = [
    {
      email: 'emily.chen@studylink.com',
      fullName: 'Dr. Emily Chen',
      headline: "Master's Degree in Mathematics",
      bio: "J'enseigne les mathématiques depuis plus de 8 ans, du lycée jusqu'au niveau universitaire. Approche pédagogique basée sur la pratique.",
      hourlyRate: 45,
      masteryLevel: 'Master\'s Degree',
      years: 8,
      subjects: ['Mathématiques', 'Français'],
      avatar: 'https://i.pravatar.cc/150?img=47',
    },
    {
      email: 'ranth.thang@studylink.com',
      fullName: 'Dr. Ranth Thang',
      headline: 'Native Speaker - Physics Expert',
      bio: 'Docteur en physique, je rends les concepts complexes accessibles avec des exemples concrets et des expériences.',
      hourlyRate: 50,
      masteryLevel: 'Native Speaker',
      years: 10,
      subjects: ['Physique'],
      avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
      email: 'lirn.bren@studylink.com',
      fullName: 'Dr. Lirn Bren',
      headline: '5 Years Experience - Mathematics',
      bio: 'Spécialiste de la préparation aux examens, je propose un suivi personnalisé et des exercices ciblés.',
      hourlyRate: 35,
      masteryLevel: '5 Years Experience',
      years: 5,
      subjects: ['Mathématiques'],
      avatar: 'https://i.pravatar.cc/150?img=33',
    },
    {
      email: 'sofia.moreau@studylink.com',
      fullName: 'Sofia Moreau',
      headline: 'Native French Speaker',
      bio: "Professeure de français langue étrangère, j'adapte mes cours à tous les niveaux, du débutant à l'avancé.",
      hourlyRate: 30,
      masteryLevel: 'Native Speaker',
      years: 6,
      subjects: ['Français'],
      avatar: 'https://i.pravatar.cc/150?img=45',
    },
  ];

  const tutorProfileIds = {};

  for (const t of tutorsData) {
    const userRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_url)
       VALUES ($1, $2, $3, 'tutor', $4) RETURNING id`,
      [t.email, passwordHash, t.fullName, t.avatar]
    );
    const userId = userRes.rows[0].id;

    const profileRes = await query(
      `INSERT INTO tutor_profiles (user_id, headline, bio, hourly_rate, mastery_level, years_experience)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, t.headline, t.bio, t.hourlyRate, t.masteryLevel, t.years]
    );
    const tutorId = profileRes.rows[0].id;
    tutorProfileIds[t.email] = tutorId;

    for (const subjName of t.subjects) {
      if (subjectMap[subjName]) {
        await query(
          'INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES ($1, $2)',
          [tutorId, subjectMap[subjName]]
        );
      }
    }

    const slots = buildSlots();
    for (const slot of slots) {
      await query(
        `INSERT INTO availability_slots (tutor_id, start_time, end_time, status)
         VALUES ($1, $2, $3, $4)`,
        [tutorId, slot.start, slot.end, slot.status]
      );
    }
  }

  // Un élève de démo
  await query(
    `INSERT INTO users (email, password_hash, full_name, role, avatar_url)
     VALUES ($1, $2, $3, 'student', $4)`,
    ['student@studylink.com', passwordHash, 'Alex Martin', 'https://i.pravatar.cc/150?img=68']
  );

  console.log('✅ Seed terminé !');
  console.log('   Comptes de démo (mot de passe : password123) :');
  tutorsData.forEach((t) => console.log(`   - Tuteur : ${t.email}`));
  console.log('   - Élève  : student@studylink.com');

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Erreur pendant le seed :', err);
  process.exit(1);
});
