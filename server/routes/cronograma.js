import express from 'express';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener cronograma académico (Disponible para todos los usuarios autenticados)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM milestones ORDER BY event_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
