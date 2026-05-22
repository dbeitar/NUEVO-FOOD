/**
 * Guard de licencia por módulo (shell). No elimina rutas legacy; solo valida acceso.
 */
const licenseService = require('../services/licenseService');
const { hydrateAccess, hasPermission, normalizeRoles } = require('../utils/accessControl');

const LEGACY_KEY_BY_CODE = {
  food: ['food_plan', 'nutrition', 'food'],
  training: ['training'],
  d28d: ['d28d'],
  gym: ['gym'],
  live_classes: ['live_classes'],
};

const IMPLICIT_FOOD_ROLES = new Set([
  'usuario_final', 'nutricionista', 'entrenador',
  'admin_food', 'admin_food_plan',
  'admin_marca', 'admin_gimnasio', 'admin_gym',
]);

const IMPLICIT_TRAINING_ROLES = new Set([
  'usuario_final', 'entrenador', 'admin_entrenador', 'admin_training',
  'admin_marca', 'admin_gimnasio', 'admin_gym',
]);

const FOOD_PERMISSIONS = ['nutrition.view', 'nutrition.manage', 'nutrition.manage_assigned'];

/** null = sin clave explícita para el módulo; true/false = decisión por module_access */
function legacyModuleDecision(legacy, moduleCode) {
  if (!legacy || typeof legacy !== 'object') return null;
  const keys = LEGACY_KEY_BY_CODE[moduleCode] || [moduleCode];
  const defined = keys.filter((k) => Object.prototype.hasOwnProperty.call(legacy, k));
  if (!defined.length) return null;
  return defined.some((k) => legacy[k] === true);
}

function implicitModuleByRole(userLike, moduleCode) {
  const roles = normalizeRoles(userLike);
  const set = moduleCode === 'food' ? IMPLICIT_FOOD_ROLES : IMPLICIT_TRAINING_ROLES;
  return roles.some((r) => set.has(r));
}

function permissionAllowsModule(userLike, moduleCode) {
  if (moduleCode === 'food') {
    return FOOD_PERMISSIONS.some((p) => hasPermission(userLike, p));
  }
  if (moduleCode === 'training') {
    return hasPermission(userLike, 'training.view')
      || hasPermission(userLike, 'training.manage')
      || hasPermission(userLike, 'training.manage_own');
  }
  if (moduleCode === 'd28d') {
    return hasPermission(userLike, 'd28d.view') || hasPermission(userLike, 'd28d.manage');
  }
  if (moduleCode === 'live_classes') {
    return hasPermission(userLike, 'live_classes.view') || hasPermission(userLike, 'live_classes.manage');
  }
  return false;
}

async function userHasModule(userLike, moduleCode) {
  if (!userLike?.id) return false;
  const access = hydrateAccess(userLike);
  const roles = access.roles;
  if (roles.includes('super_admin')) return true;

  const rawLegacy = userLike.module_access || access.module_access || {};
  const legacyDecision = legacyModuleDecision(rawLegacy, moduleCode);
  if (legacyDecision === false) return false;

  if (permissionAllowsModule({ ...userLike, ...access }, moduleCode)) {
    return true;
  }

  if (await licenseService.userHasActiveModule(userLike.id, moduleCode)) {
    return true;
  }

  if (legacyDecision === true) return true;

  return implicitModuleByRole({ ...userLike, ...access }, moduleCode);
}

/** Alinea module_licenses con module_access resuelto (evita 403 tras login). */
async function ensureModuleLicensesSynced(userLike, source = 'sync') {
  if (!userLike?.id) return userLike?.module_access || {};
  const legacy = userLike.module_access || {};
  const resolved = await licenseService.resolveModuleAccess(userLike.id, legacy);
  await licenseService.syncFromModuleAccess(userLike.id, resolved, source);
  return licenseService.resolveModuleAccess(userLike.id, resolved);
}

function requireModuleLicense(moduleCode) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado' });
      const ok = await userHasModule(req.user, moduleCode);
      if (!ok) {
        return res.status(403).json({
          error: 'Módulo no licenciado',
          module: moduleCode,
        });
      }
      return next();
    } catch (e) {
      console.error('requireModuleLicense:', e.message);
      return res.status(500).json({ error: 'Error validando licencia' });
    }
  };
}

module.exports = {
  requireModuleLicense,
  userHasModule,
  ensureModuleLicensesSynced,
};
