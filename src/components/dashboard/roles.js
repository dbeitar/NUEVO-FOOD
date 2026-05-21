// Helpers de rol compartidos por el shell del Dashboard y sus vistas.
// Mantienen el comportamiento existente; no cambian la matriz de permisos.

export function userRoles(user) {
  return Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol].filter(Boolean);
}

const ADMIN_ROLES = new Set([
  'super_admin',
  'admin_marca',
  'admin_gimnasio',
  'admin_gym',
  'admin_d28d',
  'admin_food_plan',
  'admin_food',
  'admin_training',
  'admin_entrenador',
  'entrenador',
  'entrenador_d28d',
  'nutricionista',
]);

export function isFinalUser(user) {
  const roles = userRoles(user);
  if (roles.length === 0) return true;
  return !roles.some((r) => ADMIN_ROLES.has(r));
}

export function defaultViewForRole(user) {
  if (isFinalUser(user)) return 'myplan';
  const roles = userRoles(user);
  if (roles.includes('entrenador_d28d') && !roles.includes('entrenador')) return 'liveclasses';
  if (roles.includes('entrenador')) return 'coach';
  if (roles.some((r) => ['admin_gimnasio', 'admin_gym', 'admin_marca'].includes(r))) return 'gymadmin';
  return 'home';
}

export function makeHasAnyRole(roles) {
  return (list) => list.some((r) => roles.includes(r));
}
