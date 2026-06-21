import express from 'express';
import * as db from '../db/index.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// 1. OBTENER BITÁCORAS DEL ESTUDIANTE AUTENTICADO
// GET /api/reportes/estudiante (Estudiante)
router.get('/estudiante', verifyToken, checkRole(['student']), async (req, res) => {
  const studentId = req.user.id;

  try {
    // Obtener actividades
    const activitiesResult = await db.query(
      'SELECT * FROM activities WHERE student_id = $1 ORDER BY activity_date DESC',
      [studentId]
    );
    const activities = activitiesResult.rows;

    // Calcular horas reales mediante consultas de agregación SUM() en PostgreSQL
    const approvedRes = await db.query(
      "SELECT COALESCE(SUM(hours_spent), 0) as approved FROM activities WHERE student_id = $1 AND status = 'approved'",
      [studentId]
    );
    const pendingRes = await db.query(
      "SELECT COALESCE(SUM(hours_spent), 0) as pending FROM activities WHERE student_id = $1 AND status = 'pending'",
      [studentId]
    );
    const correctRes = await db.query(
      "SELECT COALESCE(SUM(hours_spent), 0) as correct FROM activities WHERE student_id = $1 AND status = 'correct'",
      [studentId]
    );

    const approvedHours = parseInt(approvedRes.rows[0].approved);
    const pendingHours = parseInt(pendingRes.rows[0].pending);
    const correctHours = parseInt(correctRes.rows[0].correct);

    res.json({
      activities,
      summary: {
        approved: approvedHours,
        pending: pendingHours,
        correct: correctHours,
        total: approvedHours + pendingHours + correctHours,
        remaining: Math.max(120 - approvedHours, 0),
        percentage: Math.min(Math.round((approvedHours / 120) * 100), 100)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. REGISTRAR UNA NUEVA ACTIVIDAD
// POST /api/reportes (Estudiante)
router.post('/', verifyToken, checkRole(['student']), async (req, res) => {
  const studentId = req.user.id;
  const {
    activity_date,
    hours_spent,
    description,
    physical_attendance,
    spokesperson_name,
    spokesperson_phone,
    sworn_statement
  } = req.body;

  // Validaciones
  if (!activity_date || !hours_spent || !description || !spokesperson_name || !spokesperson_phone) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const hours = parseInt(hours_spent);
  if (isNaN(hours) || hours < 1 || hours > 8) {
    return res.status(400).json({ error: 'Las horas invertidas deben ser entre 1 y 8 horas por día.' });
  }

  if (!sworn_statement) {
    return res.status(400).json({ error: 'Debe aceptar la declaración jurada para registrar la actividad.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO activities 
      (student_id, activity_date, hours_spent, description, physical_attendance, spokesperson_name, spokesperson_phone, sworn_statement, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') 
      RETURNING *`,
      [
        studentId,
        activity_date,
        hours,
        description,
        !!physical_attendance,
        spokesperson_name,
        spokesperson_phone,
        !!sworn_statement
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. EDITAR Y REENVIAR ACTIVIDAD (Estudiante - Solo si estaba en estado 'correct')
// PUT /api/reportes/:id (Estudiante)
router.put('/:id', verifyToken, checkRole(['student']), async (req, res) => {
  const { id } = req.params;
  const studentId = req.user.id;
  const {
    activity_date,
    hours_spent,
    description,
    physical_attendance,
    spokesperson_name,
    spokesperson_phone
  } = req.body;

  if (!activity_date || !hours_spent || !description || !spokesperson_name || !spokesperson_phone) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const hours = parseInt(hours_spent);
  if (isNaN(hours) || hours < 1 || hours > 8) {
    return res.status(400).json({ error: 'Las horas invertidas deben ser de 1 a 8 horas.' });
  }

  try {
    // Verificar propiedad
    const checkResult = await db.query('SELECT * FROM activities WHERE id = $1 AND student_id = $2', [parseInt(id), studentId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ error: 'Bitácora no encontrada o no pertenece al estudiante.' });
    }

    const result = await db.query(
      `UPDATE activities SET 
        activity_date = $1, 
        hours_spent = $2, 
        description = $3, 
        physical_attendance = $4, 
        spokesperson_name = $5, 
        spokesperson_phone = $6,
        status = 'pending',
        feedback_comment = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND student_id = $8 
      RETURNING *`,
      [
        activity_date,
        hours,
        description,
        !!physical_attendance,
        spokesperson_name,
        spokesperson_phone,
        parseInt(id),
        studentId
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. EVALUAR REPORTES CON COMENTARIOS (Tutor)
// PUT /api/reportes/:id/comentario (Tutor)
router.put('/:id/comentario', verifyToken, checkRole(['tutor']), async (req, res) => {
  const { id } = req.params;
  const { status, feedback_comment } = req.body; // status: 'approved' o 'correct'

  if (!status || !['approved', 'correct'].includes(status)) {
    return res.status(400).json({ error: "Estado inválido. Debe ser 'approved' o 'correct'." });
  }

  if (status === 'correct' && (!feedback_comment || feedback_comment.trim() === '')) {
    return res.status(400).json({ error: 'Debe ingresar una observación o comentario para la corrección.' });
  }

  try {
    // Verificar si el estudiante de esta actividad está asignado a este tutor
    const checkResult = await db.query(
      `SELECT a.id FROM activities a 
       JOIN users u ON a.student_id = u.id 
       WHERE a.id = $1 AND u.tutor_id = $2`,
      [parseInt(id), req.user.id]
    );

    if (checkResult.rowCount === 0) {
      return res.status(403).json({ error: 'No está autorizado para evaluar reportes de este estudiante.' });
    }

    const result = await db.query(
      `UPDATE activities SET 
        status = $1, 
        feedback_comment = $2, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 
      RETURNING *`,
      [status, feedback_comment || null, parseInt(id)]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
