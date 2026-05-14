// Helpers de aislamiento multi-tenant.
// Centralizan la lógica de "qué puede ver/tocar este usuario", basándose en
// el JWT (req.user). NUNCA ampliar permisos aquí sin justificación explícita.

const SUPER_ROLES = new Set(['super_admin']);
const GYM_ADMIN_ROLES = new Set(['admin_gimnasio', 'admin_marca', 'admin_gym']);

function getUserGymId(user) {
  if (!user) return null;
  return user.gym_id ?? user.gymId ?? null;
}

function getUserTrainerId(user) {
  if (!user) return null;
  return user.trainer_id ?? null;
}

function isSuperAdmin(user) {
  return Boolean(user) && SUPER_ROLES.has(user.rol);
}

function isGymAdmin(user) {
  return Boolean(user) && GYM_ADMIN_ROLES.has(user.rol);
}

// Filtra una lista de entidades por gym_id del usuario.
// - super_admin: ve todo.
// - admin_gimnasio/admin_marca/admin_gym: solo su gym_id.
// - cualquier otro: solo entidades de SU gym (si tiene) o lista vacía.
function filterByGym(entities, user) {
  if (!Array.isArray(entities)) return [];
  if (isSuperAdmin(user)) return entities;
  const gymId = getUserGymId(user);
  if (gymId == null) return [];
  return entities.filter((e) => {
    const eid = e.gym_id ?? e.gymId ?? e.id;
    return String(eid) === String(gymId);
  });
}

// Verifica si el usuario puede operar sobre la entidad indicada.
// Acepta una entidad con `gym_id` (o id, para gyms).
function canAccessEntity(user, entity) {
  if (isSuperAdmin(user)) return true;
  if (!entity) return false;
  const gymId = getUserGymId(user);
  if (gymId == null) return false;
  const target = entity.gym_id ?? entity.gymId ?? entity.id;
  return String(target) === String(gymId);
}

// Middleware que asegura un mínimo de roles. Si no se pasa nada, exige
// usuario autenticado.
function requireAnyRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (roles.length === 0) return next();
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = {
  isSuperAdmin,
  isGymAdmin,
  getUserGymId,
  getUserTrainerId,
  filterByGym,
  canAccessEntity,
  requireAnyRole,
};
