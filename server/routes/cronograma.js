import express from 'express';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    // Obtener el rol y project_id actual del usuario en la base de datos
    const userRes = await db.query('SELECT project_id, role FROM users WHERE id = $1', [req.user.id]);
    
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { project_id, role } = userRes.rows[0];

    let result;
    if (role === 'coordinator') {
      // Coordinadores ven todos los hitos programados
      result = await db.query('SELECT * FROM milestones ORDER BY event_date ASC');
    } else if (role === 'tutor') {
      // Tutores ven hitos globales e hitos de proyectos que tienen estudiantes asignados bajo su tutoría
      result = await db.query(
        `SELECT DISTINCT m.* FROM milestones m
         LEFT JOIN users u ON m.project_id = u.project_id
         WHERE m.project_id IS NULL OR u.tutor_id = $1
         ORDER BY m.event_date ASC`,
        [req.user.id]
      );
    } else {
      // Estudiantes ven hitos globales e hitos específicos de su propio proyecto comunitario
      if (project_id) {
        result = await db.query(
          'SELECT * FROM milestones WHERE project_id IS NULL OR project_id = $1 ORDER BY event_date ASC',
          [project_id]
        );
      } else {
        result = await db.query('SELECT * FROM milestones WHERE project_id IS NULL ORDER BY event_date ASC');
      }
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
