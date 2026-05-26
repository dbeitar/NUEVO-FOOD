const { getPrisma } = require('../../lib/prisma');
const { toLegacy, toPrisma } = require('../mappers/userMapper');

async function findAllLegacy() {
  const rows = await getPrisma().user.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toLegacy);
}

async function findByEmail(email) {
  const row = await getPrisma().user.findUnique({ where: { email } });
  return toLegacy(row);
}

async function findById(id) {
  const row = await getPrisma().user.findUnique({ where: { id: Number(id) } });
  return toLegacy(row);
}

async function createLegacy(legacy) {
  const data = toPrisma(legacy);
  const row = await getPrisma().user.upsert({
    where: { email: legacy.email },
    create: data,
    update: data,
  });
  return toLegacy(row);
}

/** Actualización parcial (provisionamiento: training_user_id, food_user_id, etc.). */
async function patchLegacy(id, updates = {}) {
  const data = {};
  if (updates.training_user_id !== undefined) {
    data.trainingUserId = updates.training_user_id ? String(updates.training_user_id) : null;
  }
  if (updates.food_user_id !== undefined) {
    data.foodUserId = updates.food_user_id ? String(updates.food_user_id) : null;
  }
  if (updates.module_access !== undefined) {
    data.moduleAccess = updates.module_access || {};
  }
  if (updates.gym_id !== undefined || updates.gymId !== undefined) {
    const gid = updates.gym_id ?? updates.gymId;
    data.gymId = gid != null ? Number(gid) : null;
  }
  if (updates.trainer_id !== undefined || updates.trainerId !== undefined) {
    const tid = updates.trainer_id ?? updates.trainerId;
    data.trainerId = tid != null ? Number(tid) : null;
  }
  if (Object.keys(data).length === 0) return findById(id);
  const row = await getPrisma().user.update({
    where: { id: Number(id) },
    data,
  });
  return toLegacy(row);
}

async function updateLegacy(id, updates) {
  const patchOnly = updates && Object.keys(updates).every((k) => (
    ['training_user_id', 'food_user_id', 'module_access', 'gym_id', 'gymId', 'trainer_id', 'trainerId'].includes(k)
  ));
  if (patchOnly) return patchLegacy(id, updates);

  const existing = await findById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, id: Number(id) };
  const data = toPrisma(merged);
  if (data.gymId == null) delete data.gymId;
  if (data.trainerId == null) delete data.trainerId;
  const row = await getPrisma().user.update({
    where: { id: Number(id) },
    data,
  });
  return toLegacy(row);
}

async function upsertLegacy(legacy) {
  return createLegacy(legacy);
}

async function deleteSoft(id) {
  await getPrisma().user.update({
    where: { id: Number(id) },
    data: { activo: false },
  });
  return true;
}

module.exports = {
  findAllLegacy,
  findByEmail,
  findById,
  createLegacy,
  updateLegacy,
  patchLegacy,
  upsertLegacy,
  deleteSoft,
};
