import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/subjects - liste des matières disponibles (pour peupler les filtres)
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, name FROM subjects ORDER BY name ASC');
    res.json({ subjects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du chargement des matières.' });
  }
});

export default router;
