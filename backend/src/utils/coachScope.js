/**
 * Alcance de entrenadores marca blanca (sin D28D).
 */
const TrainersDatabase = require('../models/TrainersDatabase');

const COACH_ROLES = new Set(['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador']);
const COACH_CATEGORY_PREFIX = 'coach:';

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

function trainerIdFromEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();
  const match = TrainersDatabase.getAll().find(
    (t) => t.activo !== false && String(t.email || '').trim().toLowerCase() === normalized,
  );
  return match ? Number(match.id) : null;
}

function getCoachTrainerId(user) {
  if (!user) return null;
  const raw = user.trainer_id ?? user.trainerId ?? null;
  if (raw != null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  const roles = rolesOf(user);
  if (roles.includes('entrenador') || roles.includes('nutricionista')) {
    return trainerIdFromEmail(user.email);
  }
  return null;
}

function coachCategoryStorageKey(trainerId, nombre) {
  const tid = Number(trainerId);
  const label = String(nombre || '').trim();
  if (!Number.isFinite(tid) || !label) return null;
  return `${COACH_CATEGORY_PREFIX}${tid}:${label}`;
}

function coachCategoryDisplayName(nombre, trainerId = null) {
  const raw = String(nombre || '');
  const m = raw.match(/^coach:(\d+):(.+)$/);
  if (!m) return raw;
  if (trainerId != null && Number(m[1]) !== Number(trainerId)) return null;
  return m[2];
}

function isCoachCategoryStorageKey(nombre) {
  return String(nombre || '').startsWith(COACH_CATEGORY_PREFIX);
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
  trainerIdFromEmail,
  coachCategoryStorageKey,
  coachCategoryDisplayName,
  isCoachCategoryStorageKey,
  COACH_CLIENT_MODULE_ACCESS,
  sanitizeModuleAccessForCoachClient,
};
