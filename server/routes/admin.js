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
    const result = await db.query(
      `SELECT u.id, u.name, u.identification, u.major, u.role, u.active, u.tutor_id, u.project_id, u.docs_submitted, u.tutor_type, u.created_at,
              cp.title as project_title, cp.community_name as project_community
       FROM users u
       LEFT JOIN current_projects cp ON u.project_id = cp.id
       ORDER BY u.role DESC, u.name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar nuevo usuario
router.post('/usuarios', async (req, res) => {
  const { name, identification, major, role, password, tutor_id, project_title, project_community, tutor_type, docs_submitted } = req.body;

  if (!name || !identification || !major || !role || !password) {
    return res.status(400).json({ error: 'Todos los campos (name, identification, major, role, password) son obligatorios.' });
  }

  try {
    // Verificar si ya existe
    const exists = await db.query('SELECT id FROM users WHERE identification = $1', [identification]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ error: 'La cédula ya está registrada.' });
    }

    // Lógica para estudiantes: buscar o crear current_projects
    let project_id = null;
    if (role === 'student' && project_title && project_community) {
      const projectRes = await db.query(
        'SELECT id FROM current_projects WHERE LOWER(title) = LOWER($1) AND LOWER(community_name) = LOWER($2)',
        [project_title.trim(), project_community.trim()]
      );

      if (projectRes.rowCount > 0) {
        project_id = projectRes.rows[0].id;
      } else {
        const newProjRes = await db.query(
          'INSERT INTO current_projects (title, community_name) VALUES ($1, $2) RETURNING id',
          [project_title.trim(), project_community.trim()]
        );
        project_id = newProjRes.rows[0].id;
      }
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (name, identification, major, role, password_hash, tutor_id, project_id, docs_submitted, tutor_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, name, identification, major, role, active, tutor_id, project_id, docs_submitted, tutor_type`,
      [
        name,
        identification,
        major,
        role,
        passwordHash,
        tutor_id ? parseInt(tutor_id) : null,
        project_id,
        docs_submitted === undefined ? false : !!docs_submitted,
        role === 'tutor' ? tutor_type : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar usuario
router.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { name, identification, major, role, password, tutor_id, project_title, project_community, tutor_type, docs_submitted } = req.body;

  if (!name || !identification || !major || !role) {
    return res.status(400).json({ error: 'Nombre, Cédula, Carrera y Rol son obligatorios.' });
  }

  try {
    // Buscar o crear proyecto si es estudiante y se proveen datos
    let project_id = null;
    if (role === 'student' && project_title && project_community) {
      const projectRes = await db.query(
        'SELECT id FROM current_projects WHERE LOWER(title) = LOWER($1) AND LOWER(community_name) = LOWER($2)',
        [project_title.trim(), project_community.trim()]
      );

      if (projectRes.rowCount > 0) {
        project_id = projectRes.rows[0].id;
      } else {
        const newProjRes = await db.query(
          'INSERT INTO current_projects (title, community_name) VALUES ($1, $2) RETURNING id',
          [project_title.trim(), project_community.trim()]
        );
        project_id = newProjRes.rows[0].id;
      }
    }

    let result;
    if (password && password.trim() !== '') {
      // Si se proporciona una nueva contraseña, hashearla y actualizarla
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      result = await db.query(
        `UPDATE users SET name = $1, identification = $2, major = $3, role = $4, password_hash = $5, tutor_id = $6, project_id = $7, docs_submitted = $8, tutor_type = $9
         WHERE id = $10 RETURNING id, name, identification, major, role, active, tutor_id, project_id, docs_submitted, tutor_type`,
        [
          name,
          identification,
          major,
          role,
          passwordHash,
          tutor_id ? parseInt(tutor_id) : null,
          project_id,
          !!docs_submitted,
          role === 'tutor' ? tutor_type : null,
          parseInt(id)
        ]
      );
    } else {
      // Si no, actualizar sin tocar la contraseña
      result = await db.query(
        `UPDATE users SET name = $1, identification = $2, major = $3, role = $4, tutor_id = $5, project_id = $6, docs_submitted = $7, tutor_type = $8
         WHERE id = $9 RETURNING id, name, identification, major, role, active, tutor_id, project_id, docs_submitted, tutor_type`,
        [
          name,
          identification,
          major,
          role,
          tutor_id ? parseInt(tutor_id) : null,
          project_id,
          !!docs_submitted,
          role === 'tutor' ? tutor_type : null,
          parseInt(id)
        ]
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

// Actualizar estado de entrega de documentos del estudiante
router.put('/usuarios/:id/docs', async (req, res) => {
  const { id } = req.params;
  const { docs_submitted } = req.body;

  if (docs_submitted === undefined) {
    return res.status(400).json({ error: 'Debe especificar el estado docs_submitted.' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET docs_submitted = $1 WHERE id = $2 RETURNING id, name, docs_submitted',
      [!!docs_submitted, parseInt(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener estudiantes agrupados por proyecto comunitario
router.get('/proyectos-estudiantes', async (req, res) => {
  try {
    // 1. Obtener todos los estudiantes activos
    const studentsRes = await db.query(
      `SELECT u.id, u.name, u.identification, u.major, u.active, u.tutor_id, u.project_id, u.docs_submitted,
              cp.title as project_title, cp.community_name as project_community
       FROM users u
       LEFT JOIN current_projects cp ON u.project_id = cp.id
       WHERE u.role = 'student' AND u.active = true
       ORDER BY cp.title ASC, u.name ASC`
    );
    const students = studentsRes.rows;

    // 2. Obtener horas aprobadas consolidadas por estudiante
    const activitiesRes = await db.query(
      `SELECT student_id, SUM(hours_spent) as approved_hours
       FROM activities
       WHERE status = 'approved'
       GROUP BY student_id`
    );
    
    const hoursMap = {};
    activitiesRes.rows.forEach(row => {
      hoursMap[row.student_id] = parseInt(row.approved_hours || 0);
    });

    // 3. Cruzar datos y calcular porcentajes
    const studentsWithHours = students.map(student => {
      const approvedHours = hoursMap[student.id] || 0;
      return {
        ...student,
        approved_hours: approvedHours,
        progress_percentage: Math.min(Math.round((approvedHours / 120) * 100), 100)
      };
    });

    // 4. Agrupar por proyecto
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

    res.json(Object.values(projectsMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. CRUD DEL CRONOGRAMA (/api/admin/cronograma)
// ==========================================

// Crear hito del cronograma
router.post('/cronograma', async (req, res) => {
  const { title, event_date, project_id } = req.body;

  if (!title || !event_date || !project_id) {
    return res.status(400).json({ error: 'El título, la fecha y el proyecto (project_id) son obligatorios.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO milestones (title, event_date, project_id) VALUES ($1, $2, $3) RETURNING *',
      [title, event_date, parseInt(project_id)]
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
