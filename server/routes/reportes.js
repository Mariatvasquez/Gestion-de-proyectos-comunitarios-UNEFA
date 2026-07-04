import express from 'express';
import PDFDocument from 'pdfkit';
import pool from '../db/index.js';
import { verifyToken, checkRole } from '../middleware/auth.js';
import fs from 'fs';
import SVGtoPDF from 'svg-to-pdfkit';

const router = express.Router();

// 1. Obtener bitácoras y resumen del estudiante
router.get('/estudiante', verifyToken, async (req, res) => {
  const studentId = req.user.id;
  try {
    const activitiesRes = await pool.query(
      'SELECT * FROM activities WHERE student_id = $1 ORDER BY activity_date DESC, created_at DESC',
      [studentId]
    );
    const activities = activitiesRes.rows;

    let approved = 0;
    let pending = 0;
    let correct = 0;
    activities.forEach(act => {
      const hours = parseInt(act.hours_spent) || 0;
      if (act.status === 'approved') approved += hours;
      else if (act.status === 'pending') pending += hours;
      else if (act.status === 'correct') correct += hours;
    });

    const total = approved + pending + correct;
    const remaining = Math.max(0, 120 - approved);
    const percentage = Math.min(100, Math.round((approved / 120) * 100));

    res.json({
      activities,
      summary: { approved, pending, correct, total, remaining, percentage }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Registrar nueva actividad
router.post('/', verifyToken, async (req, res) => {
  const studentId = req.user.id;
  const { activity_date, hours_spent, description, physical_attendance, sworn_statement, actividad_id } = req.body;

  if (!activity_date || !hours_spent || !description || sworn_statement === undefined || !actividad_id) {
    return res.status(400).json({ error: 'Todos los campos (incluyendo la actividad del cronograma) son obligatorios y debe aceptar la declaración jurada.' });
  }

  const hours = parseInt(hours_spent);
  if (isNaN(hours) || hours < 1 || hours > 8) {
    return res.status(400).json({ error: 'Las horas invertidas deben estar entre 1 y 8 horas por día.' });
  }

  if (!sworn_statement) {
    return res.status(400).json({ error: 'Debe aceptar la declaración jurada.' });
  }

  try {
    // Verificar si ya completó las 120 horas
    const hoursCheck = await pool.query(
      "SELECT COALESCE(SUM(hours_spent), 0) AS approved_hours FROM activities WHERE student_id = $1 AND status = 'approved'",
      [studentId]
    );
    const approvedHours = parseInt(hoursCheck.rows[0].approved_hours) || 0;
    if (approvedHours >= 120) {
      return res.status(400).json({ error: 'Felicidades, ya ha cumplido con las 120 horas reglamentarias de servicio comunitario.' });
    }

    const result = await pool.query(
      `INSERT INTO activities (student_id, activity_date, hours_spent, description, physical_attendance, sworn_statement, status, schedule_activity_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [studentId, activity_date, hours, description, !!physical_attendance, true, actividad_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Corregir/editar actividad por el estudiante
router.put('/:id', verifyToken, async (req, res) => {
  const studentId = req.user.id;
  const { id } = req.params;
  const { activity_date, hours_spent, description, physical_attendance, sworn_statement, actividad_id } = req.body;

  if (!activity_date || !hours_spent || !description || sworn_statement === undefined || !actividad_id) {
    return res.status(400).json({ error: 'Todos los campos (incluyendo la actividad del cronograma) son obligatorios.' });
  }

  const hours = parseInt(hours_spent);
  if (isNaN(hours) || hours < 1 || hours > 8) {
    return res.status(400).json({ error: 'Las horas invertidas deben estar entre 1 y 8 horas por día.' });
  }

  try {
    const checkRes = await pool.query('SELECT student_id FROM activities WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }
    if (checkRes.rows[0].student_id !== studentId) {
      return res.status(403).json({ error: 'No autorizado para modificar esta actividad.' });
    }

    const result = await pool.query(
      `UPDATE activities 
       SET activity_date = $1, hours_spent = $2, description = $3, physical_attendance = $4, sworn_statement = $5, schedule_activity_id = $6, status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [activity_date, hours, description, !!physical_attendance, !!sworn_statement, actividad_id, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Evaluar actividad por el tutor (Aprobar o Requerir Corrección)
router.put('/:id/comentario', verifyToken, checkRole(['tutor']), async (req, res) => {
  const { id } = req.params;
  const { status, feedback_comment } = req.body;

  if (!status || !['approved', 'correct'].includes(status)) {
    return res.status(400).json({ error: 'El estado enviado es inválido. Debe ser approved o correct.' });
  }

  try {
    const result = await pool.query(
      `UPDATE activities 
       SET status = $1, feedback_comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, feedback_comment, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Generar Acta de Evaluación Final en PDF con Formato Institucional Completo
router.post('/generar-acta', async (req, res) => {
  const { project_id, formato, semestre, seccion, fecha_inicio, fecha_culminacion, periodo, autoridades } = req.body;

  try {
    // Consulta SQL: Busca a los estudiantes del proyecto, sus horas aprobadas y su tutor asignado
    const query = `
      SELECT u.id, u.identification, u.name, u.major, cp.title AS titulo,
      t.name AS tutor_name, t.identification AS tutor_identification,
      COALESCE(SUM(a.hours_spent), 0) as total_horas
      FROM users u
      LEFT JOIN current_projects cp ON u.project_id = cp.id
      LEFT JOIN users t ON u.tutor_id = t.id
      LEFT JOIN activities a ON u.id = a.student_id AND a.status = 'approved'
      WHERE u.project_id = $1
      GROUP BY u.id, cp.id, cp.title, t.name, t.identification
    `;
    
    const { rows } = await pool.query(query, [project_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No se encontraron estudiantes para este proyecto." });
    }

    // Configuración del Documento (Vertical vs Horizontal)
    const isHorizontal = formato === 'horizontal';
    const doc = new PDFDocument({ 
      layout: isHorizontal ? 'landscape' : 'portrait', 
      margin: 50 
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Acta_Evaluacion.pdf');
    
    doc.pipe(res);

    // Dibujar Cabecera con Representación de Logotipos Institucionales
    const logoRightX = isHorizontal ? 662 : 482;
    
    const pathLogoMinisterio = './assets/logo_ministerio.jpg';
    const pathLogoUnefaSvg = './assets/logo_unefa.svg';
    const pathLogoUnefaPng = './assets/logo_unefa.png';
    const pathLogoUnefaJpg = './assets/logo_unefa.jpg';
    
    // Logotipo del Ministerio (Izquierda)
    try {
      doc.image(pathLogoMinisterio, 50, 40, { width: 80, height: 40 });
    } catch (e) {
      doc.lineWidth(1).strokeColor('#0C2340');
      doc.rect(50, 40, 80, 40).stroke();
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#0C2340');
      doc.text('MPP DEFENSA', 50, 50, { width: 80, align: 'center' });
      doc.fontSize(5).font('Helvetica').fillColor('#000000');
      doc.text('LOGO NO ENCONTRADO', 50, 64, { width: 80, align: 'center' });
    }
    
    // Logotipo de la UNEFA (Derecha) - Intentar SVG, PNG, luego JPG
    try {
      if (fs.existsSync(pathLogoUnefaSvg)) {
        const svgContent = fs.readFileSync(pathLogoUnefaSvg, 'utf8');
        const cleanSvg = svgContent
          .replace(/width\s*=\s*"[^"]*"/i, '')
          .replace(/height\s*=\s*"[^"]*"/i, '');
        SVGtoPDF(doc, cleanSvg, logoRightX, 40, { width: 80, height: 40, preserveAspectRatio: 'xMidYMid meet' });
      } else {
        throw new Error('Archivo SVG no encontrado');
      }
    } catch (e) {
      try {
        doc.image(pathLogoUnefaPng, logoRightX, 40, { width: 80, height: 40 });
      } catch (errPng) {
        try {
          doc.image(pathLogoUnefaJpg, logoRightX, 40, { width: 80, height: 40 });
        } catch (errJpg) {
          doc.lineWidth(1).strokeColor('#0C2340');
          doc.rect(logoRightX, 40, 80, 40).stroke();
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#0C2340');
          doc.text('UNEFA', logoRightX, 50, { width: 80, align: 'center' });
          doc.fontSize(5).font('Helvetica').fillColor('#000000');
          doc.text('LOGO NO ENCONTRADO', logoRightX, 64, { width: 80, align: 'center' });
        }
      }
    }

    // Textos institucionales centrados (especificando coordenadas y ancho para evitar heredar alineaciones anteriores)
    const titleWidth = isHorizontal ? 692 : 512;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', 50, 100, { width: titleWidth, align: 'center' });
    doc.text('MINISTERIO DEL PODER POPULAR PARA LA DEFENSA', 50, doc.y, { width: titleWidth, align: 'center' });
    doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL POLITÉCNICA DE LA FUERZA ARMADA BOLIVARIANA', 50, doc.y, { width: titleWidth, align: 'center' });
    doc.text('NÚCLEO GUÁRICO - EXTENSIÓN EL SOCORRO', 50, doc.y, { width: titleWidth, align: 'center' });
    doc.moveDown(2);

    // Dibujar Metadatos según el Formato Seleccionado (especificando coordenadas)
    doc.fontSize(10).font('Helvetica');
    
    if (formato === 'vertical_con_nombre' || formato === 'vertical_sin_nombre') {
      doc.font('Helvetica-Bold').text('ACTA DE EVALUACIÓN FINAL DEL SERVICIO COMUNITARIO', 50, doc.y, { width: titleWidth, align: 'center' });
      doc.moveDown();
      doc.font('Helvetica').text(`PROGRAMA: SERVICIO COMUNITARIO`, 50, doc.y);
      doc.text(`CARRERA: ${rows[0].major}    SEMESTRE: ${semestre}    SECCIÓN: ${seccion}`, 50, doc.y);
      doc.text(`FECHA DE INICIO: ${fecha_inicio}    FECHA DE CULMINACIÓN: ${fecha_culminacion}`, 50, doc.y);
      
      if (formato === 'vertical_con_nombre') {
        doc.moveDown();
        doc.font('Helvetica-Bold').text(`TÍTULO: ${rows[0].titulo}`, 50, doc.y);
      }
    } else if (formato === 'horizontal') {
      doc.font('Helvetica-Bold').text(`ACTA DE EVALUACIÓN FINAL SERVICIO COMUNITARIO PERIODO ${periodo}`, 50, doc.y, { width: titleWidth, align: 'center' });
    }
    
    doc.moveDown(2);
    doc.moveDown(2);

    // Dibujar Tabla de Estudiantes
    let startY = doc.y;
    
    doc.font('Helvetica-Bold');
    if (!isHorizontal) {
      doc.text('N°', 50, startY);
      doc.text('CÉDULA', 80, startY);
      doc.text('APELLIDOS', 170, startY);
      doc.text('NOMBRES', 290, startY);
      doc.text('CARRERA', 410, startY);
      doc.text('NOTA FINAL', 490, startY);
      doc.moveTo(50, startY + 15).lineTo(562, startY + 15).stroke();
    } else {
      doc.text('N°', 50, startY);
      doc.text('CÉDULA', 90, startY);
      doc.text('APELLIDOS', 200, startY);
      doc.text('NOMBRES', 350, startY);
      doc.text('CARRERA', 500, startY);
      doc.text('NOTA FINAL', 630, startY);
      doc.moveTo(50, startY + 15).lineTo(742, startY + 15).stroke();
    }
    
    let currentY = startY + 25;
    doc.font('Helvetica');

    rows.forEach((student, index) => {
      const notaFinal = student.total_horas >= 120 ? 'APROBADO' : 'REPROBADO';
      
      // Separación inteligente de Nombre completo a Apellidos y Nombres
      const nameParts = student.name.split(',');
      let apellidos = '';
      let nombres = '';

      if (nameParts.length > 1) {
        apellidos = nameParts[0].trim();
        nombres = nameParts.slice(1).join(',').trim();
      } else {
        const parts = student.name.trim().split(/\s+/);
        if (parts.length >= 4) {
          nombres = parts.slice(0, 2).join(' ');
          apellidos = parts.slice(2).join(' ');
        } else if (parts.length === 3) {
          nombres = parts[0];
          apellidos = parts.slice(1).join(' ');
        } else if (parts.length === 2) {
          nombres = parts[0];
          apellidos = parts[1];
        } else {
          nombres = student.name;
          apellidos = '';
        }
      }

      if (!isHorizontal) {
        doc.text(`${index + 1}`, 50, currentY);
        doc.text(`${student.identification}`, 80, currentY);
        doc.text(`${apellidos}`, 170, currentY, { width: 110, height: 15, ellipsis: true });
        doc.text(`${nombres}`, 290, currentY, { width: 110, height: 15, ellipsis: true });
        doc.text(`${student.major}`, 410, currentY, { width: 75, height: 15, ellipsis: true });
        doc.text(`${notaFinal}`, 490, currentY);
      } else {
        doc.text(`${index + 1}`, 50, currentY);
        doc.text(`${student.identification}`, 90, currentY);
        doc.text(`${apellidos}`, 200, currentY, { width: 140, height: 15, ellipsis: true });
        doc.text(`${nombres}`, 350, currentY, { width: 140, height: 15, ellipsis: true });
        doc.text(`${student.major}`, 500, currentY, { width: 120, height: 15, ellipsis: true });
        doc.text(`${notaFinal}`, 630, currentY);
      }
      
      currentY += 20;
    });

    // Dibujar Firmas Autorizadas
    const renderizarFirmas = (formatoDoc) => {
      // Dejar padding superior generoso para las firmas a bolígrafo (aprox 60pt = ~2cm)
      doc.moveDown(5);
      let cy = doc.y;
      
      // Evitar que las firmas queden solas si se desborda la página
      const bottomLimit = isHorizontal ? 480 : 650;
      if (cy > bottomLimit) {
        doc.addPage();
        doc.moveDown(4); // padding en la nueva página también
        cy = doc.y;
      }

      const pageWidth = isHorizontal ? 792 : 612;
      
      if (formatoDoc === 'horizontal' || formatoDoc === 'vertical_con_nombre') {
        // 1 sola firma centrada
        const lineWidth = 220;
        const lineX = (pageWidth - lineWidth) / 2;
        
        doc.lineWidth(1).strokeColor('#475569');
        doc.moveTo(lineX, cy).lineTo(lineX + lineWidth, cy).stroke();
        
        const nombre = autoridades.responsable_servicio || 'Prof. Rosa Camejo';
        const ci = autoridades.responsable_servicio_ci ? `C.I. ${autoridades.responsable_servicio_ci}` : '';
        
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(nombre, lineX, cy + 5, { width: lineWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B');
        if (ci) doc.text(ci, lineX, cy + 16, { width: lineWidth, align: 'center' });
        doc.text('Responsable de Servicio Comunitario', lineX, cy + 27, { width: lineWidth, align: 'center' });

      } else if (formatoDoc === 'vertical_sin_nombre') {
        // 4 espacios de firma en cuadrícula 2x2
        const leftX = 60;
        const rightX = pageWidth / 2 + 30;
        const lineWidth = 200;
        
        // Fila 1
        doc.lineWidth(1).strokeColor('#475569');
        doc.moveTo(leftX, cy).lineTo(leftX + lineWidth, cy).stroke();
        doc.moveTo(rightX, cy).lineTo(rightX + lineWidth, cy).stroke();
        
        // Fila 1 - Tutor Académico
        const tutorName = autoridades.tutor_academico || rows[0].tutor_name || 'Tutor Académico';
        const tutorCi = autoridades.tutor_academico_ci ? `C.I. ${autoridades.tutor_academico_ci}` : (rows[0].tutor_identification ? `C.I. ${rows[0].tutor_identification}` : '');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(tutorName, leftX, cy + 5, { width: lineWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B');
        if (tutorCi) doc.text(tutorCi, leftX, cy + 16, { width: lineWidth, align: 'center' });
        doc.text('Tutor Académico', leftX, cy + 27, { width: lineWidth, align: 'center' });
        
        // Fila 1 - Responsable Servicio
        const respName = autoridades.responsable_servicio || 'Prof. Rosa Camejo';
        const respCi = autoridades.responsable_servicio_ci ? `C.I. ${autoridades.responsable_servicio_ci}` : '';
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(respName, rightX, cy + 5, { width: lineWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B');
        if (respCi) doc.text(respCi, rightX, cy + 16, { width: lineWidth, align: 'center' });
        doc.text('Responsable Servicio Comunitario', rightX, cy + 27, { width: lineWidth, align: 'center' });
        
        // Espacio vertical para la siguiente fila (padding)
        cy += 80;
        
        // Fila 2
        doc.moveTo(leftX, cy).lineTo(leftX + lineWidth, cy).stroke();
        doc.moveTo(rightX, cy).lineTo(rightX + lineWidth, cy).stroke();

        // Fila 2 - Jefe Equipo de Extensión
        const extName = autoridades.jefe_extension || 'Jefe de Equipo de Extensión';
        const extCi = autoridades.jefe_extension_ci ? `C.I. ${autoridades.jefe_extension_ci}` : '';
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(extName, leftX, cy + 5, { width: lineWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B');
        if (extCi) doc.text(extCi, leftX, cy + 16, { width: lineWidth, align: 'center' });
        doc.text('Jefe de Equipo de Extensión', leftX, cy + 27, { width: lineWidth, align: 'center' });

        // Fila 2 - Jefe de Área Académica
        const areaName = autoridades.jefe_area || 'Jefe de Área Académica';
        const areaCi = autoridades.jefe_area_ci ? `C.I. ${autoridades.jefe_area_ci}` : '';
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A');
        doc.text(areaName, rightX, cy + 5, { width: lineWidth, align: 'center' });
        doc.fontSize(7).font('Helvetica').fillColor('#64748B');
        if (areaCi) doc.text(areaCi, rightX, cy + 16, { width: lineWidth, align: 'center' });
        doc.text('Jefe de Área Académica', rightX, cy + 27, { width: lineWidth, align: 'center' });
      }
    };

    renderizarFirmas(formato);

    doc.end();

  } catch (error) {
    console.error("Error generando el acta:", error);
    res.status(500).json({ error: 'Error interno del servidor al generar el PDF' });
  }
});

export default router;