/**
 * Aislamiento multi-tenant para módulo TRAINING (planes, logs, galería).
 */
const UserDatabase = require('../models/UserDatabase');
const {
  isPlatformAdmin,
  isGymAdmin,
  getUserGymId,
  getUserTrainerId,
} = require('./tenantScope');
const { isCoachUser, getCoachTrainerId } = require('./coachScope');

function rolesOf(user) {
  if (!user) return [];
  return Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol].filter(Boolean);
}

function isCoachRole(user) {
  return rolesOf(user).some((r) => ['entrenador', 'admin_training', 'admin_entrenador'].includes(r));
}

function userIdsInGym(gymId) {
  if (gymId == null) return new Set();
  return new Set(
    UserDatabase.getAll()
      .filter((u) => String(u.gym_id ?? u.gymId ?? '') === String(gymId))
      .map((u) => Number(u.id)),
  );
}

function canAccessTargetUser(actor, targetUserId) {
  if (!actor || targetUserId == null) return false;
  if (isPlatformAdmin(actor)) return true;
  if (Number(actor.id) === Number(targetUserId)) return true;
  const gymId = getUserGymId(actor);
  if (isGymAdmin(actor) && gymId != null) {
    return userIdsInGym(gymId).has(Number(targetUserId));
  }
  if (isCoachRole(actor)) {
    const coachTrainerId = getCoachTrainerId(actor);
    if (coachTrainerId == null) return false;
    const target = UserDatabase.getById(Number(targetUserId));
    return target && Number(target.trainer_id) === Number(coachTrainerId);
  }
  return false;
}

function filterTrainingPlans(plans, actor) {
  if (!Array.isArray(plans)) return [];
  if (isPlatformAdmin(actor)) return plans;
  if (isCoachRole(actor)) {
    const coachTrainerId = getUserTrainerId(actor) || actor.id;
    return plans.filter((p) => Number(p.trainer_id) === Number(coachTrainerId));
  }
  if (isGymAdmin(actor)) {
    const allowed = userIdsInGym(getUserGymId(actor));
    return plans.filter((p) => allowed.has(Number(p.user_id)));
  }
  return plans.filter((p) => Number(p.user_id) === Number(actor.id));
}

function filterTrainingLogs(logs, actor) {
  if (!Array.isArray(logs)) return [];
  if (isPlatformAdmin(actor)) return logs;
  return logs.filter((l) => canAccessTargetUser(actor, l.user_id));
}

function filterGalleryItems(items, actor) {
  if (!Array.isArray(items)) return [];
  if (isPlatformAdmin(actor)) return items;
  if (isCoachUser(actor)) {
    const tid = getCoachTrainerId(actor);
    if (tid == null) return [];
    return items.filter((i) => Number(i.trainer_id) === Number(tid));
  }
  const coachTid = getUserTrainerId(actor) ?? actor?.trainer_id ?? null;
  if (coachTid != null) {
    return items.filter(
      (i) => Number(i.trainer_id) === Number(coachTid)
        || (i.is_global !== false && i.trainer_id == null),
    );
  }
  const gymId = getUserGymId(actor);
  if (gymId == null) {
    return items.filter((i) => i.is_global !== false && i.trainer_id == null);
  }
  return items.filter(
    (i) => (i.is_global !== false && i.trainer_id == null) || String(i.gym_id ?? '') === String(gymId),
  );
}

module.exports = {
  canAccessTargetUser,
  filterTrainingPlans,
  filterTrainingLogs,
  filterGalleryItems,
  isCoachRole,
};
