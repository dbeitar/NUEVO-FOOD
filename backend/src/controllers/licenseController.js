const licenseService = require('../services/licenseService');
const foodProvisioning = require('../services/foodProvisioningService');
const trainingProvisioning = require('../services/trainingProvisioningService');
const { auditFood } = require('../services/foodAudit');
const { auditTraining } = require('../services/trainingAudit');
const userDB = require('../models/UserDatabase');
const userRepo = require('../db/repositories/userRepository');
const { hasRole } = require('../utils/accessControl');
const { canViewUserLicenses } = require('../utils/licenseScope');
const { useRelationalStorage } = require('../utils/storageMode');

async function loadUser(id) {
  if (useRelationalStorage()) return userRepo.findById(id);
  return userDB.getById(id);
}

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
    if (!hasRole(req.user, ['super_admin', 'admin_d28d', 'admin_food', 'admin_food_plan', 'admin_training', 'admin_entrenador', 'admin_gimnasio', 'admin_marca', 'admin_gym'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const targetId = parseInt(req.params.userId, 10);
    const allowed = await canViewUserLicenses(req.user, targetId);
    if (!allowed) return res.status(403).json({ error: 'Sin permiso para licencias de este usuario' });
    const target = await loadUser(targetId);
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
    const target = await loadUser(id);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { module_access, license_meta: licenseMeta } = req.body || {};
    if (!module_access || typeof module_access !== 'object') {
      return res.status(400).json({ error: 'module_access requerido' });
    }
    if (useRelationalStorage()) {
      await userRepo.patchLegacy(id, { module_access });
    } else {
      userDB.update(id, { module_access });
    }
    const licenses = await licenseService.syncFromModuleAccess(id, module_access, 'admin', licenseMeta || {});
    const resolved = await licenseService.resolveModuleAccess(id, module_access);
    foodProvisioning.onFoodLicenseChange(id, resolved).catch((e) => {
      auditFood(id, 'food.license.sync_error', e.message, {}, 'error');
    });
    trainingProvisioning.onTrainingLicenseChange(id, resolved).catch((e) => {
      auditTraining(id, 'training.license.sync_error', e.message, {}, 'error');
    });
    auditFood(req.user?.id, 'food.license.updated', 'Licencias food sincronizadas', {
      target_user_id: id,
      module_access: resolved,
    });
    auditTraining(req.user?.id, 'training.license.updated', 'Licencias training sincronizadas', {
      target_user_id: id,
      module_access: resolved,
    });
    return res.json({ success: true, data: { licenses, module_access: resolved } });
  } catch (e) {
    console.error('putUserLicenses:', e.message);
    return res.status(500).json({ error: 'Error actualizando licencias' });
  }
};
