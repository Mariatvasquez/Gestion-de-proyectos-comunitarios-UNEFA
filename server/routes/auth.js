import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

export const validatePassword = (password) => {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#$\/*.+\-]/.test(password);
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

// Ruta de Registro de Usuario
router.post('/register', async (req, res) => {
  const { name, identification, major, role, password, tutor_id, project_title, project_community, tutor_type } = req.body;

  if (!name || !identification || !major || !role || !password) {
    return res.status(400).json({ error: 'Todos los campos (name, identification, major, role, password) son obligatorios.' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'La contraseña debe cumplir con los siguientes requisitos: mínimo una mayúscula, una minúscula, un número y un carácter especial (@, #, $, /, *, ., +, -).' });
  }

  try {
    // Verificar si la cédula ya está registrada
    const userExist = await db.query('SELECT id FROM users WHERE identification = $1', [identification]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ error: 'La cédula ingresada ya está registrada.' });
    }

    // Lógica para estudiantes: buscar o crear current_projects
    let project_id = null;
    if (role === 'student') {
      if (!project_title || !project_community) {
        return res.status(400).json({ error: 'Para registrar un estudiante se requiere el título del proyecto y la comunidad.' });
      }

      // Buscar si existe proyecto coincidente
      const projectRes = await db.query(
        'SELECT id FROM current_projects WHERE LOWER(title) = LOWER($1) AND LOWER(community_name) = LOWER($2)',
        [project_title.trim(), project_community.trim()]
      );

      if (projectRes.rowCount > 0) {
        project_id = projectRes.rows[0].id;
      } else {
        // Crear nuevo proyecto actual
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

    // Insertar usuario
    const result = await db.query(
      `INSERT INTO users (name, identification, major, role, password_hash, tutor_id, project_id, docs_submitted, tutor_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, name, identification, major, role, active, project_id, docs_submitted, tutor_type`,
      [
        name,
        identification,
        major,
        role,
        passwordHash,
        tutor_id ? parseInt(tutor_id) : null,
        project_id,
        false,
        role === 'tutor' ? tutor_type : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta de Inicio de Sesión (Login)
router.post('/login', async (req, res) => {
  const { identification, password } = req.body;

  if (!identification || !password) {
    return res.status(400).json({ error: 'La cédula y la contraseña son obligatorias.' });
  }

  try {
    // Buscar al usuario
    const result = await db.query(`
      SELECT u.*, cp.title AS project_title, cp.community_name AS project_community 
      FROM users u
      LEFT JOIN current_projects cp ON u.project_id = cp.id
      WHERE u.identification = $1
    `, [identification]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Cédula o contraseña incorrectas.' });
    }

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (!user.active) {
      return res.status(403).json({ error: 'El usuario está dado de baja. Contacte al administrador.' });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Cédula o contraseña incorrectas.' });
    }

    // Firmar JWT Token
    const payload = {
      id: user.id,
      name: user.name,
      identification: user.identification,
      major: user.major,
      role: user.role,
      project_id: user.project_id,
      project_title: user.project_title,
      project_community: user.project_community,
      docs_submitted: user.docs_submitted,
      tutor_type: user.tutor_type,
      tutor_institucional_id: user.tutor_institucional_id
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'unefa_secret_key_2026',
      { expiresIn: '24h' }
    );

    // Responder con token e info del usuario
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        identification: user.identification,
        major: user.major,
        role: user.role,
        project_id: user.project_id,
        project_title: user.project_title,
        project_community: user.project_community,
        docs_submitted: user.docs_submitted,
        tutor_type: user.tutor_type,
        tutor_institucional_id: user.tutor_institucional_id
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener información del usuario en sesión (a partir del token)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.identification, u.major, u.role, u.active, u.tutor_id, u.tutor_institucional_id, u.project_id, u.docs_submitted, u.tutor_type,
              cp.title AS project_title, cp.community_name AS project_community
       FROM users u
       LEFT JOIN current_projects cp ON u.project_id = cp.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = result.rows[0];
    if (!user.active) {
      return res.status(403).json({ error: 'El usuario está inactivo.' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para Cambiar Contraseña del propio usuario
router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva contraseña son obligatorias.' });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({ error: 'La nueva contraseña debe cumplir con los siguientes requisitos: mínimo una mayúscula, una minúscula, un número y un carácter especial (@, #, $, /, *, ., +, -).' });
  }

  try {
    // Obtener la contraseña actual del usuario
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    // Hashear y actualizar la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);

    res.json({ message: 'Contraseña actualizada con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
