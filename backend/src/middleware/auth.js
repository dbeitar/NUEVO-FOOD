const jwt = require('jsonwebtoken');
const { hydrateAccess } = require('../utils/accessControl');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const secret = process.env.JWT_SECRET || 'secret_key_dev';
  jwt.verify(token, secret, (err, user) => {
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
