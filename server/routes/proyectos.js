import express from 'express';
import fs from 'fs';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

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

// Registrar nuevo proyecto histórico con PDF
router.post('/', verifyToken, (req, res, next) => {
  // Solo el coordinador puede agregar proyectos al repositorio
  if (req.user.role !== 'coordinator') {
    return res.status(403).json({ error: 'Acceso denegado. Solo el coordinador puede agregar proyectos al repositorio.' });
  }
  
  upload.single('archivo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { title, community, major, academic_year, summary } = req.body;

  if (!title || !major || !academic_year) {
    // Si se subió un archivo, lo borramos para no dejar basura
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(400).json({ error: 'El título, la carrera y el año académico son obligatorios.' });
  }

  try {
    const relativePath = req.file ? `uploads/historico/${req.file.filename}` : null;
    
    const result = await db.query(
      `INSERT INTO historical_projects (title, community, major, academic_year, summary, ruta_archivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title.trim(), 
        community ? community.trim() : 'N/A', 
        major.trim(), 
        parseInt(academic_year, 10), 
        summary ? summary.trim() : '', 
        relativePath
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Si falla el insert en la BD, eliminar el archivo subido
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
