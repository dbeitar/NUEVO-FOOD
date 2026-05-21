const licenseService = require('../services/licenseService');
const userDB = require('../models/UserDatabase');
const { hasRole } = require('../utils/accessControl');

exports.getMyLicenses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    const licenses = await licenseService.listForUser(userId);
    const module_access = await licenseService.resolveModuleAccess(
      userId,
      req.user?.module_access || {},
    );
    return res.json({ success: true, data: { licenses, module_access } });
  } catch (e) {
    console.error('getMyLicenses:', e.message);
    return res.status(500).json({ error: 'Error obteniendo licencias' });
  }
};

exports.getUserLicenses = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d', 'admin_food', 'admin_food_plan', 'admin_training', 'admin_entrenador', 'admin_gimnasio', 'admin_marca'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const target = userDB.getById(parseInt(req.params.userId, 10));
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const licenses = await licenseService.listForUser(target.id);
    const module_access = await licenseService.resolveModuleAccess(target.id, target.module_access || {});
    return res.json({ success: true, data: { licenses, module_access } });
  } catch (e) {
    return res.status(500).json({ error: 'Error obteniendo licencias' });
  }
};

exports.putUserLicenses = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Solo super_admin o admin_d28d' });
    }
    const id = parseInt(req.params.userId, 10);
    const target = userDB.getById(id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { module_access } = req.body || {};
    if (!module_access || typeof module_access !== 'object') {
      return res.status(400).json({ error: 'module_access requerido' });
    }
    userDB.update(id, { module_access });
    const licenses = await licenseService.syncFromModuleAccess(id, module_access, 'admin');
    const resolved = await licenseService.resolveModuleAccess(id, module_access);
    return res.json({ success: true, data: { licenses, module_access: resolved } });
  } catch (e) {
    console.error('putUserLicenses:', e.message);
    return res.status(500).json({ error: 'Error actualizando licencias' });
  }
};
