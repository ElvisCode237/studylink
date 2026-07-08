import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/reviews - laisser un avis après une session (élève uniquement)
router.post('/', async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'bookingId et rating sont requis.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5.' });
    }

    const bookingResult = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Réservation introuvable.' });
    }
    const booking = bookingResult.rows[0];

    if (booking.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez noter que vos propres sessions.' });
    }

    const result = await query(
      `INSERT INTO reviews (booking_id, student_id, tutor_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, req.user.id, booking.tutor_id, rating, comment || null]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cette session a déjà été notée.' });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'avis." });
  }
});

export default router;
