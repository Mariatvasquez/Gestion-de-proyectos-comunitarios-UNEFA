import express from 'express';
import * as db from '../db/index.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Obtener los estudiantes asignados a un tutor y sus reportes de actividades
// GET /api/estudiantes/asignados (Tutor)
router.get('/asignados', verifyToken, checkRole(['tutor']), async (req, res) => {
  const tutorId = req.user.id;

  try {
    // 1. Obtener estudiantes asignados con su información de proyecto
    const studentsResult = await db.query(
      `SELECT u.id, u.name, u.identification, u.major, u.active, u.project_id,
              cp.title as project_title, cp.community_name as project_community
       FROM users u
       LEFT JOIN current_projects cp ON u.project_id = cp.id
       WHERE u.tutor_id = $1 AND u.active = true 
       ORDER BY u.name ASC`,
      [tutorId]
    );
    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.json({ projects: [], activities: [] });
    }

    const studentIds = students.map(s => s.id);

    // 2. Obtener todas las actividades de estos estudiantes
    const activitiesResult = await db.query(
      `SELECT a.*, u.name as student_name, u.identification as student_identification, u.major as student_major 
       FROM activities a 
       JOIN users u ON a.student_id = u.id 
       WHERE a.student_id = ANY($1) 
       ORDER BY a.activity_date DESC, a.created_at DESC`,
      [studentIds]
    );
    const activities = activitiesResult.rows;

    // 3. Cruzar datos en memoria para calcular horas aprobadas y progreso de cada estudiante
    const studentsWithHours = students.map(student => {
      const approvedHours = activities
        .filter(a => a.student_id === student.id && a.status === 'approved')
        .reduce((sum, a) => sum + a.hours_spent, 0);

      return {
        ...student,
        approved_hours: approvedHours,
        progress_percentage: Math.min(Math.round((approvedHours / 120) * 100), 100)
      };
    });

    // 4. Agrupar estudiantes por proyecto
    const projectsMap = {};
    studentsWithHours.forEach(student => {
      const pid = student.project_id || 0;
      const ptitle = student.project_title || 'Sin Proyecto Asignado';
      const pcomm = student.project_community || 'N/A';

      if (!projectsMap[pid]) {
        projectsMap[pid] = {
          id: student.project_id,
          title: ptitle,
          community_name: pcomm,
          students: []
        };
      }
      projectsMap[pid].students.push(student);
    });

    res.json({
      projects: Object.values(projectsMap),
      activities
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
