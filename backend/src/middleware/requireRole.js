const { hasRole } = require('../utils/accessControl');

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || !hasRole(req.user, roles)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta accion',
      });
    }
    next();
  };
}

module.exports = requireRole;
