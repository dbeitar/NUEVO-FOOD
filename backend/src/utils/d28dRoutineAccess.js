/**
 * Rutinas: plataforma D28D (d28d_platform) vs coach marca blanca (coach_wl).
 * Los entrenadores NO ven ni copian plantillas D28D.
 */
const { isCoachUser, getCoachTrainerId } = require('./coachScope');

const PLATFORM_ROLES = ['super_admin', 'admin_d28d'];
const HOST_ROLES = [...PLATFORM_ROLES, 'entrenador_d28d'];
const LIVE_SCHEDULE_VIEW_ROLES = ['admin_marca', 'admin_gimnasio', 'admin_gym'];

function rolesOf(user) {
  if (!user) return [];
  return Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol].filter(Boolean);
}

function hasRole(user, roles) {
  return rolesOf(user).some((r) => roles.includes(r));
}

function isPlatformManager(user) {
  return hasRole(user, PLATFORM_ROLES);
}

function isD28dHost(user) {
  return hasRole(user, HOST_ROLES);
}

function canListRoutinesForLive(user) {
  return isPlatformManager(user) || isD28dHost(user) || hasRole(user, LIVE_SCHEDULE_VIEW_ROLES);
}

function canListRoutines(user) {
  return isPlatformManager(user) || isD28dHost(user) || isCoachUser(user) || canListRoutinesForLive(user);
}

function canManagePlatform(user) {
  return isPlatformManager(user);
}

function canManageCoachRoutines(user) {
  return isCoachUser(user) || isPlatformManager(user);
}

function routineTrainerId(routine) {
  const raw = routine?.trainer_id ?? routine?.trainerId ?? null;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isCoachOwnedRoutine(routine, user) {
  if (!routine || !user) return false;
  const scope = routine.scope || 'd28d_platform';
  if (!['coach_wl', 'training'].includes(scope)) return false;
  const tid = getCoachTrainerId(user);
  const rt = routineTrainerId(routine);
  if (tid != null && rt != null) return tid === rt;
  return Number(routine.created_by) === Number(user.id);
}

function isPlatformRoutine(routine) {
  return (routine?.scope || 'd28d_platform') === 'd28d_platform';
}

function canReadRoutine(user, routine) {
  if (!routine) return false;
  if (isPlatformManager(user)) return true;
  if (isCoachUser(user)) return isCoachOwnedRoutine(routine, user);
  if (isD28dHost(user) && isPlatformRoutine(routine)) return true;
  if (canListRoutinesForLive(user) && isPlatformRoutine(routine)) return true;
  return false;
}

function canWriteRoutine(user, routine) {
  if (!routine) return isCoachUser(user) && getCoachTrainerId(user) != null;
  if (isPlatformRoutine(routine)) return isPlatformManager(user);
  return isCoachOwnedRoutine(routine, user);
}

function buildListFilter(user, query = {}) {
  if (isPlatformManager(user) && query.scope !== 'coach') {
    return { scopes: ['d28d_platform', 'gym_wl'] };
  }
  if (isCoachUser(user)) {
    const tid = getCoachTrainerId(user);
    if (tid == null) return { coachUserId: -1 };
    return { coachTrainerId: tid };
  }
  if (isD28dHost(user) || canListRoutinesForLive(user)) {
    return { scopes: ['d28d_platform'] };
  }
  return { scopes: [] };
}

function defaultScopeForCreate(user) {
  if (isCoachUser(user) && !isPlatformManager(user)) return 'coach_wl';
  return 'd28d_platform';
}

function trainerIdForCreate(user) {
  return getCoachTrainerId(user);
}

module.exports = {
  canListRoutines,
  canListRoutinesForLive,
  canManagePlatform,
  canManageCoachRoutines,
  canReadRoutine,
  canWriteRoutine,
  buildListFilter,
  defaultScopeForCreate,
  trainerIdForCreate,
  isPlatformRoutine,
  isCoachOwnedRoutine,
  isD28dHost,
};
