import { Router } from 'express';
import { pool, query } from '../db.js';

const router = Router();

// POST /api/bookings - réserver un créneau (élève uniquement)
// Utilise une transaction + verrou de ligne pour empêcher deux élèves
// de réserver le même créneau en même temps (race condition).
router.post('/', async (req, res) => {
  const { slotId, subjectId, objective } = req.body;
  if (!slotId) return res.status(400).json({ error: 'slotId est requis.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verrouille la ligne du créneau pour la durée de la transaction
    const slotResult = await client.query(
      `SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`,
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Créneau introuvable.' });
    }

    const slot = slotResult.rows[0];
    if (slot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce créneau n\'est plus disponible.' });
    }

    const tutorResult = await client.query(
      `SELECT tp.hourly_rate, tp.user_id AS tutor_user_id, u.full_name AS tutor_name
       FROM tutor_profiles tp
       JOIN users u ON u.id=tp.user_id
       WHERE tp.id = $1`,
      [slot.tutor_id]
    );
    const tutor = tutorResult.rows[0] || {};
    const hourlyRate = tutor.hourly_rate || 0;
    const hours = (new Date(slot.end_time) - new Date(slot.start_time)) / 3600000;
    const price = Math.round(hourlyRate * hours * 100) / 100;

    const bookingResult = await client.query(
      `INSERT INTO bookings (student_id, tutor_id, slot_id, subject_id, status, price, objective)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6)
       RETURNING *`,
      [req.user.id, slot.tutor_id, slotId, subjectId || null, price, objective || null]
    );

    await client.query(
      `UPDATE availability_slots SET status = 'booked' WHERE id = $1`,
      [slotId]
    );

    const studentResult = await client.query('SELECT full_name FROM users WHERE id=$1', [req.user.id]);
    const studentName = studentResult.rows[0]?.full_name || 'Un apprenant';
    const booking = bookingResult.rows[0];
    const actionUrl = `/sessions/${booking.id}`;

    if (tutor.tutor_user_id) {
      await client.query(`INSERT INTO notifications(user_id,type,title,body,data,action_url)
        VALUES($1,'booking',$2,$3,$4::jsonb,$5)`, [
        tutor.tutor_user_id,
        'Nouvelle réservation',
        `${studentName} a réservé un créneau avec vous.`,
        JSON.stringify({ booking_id: booking.id, slot_id: slotId }),
        actionUrl
      ]);
    }

    await client.query(`INSERT INTO notifications(user_id,type,title,body,data,action_url)
      VALUES($1,'booking',$2,$3,$4::jsonb,$5)`, [
      req.user.id,
      'Réservation confirmée',
      `Votre rendez-vous avec ${tutor.tutor_name || 'votre tuteur'} est confirmé.`,
      JSON.stringify({ booking_id: booking.id, slot_id: slotId }),
      actionUrl
    ]);

    await client.query('COMMIT');
    res.status(201).json({ booking });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la réservation.' });
  } finally {
    client.release();
  }
});

// GET /api/bookings/me - liste des réservations de l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    let sql, params;

    if (req.user.role === 'tutor') {
      sql = `
        SELECT b.*, s.start_time, s.end_time, u.full_name AS student_name, u.avatar_url AS student_avatar_url,
               sub.name AS subject_name
        FROM bookings b
        JOIN availability_slots s ON s.id = b.slot_id
        JOIN users u ON u.id = b.student_id
        JOIN tutor_profiles tp ON tp.id = b.tutor_id
        LEFT JOIN subjects sub ON sub.id = b.subject_id
        WHERE tp.user_id = $1
        ORDER BY s.start_time DESC`;
      params = [req.user.id];
    } else {
      sql = `
        SELECT b.*, s.start_time, s.end_time, u.full_name AS tutor_name, u.avatar_url AS tutor_avatar_url,
               sub.name AS subject_name
        FROM bookings b
        JOIN availability_slots s ON s.id = b.slot_id
        JOIN tutor_profiles tp ON tp.id = b.tutor_id
        JOIN users u ON u.id = tp.user_id
        LEFT JOIN subjects sub ON sub.id = b.subject_id
        WHERE b.student_id = $1
        ORDER BY s.start_time DESC`;
      params = [req.user.id];
    }

    const result = await query(sql, params);
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement des réservations.' });
  }
});


// GET /api/bookings/:id - détail d'une réservation appartenant à l'utilisateur connecté
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, s.start_time, s.end_time, sub.name AS subject_name,
        tu.full_name AS tutor_name, tu.avatar_url AS tutor_avatar_url, tu.id AS tutor_user_id,
        su.full_name AS student_name, su.avatar_url AS student_avatar_url, su.id AS student_user_id,
        tp.headline AS tutor_headline
      FROM bookings b
      JOIN availability_slots s ON s.id=b.slot_id
      JOIN tutor_profiles tp ON tp.id=b.tutor_id
      JOIN users tu ON tu.id=tp.user_id
      JOIN users su ON su.id=b.student_id
      LEFT JOIN subjects sub ON sub.id=b.subject_id
      WHERE b.id=$1 AND (b.student_id=$2 OR tp.user_id=$2)
      LIMIT 1`, [req.params.id, req.user.id]);
    const booking = result.rows[0];
    if (!booking) return res.status(404).json({ error: 'Session introuvable.' });
    const materials = (await query('SELECT * FROM session_materials WHERE booking_id=$1 ORDER BY created_at DESC', [req.params.id])).rows;
    res.json({ booking, materials });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement de la session.' });
  }
});

// PATCH /api/bookings/:id/cancel - annuler une réservation
router.patch('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Réservation introuvable.' });
    }
    const booking = bookingResult.rows[0];

    // Vérifie que l'utilisateur est bien l'élève de cette réservation
    if (booking.student_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Vous ne pouvez annuler que vos propres réservations.' });
    }

    await client.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [booking.id]);
    await client.query(`UPDATE availability_slots SET status = 'available' WHERE id = $1`, [booking.slot_id]);

    const tutorUserResult = await client.query('SELECT user_id FROM tutor_profiles WHERE id=$1', [booking.tutor_id]);
    const tutorUserId = tutorUserResult.rows[0]?.user_id;
    if (tutorUserId) {
      await client.query(`INSERT INTO notifications(user_id,type,title,body,data,action_url)
        VALUES($1,'booking','Réservation annulée','Un apprenant a annulé une réservation.',$2::jsonb,$3)`, [
        tutorUserId,
        JSON.stringify({ booking_id: booking.id }),
        `/sessions/${booking.id}`
      ]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Réservation annulée.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'annulation." });
  } finally {
    client.release();
  }
});

export default router;
