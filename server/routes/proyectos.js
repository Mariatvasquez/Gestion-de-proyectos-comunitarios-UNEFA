import express from 'express';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Obtener repositorio de proyectos históricos
router.get('/', verifyToken, async (req, res) => {
  const { query: searchQuery } = req.query;
  try {
    const result = await db.query('SELECT * FROM historical_projects ORDER BY academic_year DESC, title ASC');
    let projects = result.rows;

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      projects = projects.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.community.toLowerCase().includes(q) || 
        p.major.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q))
      );
    }
    
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
