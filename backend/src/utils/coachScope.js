/**
 * Alcance de entrenadores marca blanca (sin D28D).
 */
const COACH_ROLES = new Set(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador']);

function rolesOf(user) {
  if (!user) return [];
  return Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol].filter(Boolean);
}

function isCoachUser(user) {
  return rolesOf(user).some((r) => COACH_ROLES.has(r));
}

function isPureCoach(user) {
  const roles = rolesOf(user);
  return roles.includes('entrenador') && !roles.some((r) => ['super_admin', 'admin_d28d', 'admin_gimnasio', 'admin_marca'].includes(r));
}

function getCoachTrainerId(user) {
  if (!user) return null;
  const raw = user.trainer_id ?? user.trainerId ?? null;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Módulos para usuarios creados por un coach (sin D28D ni clases globales). */
const COACH_CLIENT_MODULE_ACCESS = {
  gym: false,
  d28d: false,
  training: true,
  nutrition: true,
  food_plan: true,
  live_classes: false,
};

function sanitizeModuleAccessForCoachClient(access = {}) {
  return {
    ...COACH_CLIENT_MODULE_ACCESS,
    training: access.training !== false,
    nutrition: access.nutrition === true,
    food_plan: access.food_plan === true || access.nutrition === true,
  };
}

module.exports = {
  COACH_ROLES,
  isCoachUser,
  isPureCoach,
  getCoachTrainerId,
  COACH_CLIENT_MODULE_ACCESS,
  sanitizeModuleAccessForCoachClient,
};
