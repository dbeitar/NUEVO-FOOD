const userRepo = require('../db/repositories/userRepository');
const { hasRole } = require('./accessControl');
const { getUserGymId, isPlatformAdmin } = require('./tenantScope');

async function canViewUserLicenses(actor, targetUserId) {
  if (!actor?.id) return false;
  if (isPlatformAdmin(actor) || hasRole(actor, ['super_admin', 'admin_d28d'])) return true;

  const target = await userRepo.findById(Number(targetUserId));
  if (!target) return false;

  if (hasRole(actor, ['admin_gimnasio', 'admin_marca', 'admin_gym'])) {
    const actorGym = getUserGymId(actor);
    if (actorGym == null) return false;
    return String(target.gym_id ?? '') === String(actorGym);
  }

  if (hasRole(actor, ['admin_food', 'admin_food_plan', 'admin_training', 'admin_entrenador'])) {
    return false;
  }

  return Number(actor.id) === Number(targetUserId);
}

module.exports = { canViewUserLicenses };
