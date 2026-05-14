const ROLE_PERMISSIONS = {
  super_admin: [
    'ecosystem.manage',
    'brands.manage',
    'gyms.manage',
    'd28d.manage',
    'd28d.view',
    'trainers.manage',
    'trainers.manage_own',
    'training.manage',
    'training.manage_own',
    'nutrition.manage',
    'nutrition.manage_assigned',
    'live_classes.manage',
    'live_classes.view',
    'users.manage',
    'users.manage_assigned',
  ],
  admin_marca: [
    'brands.manage',
    'gyms.manage',
    'trainers.manage',
    'training.manage',
    'nutrition.manage',
    'live_classes.manage',
    'live_classes.view',
    'users.manage_assigned',
    'd28d.view',
  ],
  admin_gimnasio: [
    'gyms.manage',
    'trainers.manage',
    'training.manage',
    'nutrition.manage',
    'live_classes.manage',
    'live_classes.view',
    'users.manage_assigned',
    'd28d.view',
  ],
  admin_d28d: [
    'd28d.manage',
    'd28d.view',
    'training.manage',
    'live_classes.manage',
    'live_classes.view',
  ],
  admin_food_plan: [
    'nutrition.manage',
    'nutrition.manage_assigned',
    'users.manage_assigned',
  ],
  // Alias corto: admin_food == admin_food_plan
  admin_food: [
    'nutrition.manage',
    'nutrition.manage_assigned',
    'users.manage_assigned',
  ],
  admin_training: [
    'training.manage',
    'trainers.manage',
    'users.manage_assigned',
  ],
  // Alias en español: admin_entrenador == admin_training
  admin_entrenador: [
    'training.manage',
    'trainers.manage',
    'users.manage_assigned',
  ],
  admin_gym: [
    'gyms.manage',
    'brands.manage',
    'users.manage_assigned',
  ],
  entrenador: [
    'trainers.manage_own',
    'training.manage_own',
    'nutrition.manage_assigned',
    'live_classes.view',
    'users.manage_assigned',
    'd28d.view',
  ],
  nutricionista: [
    'nutrition.manage',
    'nutrition.manage_assigned',
    'users.manage_assigned',
  ],
  usuario_final: [
    'training.view',
    'nutrition.view',
    'live_classes.view',
    'd28d.view',
  ],
};

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS);

function normalizeRoles(userLike = {}) {
  const roles = Array.isArray(userLike.roles) ? userLike.roles : [];
  const primary = userLike.rol || 'usuario_final';
  return Array.from(new Set([primary, ...roles].filter((role) => ALL_ROLES.includes(role))));
}

function permissionsForRoles(roles = []) {
  const fromRoles = roles.flatMap((role) => ROLE_PERMISSIONS[role] || []);
  return Array.from(new Set(fromRoles));
}

function hydrateAccess(userLike = {}) {
  const roles = normalizeRoles(userLike);
  const explicitPermissions = Array.isArray(userLike.permissions) ? userLike.permissions : [];
  const permissions = Array.from(new Set([...permissionsForRoles(roles), ...explicitPermissions]));
  return {
    roles,
    permissions,
    module_access: userLike.module_access || {},
  };
}

function hasRole(userLike = {}, acceptedRoles = []) {
  const roles = normalizeRoles(userLike);
  return acceptedRoles.some((role) => roles.includes(role));
}

function hasPermission(userLike = {}, permission) {
  return hydrateAccess(userLike).permissions.includes(permission);
}

module.exports = {
  ALL_ROLES,
  ROLE_PERMISSIONS,
  hydrateAccess,
  hasPermission,
  hasRole,
  normalizeRoles,
  permissionsForRoles,
};
