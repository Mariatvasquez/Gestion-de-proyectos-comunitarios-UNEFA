import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as db from '../db/index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Ruta de Registro de Usuario
router.post('/register', async (req, res) => {
  const { name, identification, major, role, password, tutor_id } = req.body;

  if (!name || !identification || !major || !role || !password) {
    return res.status(400).json({ error: 'Todos los campos (name, identification, major, role, password) son obligatorios.' });
  }

  try {
    // Verificar si la cédula ya está registrada
    const userExist = await db.query('SELECT id FROM users WHERE identification = $1', [identification]);
    if (userExist.rowCount > 0) {
      return res.status(400).json({ error: 'La cédula ingresada ya está registrada.' });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar en la base de datos
    const result = await db.query(
      `INSERT INTO users (name, identification, major, role, password_hash, tutor_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, identification, major, role, active`,
      [name, identification, major, role, passwordHash, tutor_id ? parseInt(tutor_id) : null]
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
    const result = await db.query('SELECT * FROM users WHERE identification = $1', [identification]);
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
      role: user.role
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
        role: user.role
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
      'SELECT id, name, identification, major, role, active, tutor_id FROM users WHERE id = $1',
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

export default router;
