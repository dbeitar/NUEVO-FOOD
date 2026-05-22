/**
 * Guard de licencia por módulo (shell). No elimina rutas legacy; solo valida acceso.
 */
const licenseService = require('../services/licenseService');
const { hydrateAccess } = require('../utils/accessControl');

const LEGACY_KEY_BY_CODE = {
  food: ['food_plan', 'nutrition'],
  training: ['training'],
  d28d: ['d28d'],
  gym: ['gym'],
  live_classes: ['live_classes'],
};

const IMPLICIT_FOOD_ROLES = new Set([
  'usuario_final', 'nutricionista', 'entrenador',
  'admin_food', 'admin_food_plan', 'admin_gimnasio', 'admin_marca',
]);
const IMPLICIT_TRAINING_ROLES = new Set([
  'usuario_final', 'entrenador', 'admin_entrenador', 'admin_training',
  'admin_gimnasio', 'admin_marca',
]);

function legacyHasExplicitAccess(legacy) {
  return legacy && typeof legacy === 'object' && Object.keys(legacy).some((k) => legacy[k]);
}

function implicitModuleByRole(roles, moduleCode) {
  const set = moduleCode === 'food' ? IMPLICIT_FOOD_ROLES : IMPLICIT_TRAINING_ROLES;
  return roles.some((r) => set.has(r));
}

async function userHasModule(user, moduleCode) {
  if (!user?.id) return false;
  const access = hydrateAccess(user);
  const roles = access.roles || [];
  if (roles.includes('super_admin')) return true;
  // Fuente de verdad: tabla module_licenses (evita JWT obsoleto tras suspender licencia).
  if (await licenseService.userHasActiveModule(user.id, moduleCode)) return true;
  const legacyKeys = LEGACY_KEY_BY_CODE[moduleCode] || [moduleCode];
  const legacy = user.module_access || access.module_access || {};
  if (legacyHasExplicitAccess(legacy)) {
    if (legacyKeys.some((k) => legacy[k])) return true;
  } else if (implicitModuleByRole(roles, moduleCode)) {
    return true;
  }
  return false;
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

module.exports = { requireModuleLicense, userHasModule };
