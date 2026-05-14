const jwt = require('jsonwebtoken');
const { hydrateAccess } = require('../utils/accessControl');

// JWT_SECRET es obligatorio. Si no está definido, el módulo se niega a cargar
// (acompaña la validación del server.js). Sin secret no hay autenticación segura.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || String(JWT_SECRET).trim().length < 32) {
  throw new Error('JWT_SECRET no definido o demasiado corto (>=32 chars)');
}

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = {
      ...user,
      ...hydrateAccess(user),
    };
    next();
  });
};

module.exports = authenticateToken;
