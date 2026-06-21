import express from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../db/index.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware global para asegurar que solo coordinadores accedan a estas rutas
router.use(verifyToken, checkRole(['coordinator']));

// ==========================================
// 1. CRUD DE USUARIOS (/api/admin/usuarios)
// ==========================================

// Obtener todos los usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, identification, major, role, active, tutor_id, created_at FROM users ORDER BY role DESC, name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar nuevo usuario
router.post('/usuarios', async (req, res) => {
  const { name, identification, major, role, password, tutor_id } = req.body;

  if (!name || !identification || !major || !role || !password) {
    return res.status(400).json({ error: 'Todos los campos (name, identification, major, role, password) son obligatorios.' });
  }

  try {
    // Verificar si ya existe
    const exists = await db.query('SELECT id FROM users WHERE identification = $1', [identification]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: 'La cédula ya está registrada.' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, identification, major, role, password_hash, tutor_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, identification, major, role, active, tutor_id`,
      [name, identification, major, role, passwordHash, tutor_id ? parseInt(tutor_id) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar usuario
router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { name, identification, major, role, password, tutor_id } = req.body;

  if (!name || !identification || !major || !role) {
    return res.status(400).json({ error: 'Nombre, Cédula, Carrera y Rol son obligatorios.' });
  }

  try {
    let result;
    if (password && password.trim() !== '') {
      // Si se proporciona una nueva contraseña, hashearla y actualizarla
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      result = await db.query(
        `UPDATE users SET name = $1, identification = $2, major = $3, role = $4, password_hash = $5, tutor_id = $6 
         WHERE id = $7 RETURNING id, name, identification, major, role, active, tutor_id`,
        [name, identification, major, role, passwordHash, tutor_id ? parseInt(tutor_id) : null, parseInt(id)]
      );
    } else {
      // Si no, actualizar sin tocar la contraseña
      result = await db.query(
        `UPDATE users SET name = $1, identification = $2, major = $3, role = $4, tutor_id = $5 
         WHERE id = $6 RETURNING id, name, identification, major, role, active, tutor_id`,
        [name, identification, major, role, tutor_id ? parseInt(tutor_id) : null, parseInt(id)]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activar/Desactivar Usuario (Toggle Active Status)
router.put('/usuarios/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  if (active === undefined) {
    return res.status(400).json({ error: 'Debe especificar el estado "active".' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET active = $1 WHERE id = $2 RETURNING id, name, identification, active',
      [!!active, parseInt(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. CRUD DEL CRONOGRAMA (/api/admin/cronograma)
// ==========================================

// Crear hito del cronograma
router.post('/cronograma', async (req, res) => {
  const { title, event_date } = req.body;

  if (!title || !event_date) {
    return res.status(400).json({ error: 'El título y la fecha son obligatorios.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO milestones (title, event_date) VALUES ($1, $2) RETURNING *',
      [title, event_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar hito del cronograma
router.delete('/cronograma/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM milestones WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Hito no encontrado.' });
    }

    res.json({ message: 'Hito eliminado con éxito', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. ESTADÍSTICAS EXPRESS (/api/admin/stats)
// ==========================================

router.get('/stats', async (req, res) => {
  try {
    // A. Cantidad de estudiantes activos
    const studentsRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND active = true");
    const activeStudents = parseInt(studentsRes.rows[0].count || 0);

    // B. Proyectos comunitarios activos (estudiantes con al menos una actividad registrada)
    const projectsRes = await db.query("SELECT COUNT(DISTINCT student_id) as count FROM activities");
    const activeProjects = parseInt(projectsRes.rows[0].count || 0);

    // C. Estudiantes que completaron las 120 horas (SUM(hours_spent) en estado 'approved' >= 120)
    const completedRes = await db.query(
      `SELECT COUNT(*) as count FROM (
         SELECT student_id, SUM(hours_spent) as total_approved 
         FROM activities 
         WHERE status = 'approved' 
         GROUP BY student_id
       ) sub WHERE total_approved >= 120`
    );
    const completedStudents = parseInt(completedRes.rows[0].count || 0);

    res.json({
      activeStudents,
      activeProjects,
      completedStudents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. LISTADO CONSOLIDADO DE BITÁCORAS (/api/admin/reportes)
// ==========================================

// Obtener todas las bitácoras para auditoría y exportación
router.get('/reportes', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as student_name, u.identification as student_identification, u.major 
       FROM activities a 
       JOIN users u ON a.student_id = u.id 
       ORDER BY a.activity_date DESC, a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
