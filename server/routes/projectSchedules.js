import express from 'express';
import fs from 'fs';
import path from 'path';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Auxiliar para validar los datos de la tarea del cronograma
const validateScheduleData = (data) => {
  const { objective, activity, task, start_week, end_week } = data;
  
  if (!objective || typeof objective !== 'string' || objective.trim() === '') {
    return 'El objetivo específico es requerido.';
  }
  if (!activity || typeof activity !== 'string' || activity.trim() === '') {
    return 'La actividad es requerida.';
  }
  if (!task || typeof task !== 'string' || task.trim() === '') {
    return 'La tarea específica es requerida.';
  }
  
  const start = parseInt(start_week, 10);
  const end = parseInt(end_week, 10);
  
  if (isNaN(start) || start < 1 || start > 12) {
    return 'La semana de inicio debe ser un número entero entre 1 y 12.';
  }
  if (isNaN(end) || end < 1 || end > 12) {
    return 'La semana de culminación debe ser un número entero entre 1 y 12.';
  }
  if (start > end) {
    return 'La semana de inicio no puede ser mayor que la semana de culminación.';
  }
  
  return null;
};

// 1. GET /api/proyectos/:project_id/cronograma
// Obtener el cronograma de un proyecto ordenado por start_week
router.get('/:project_id/cronograma', verifyToken, async (req, res) => {
  const { project_id } = req.params;
  
  try {
    let result;
    if (project_id === 'fase_inicial') {
      result = await db.query(
        'SELECT * FROM project_schedules WHERE project_id IS NULL ORDER BY start_week ASC, id ASC'
      );
    } else {
      result = await db.query(
        'SELECT * FROM project_schedules WHERE project_id = $1 ORDER BY start_week ASC, id ASC',
        [project_id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/proyectos/:project_id/cronograma
// Crear una nueva fila en el cronograma de un proyecto
router.post('/:project_id/cronograma', verifyToken, async (req, res) => {
  const { project_id } = req.params;
  const validationError = validateScheduleData(req.body);
  
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  
  const { objective, activity, task, start_week, end_week } = req.body;
  
  try {
    let dbProjectId = project_id;
    
    if (project_id === 'fase_inicial') {
      dbProjectId = null;
    } else {
      // Verificar si el proyecto existe
      const projCheck = await db.query('SELECT id FROM current_projects WHERE id = $1', [project_id]);
      if (projCheck.rowCount === 0) {
        return res.status(404).json({ error: 'Proyecto no encontrado.' });
      }
    }
    
    const result = await db.query(
      `INSERT INTO project_schedules (project_id, objective, activity, task, start_week, end_week)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dbProjectId, objective.trim(), activity.trim(), task.trim(), parseInt(start_week, 10), parseInt(end_week, 10)]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT /api/proyectos/:project_id/cronograma/:id
// Actualizar una fila del cronograma
router.put('/:project_id/cronograma/:id', verifyToken, async (req, res) => {
  const { project_id, id } = req.params;
  const validationError = validateScheduleData(req.body);
  
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  
  const { objective, activity, task, start_week, end_week } = req.body;
  
  try {
    let result;
    if (project_id === 'fase_inicial') {
      result = await db.query(
        `UPDATE project_schedules 
         SET objective = $1, activity = $2, task = $3, start_week = $4, end_week = $5
         WHERE id = $6 AND project_id IS NULL
         RETURNING *`,
        [objective.trim(), activity.trim(), task.trim(), parseInt(start_week, 10), parseInt(end_week, 10), id]
      );
    } else {
      result = await db.query(
        `UPDATE project_schedules 
         SET objective = $1, activity = $2, task = $3, start_week = $4, end_week = $5
         WHERE id = $6 AND project_id = $7
         RETURNING *`,
        [objective.trim(), activity.trim(), task.trim(), parseInt(start_week, 10), parseInt(end_week, 10), id, project_id]
      );
    }
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de cronograma no encontrado o no pertenece a este proyecto.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE /api/proyectos/:project_id/cronograma/:id
// Eliminar una fila del cronograma
router.delete('/:project_id/cronograma/:id', verifyToken, async (req, res) => {
  const { project_id, id } = req.params;
  
  try {
    let result;
    if (project_id === 'fase_inicial') {
      result = await db.query(
        'DELETE FROM project_schedules WHERE id = $1 AND project_id IS NULL RETURNING *',
        [id]
      );
    } else {
      result = await db.query(
        'DELETE FROM project_schedules WHERE id = $1 AND project_id = $2 RETURNING *',
        [id, project_id]
      );
    }
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Registro de cronograma no encontrado o no pertenece a este proyecto.' });
    }
    
    res.json({ message: 'Registro de cronograma eliminado correctamente.', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /api/proyectos/:id/documentos
// Recibe el PDF subido mediante multipart/form-data, lo guarda y registra en la BD
router.post('/:id/documentos', verifyToken, (req, res, next) => {
  upload.single('archivo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { id } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe proporcionar un archivo PDF válido en el campo "archivo".' });
    }

    // Verificar si el proyecto existe
    const projCheck = await db.query('SELECT id FROM current_projects WHERE id = $1', [id]);
    if (projCheck.rowCount === 0) {
      // Eliminar el archivo físico si el proyecto no existe
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error al eliminar archivo huérfano:', err);
      }
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    // Registrar el archivo en la base de datos
    const relativePath = `uploads/historico/${req.file.filename}`;
    const result = await db.query(
      `INSERT INTO documentos_historico (proyecto_id, nombre_archivo, ruta_archivo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.file.originalname, relativePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Limpiar archivo subido si falla el registro en la BD
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error al limpiar archivo tras fallo:', unlinkErr);
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/proyectos/:id/documentos
// Devuelve la lista de documentos asociados a ese proyecto ordenados por fecha descendente
router.get('/:id/documentos', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el proyecto existe
    const projCheck = await db.query('SELECT id FROM current_projects WHERE id = $1', [id]);
    if (projCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    const result = await db.query(
      `SELECT * FROM documentos_historico
       WHERE proyecto_id = $1
       ORDER BY fecha_subida DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
