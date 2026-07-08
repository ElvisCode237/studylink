import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Vérifie que l'utilisateur connecté fait bien partie de la réservation (élève ou tuteur)
async function assertParticipant(bookingId, userId) {
  const result = await query(
    `SELECT b.id, b.student_id, tp.user_id AS tutor_user_id
     FROM bookings b
     JOIN tutor_profiles tp ON tp.id = b.tutor_id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (result.rows.length === 0) return { ok: false, status: 404, error: 'Réservation introuvable.' };
  const booking = result.rows[0];
  if (booking.student_id !== userId && booking.tutor_user_id !== userId) {
    return { ok: false, status: 403, error: 'Vous ne faites pas partie de cette session.' };
  }
  return { ok: true };
}

// GET /api/materials/booking/:bookingId - liste du matériel partagé pour une session
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const check = await assertParticipant(bookingId, req.user.id);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `SELECT m.id, m.file_name, m.file_url, m.created_at, u.full_name AS uploaded_by_name
       FROM session_materials m
       JOIN users u ON u.id = m.uploaded_by
       WHERE m.booking_id = $1
       ORDER BY m.created_at DESC`,
      [bookingId]
    );
    res.json({ materials: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement du matériel.' });
  }
});

// POST /api/materials - ajouter un document/lien à une session (élève ou tuteur concerné)
router.post('/', async (req, res) => {
  try {
    const { bookingId, fileName, fileUrl } = req.body;
    if (!bookingId || !fileName || !fileUrl) {
      return res.status(400).json({ error: 'bookingId, fileName et fileUrl sont requis.' });
    }

    const check = await assertParticipant(bookingId, req.user.id);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const result = await query(
      `INSERT INTO session_materials (booking_id, uploaded_by, file_name, file_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [bookingId, req.user.id, fileName, fileUrl]
    );
    res.status(201).json({ material: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout du document." });
  }
});

// DELETE /api/materials/:id - supprimer un document (uniquement celui qui l'a ajouté)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const owner = await query('SELECT uploaded_by FROM session_materials WHERE id = $1', [id]);
    if (owner.rows.length === 0) return res.status(404).json({ error: 'Document introuvable.' });
    if (owner.rows[0].uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres documents.' });
    }
    await query('DELETE FROM session_materials WHERE id = $1', [id]);
    res.json({ message: 'Document supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

export default router;
