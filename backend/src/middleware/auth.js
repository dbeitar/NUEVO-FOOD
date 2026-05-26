const jwt = require('jsonwebtoken');
const { hydrateAccess } = require('../utils/accessControl');
const userRepo = require('../db/repositories/userRepository');
const licenseService = require('../services/licenseService');
const { useRelationalStorage } = require('../utils/storageMode');
const { getCoachTrainerId } = require('../utils/coachScope');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || String(JWT_SECRET).trim().length < 32) {
  throw new Error('JWT_SECRET no definido o demasiado corto (>=32 chars)');
}

/** JWT + module_access/licencias siempre desde BD (evita token obsoleto tras suspender). */
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    let module_access = payload.module_access || {};
    let rol = payload.rol;
    let roles = payload.roles;
    let gym_id = payload.gym_id;
    let trainer_id = payload.trainer_id;

    if (useRelationalStorage() && payload.id) {
      const dbUser = await userRepo.findById(payload.id);
      if (!dbUser || dbUser.activo === false) {
        return res.status(403).json({ error: 'Usuario inactivo o no encontrado' });
      }
      rol = dbUser.rol;
      roles = dbUser.roles;
      gym_id = dbUser.gym_id ?? dbUser.gymId ?? null;
      trainer_id = dbUser.trainer_id ?? null;
      if (trainer_id == null) {
        trainer_id = getCoachTrainerId({ ...dbUser, email: dbUser.email || payload.email });
      }
      module_access = await licenseService.resolveModuleAccess(
        dbUser.id,
        dbUser.module_access || {},
      );
      await licenseService.syncFromModuleAccess(dbUser.id, module_access, 'auth');
      module_access = await licenseService.resolveModuleAccess(dbUser.id, module_access);
    }

    const base = {
      id: payload.id,
      email: payload.email,
      rol,
      roles,
      permissions: payload.permissions,
      module_access,
      gym_id,
      trainer_id,
    };
    req.user = { ...base, ...hydrateAccess(base) };
    return next();
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = authenticateToken;
