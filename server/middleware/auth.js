import jwt from 'jsonwebtoken';

// Middleware principal para verificar el token JWT
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
  }

  const token = authHeader.split(' ')[1]; // Extraer el token de "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Formato de token inválido.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'unefa_secret_key_2026');
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para validar el rol del usuario
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Acceso denegado. Rol no identificado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Permisos insuficientes.' });
    }

    next();
  };
};
