import express from 'express';
import * as db from '../db/index.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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

// 5. GENERAR ACTA DE EVALUACIÓN FINAL EN PDF
// GET /api/reportes/acta/:studentId (Disponible para todos los usuarios autenticados con restricciones de rol)
router.get('/acta/:studentId', verifyToken, async (req, res) => {
  const { studentId } = req.params;

  // Si es estudiante, solo puede descargar su propia acta
  if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
    return res.status(403).json({ error: 'No está autorizado para ver esta acta.' });
  }

  try {
    // 1. Obtener la información del estudiante, su proyecto y su tutor asignado
    const studentRes = await db.query(
      `SELECT u.name, u.identification, u.major, u.docs_submitted,
              cp.title as project_title, cp.community_name as project_community,
              t.name as tutor_name
       FROM users u
       LEFT JOIN current_projects cp ON u.project_id = cp.id
       LEFT JOIN users t ON u.tutor_id = t.id
       WHERE u.id = $1 AND u.role = 'student'`,
      [parseInt(studentId)]
    );

    if (studentRes.rowCount === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado o el usuario no es un estudiante.' });
    }

    const student = studentRes.rows[0];

    // 2. Obtener horas acumuladas aprobadas
    const hoursRes = await db.query(
      `SELECT COALESCE(SUM(hours_spent), 0) as approved 
       FROM activities 
       WHERE student_id = $1 AND status = 'approved'`,
      [parseInt(studentId)]
    );
    const approvedHours = parseInt(hoursRes.rows[0].approved);

    // 3. Crear el documento PDF
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    // Configurar cabeceras HTTP para descarga del archivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Acta_Servicio_Comunitario_${student.identification}.pdf`);
    doc.pipe(res);

    // Logo del Ministerio de la Defensa (esquina superior izquierda) y Logo de la UNEFA (esquina superior derecha)
    const minLogoPath = path.resolve('..', 'client', 'src', 'assets', 'logo_ministerio.png');
    const unefaLogoPath = path.resolve('..', 'client', 'src', 'assets', 'logo_unefa.png');

    let minLogoExists = false;
    let unefaLogoExists = false;
    try {
      minLogoExists = fs.existsSync(minLogoPath);
      unefaLogoExists = fs.existsSync(unefaLogoPath);
    } catch (e) {
      // Ignorar error
    }

    // Dibujar logo izquierda (Ministerio)
    if (minLogoExists) {
      doc.image(minLogoPath, 50, 30, { width: 55 });
    } else {
      // Caja estética con colores unefa/navy en caso de no existir archivo físico
      doc.rect(50, 30, 55, 55).fill('#0C2340');
      doc.fillColor('white').fontSize(6).text('MINISTERIO\nDEFENSA', 52, 45, { width: 51, align: 'center' });
    }

    // Dibujar logo derecha (UNEFA)
    if (unefaLogoExists) {
      doc.image(unefaLogoPath, 505, 30, { width: 55 });
    } else {
      // Caja estética dorada
      doc.rect(505, 30, 55, 55).fill('#C5A059');
      doc.fillColor('#0C2340').fontSize(7).text('UNEFA', 507, 50, { width: 51, align: 'center' });
    }

    // Cabecera Centrada Oficial
    doc.fillColor('#0C2340')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('REPÚBLICA BOLIVARIANA DE VENEZUELA', 120, 35, { align: 'center', width: 370 })
       .text('MINISTERIO DEL PODER POPULAR PARA LA DEFENSA', 120, 48, { align: 'center', width: 370 })
       .text('UNIVERSIDAD NACIONAL EXPERIMENTAL POLITÉCNICA', 120, 61, { align: 'center', width: 370 })
       .text('DE LA FUERZA ARMADA NACIONAL BOLIVARIANA (UNEFA)', 120, 74, { align: 'center', width: 370 })
       .fontSize(7)
       .font('Helvetica-Oblique')
       .text('VICERRECTORADO DE ASUNTOS SOCIALES Y PARTICIPACIÓN CIUDADANA', 120, 88, { align: 'center', width: 370 });

    doc.moveDown(3.5);

    // Título del Acta
    doc.fillColor('#0C2340')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('ACTA DE EVALUACIÓN FINAL DE SERVICIO COMUNITARIO', { align: 'center' });

    doc.moveDown(1.5);

    // Cuerpo
    doc.fillColor('#1E293B')
       .fontSize(10)
       .font('Helvetica')
       .text('Quien suscribe, Prof. Rosa Camejo, en su carácter de Coordinador de Servicio Comunitario del Núcleo Académico, hace constar que el (la) ciudadano(a):', { align: 'justify', lineGap: 3 });

    doc.moveDown(0.8);

    // Caja de datos del estudiante (Representación estética con bordes y relleno)
    const studentY = doc.y;
    doc.rect(50, studentY, 512, 70).fillAndStroke('#F8FAFC', '#E2E8F0');
    
    doc.fillColor('#0C2340')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('ESTUDIANTE:', 65, studentY + 10)
       .font('Helvetica')
       .text(student.name.toUpperCase(), 160, studentY + 10)
       
       .font('Helvetica-Bold')
       .text('CÉDULA DE ID:', 65, studentY + 24)
       .font('Helvetica')
       .text(student.identification, 160, studentY + 24)

       .font('Helvetica-Bold')
       .text('CARRERA:', 65, studentY + 38)
       .font('Helvetica')
       .text(student.major, 160, studentY + 38)

       .font('Helvetica-Bold')
       .text('TUTOR ACADÉMICO:', 65, studentY + 52)
       .font('Helvetica')
       .text(student.tutor_name || 'No Asignado', 160, studentY + 52);

    doc.moveDown(5.8);

    doc.fillColor('#1E293B')
       .fontSize(10)
       .font('Helvetica')
       .text('Ha cumplido de forma satisfactoria con la planificación y ejecución de las actividades correspondientes a su proyecto comunitario titulado:', { align: 'justify', lineGap: 3 });

    doc.moveDown(0.8);

    // Caja de proyecto actual
    const projectY = doc.y;
    doc.rect(50, projectY, 512, 55).fillAndStroke('#F8FAFC', '#C5A059');

    doc.fillColor('#0C2340')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('PROYECTO:', 65, projectY + 10)
       .font('Helvetica')
       .text(student.project_title || 'N/A', 140, projectY + 10, { width: 400 })
       
       .font('Helvetica-Bold')
       .text('COMUNIDAD:', 65, projectY + 32)
       .font('Helvetica')
       .text(student.project_community || 'N/A', 140, projectY + 32, { width: 400 });

    doc.moveDown(4.5);

    doc.fillColor('#1E293B')
       .fontSize(10)
       .font('Helvetica')
       .text('Acumulando un total de ', { align: 'justify', continued: true })
       .font('Helvetica-Bold')
       .text(`${approvedHours} horas`, { continued: true })
       .font('Helvetica')
       .text(' de trabajo comunitario aprobadas y validadas según las normativas y reglamentos vigentes del Servicio Comunitario de la UNEFA.', { lineGap: 3 });

    doc.moveDown(0.8);

    const docStatusStr = student.docs_submitted ? 'CONSIGNADA Y APROBADA' : 'PENDIENTE DE ENTREGA';
    doc.text('Asimismo, se deja constancia de que la documentación final requerida para este proceso se encuentra: ', { align: 'justify', continued: true })
       .font('Helvetica-Bold')
       .text(`${docStatusStr}.`);

    doc.moveDown(3);

    // Firmas estáticas
    const sigY = doc.y + 20;
    doc.moveTo(80, sigY).lineTo(220, sigY).stroke('#94A3B8');
    doc.moveTo(390, sigY).lineTo(530, sigY).stroke('#94A3B8');

    doc.fillColor('#0C2340')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('Prof. Rosa Camejo', 80, sigY + 6, { align: 'center', width: 140 })
       .font('Helvetica')
       .text('Coordinador General de Servicio Comunitario', 80, sigY + 18, { align: 'center', width: 140 });

    doc.font('Helvetica-Bold')
       .text('Firma del Decano / Sello', 390, sigY + 6, { align: 'center', width: 140 })
       .font('Helvetica')
       .text('Núcleo de Asuntos Académicos', 390, sigY + 18, { align: 'center', width: 140 });

    // Finalizar e imprimir
    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
