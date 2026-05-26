const { getPrisma } = require('../../lib/prisma');

function payloadToPlan(row) {
  const p = row.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    ...p,
    id: p.id != null ? p.id : row.id,
    user_id: row.userId,
    trainer_id: row.trainerId,
    _sql_id: row.id,
  };
}

async function findAllLegacy() {
  const rows = await getPrisma().trainingPlanRow.findMany({
    where: { activo: true },
    orderBy: { id: 'asc' },
  });
  return rows.map(payloadToPlan);
}

async function upsertFromLegacy(plan) {
  const userId = Number(plan.user_id);
  if (!userId) return null;
  const existing = await getPrisma().trainingPlanRow.findFirst({
    where: { userId, activo: true },
    orderBy: { id: 'desc' },
  });
  const payload = { ...plan };
  if (existing) {
    const row = await getPrisma().trainingPlanRow.update({
      where: { id: existing.id },
      data: { payload, trainerId: plan.trainer_id ? Number(plan.trainer_id) : null },
    });
    return payloadToPlan(row);
  }
  const row = await getPrisma().trainingPlanRow.create({
    data: {
      userId,
      trainerId: plan.trainer_id ? Number(plan.trainer_id) : null,
      payload,
    },
  });
  return payloadToPlan(row);
}

module.exports = { findAllLegacy, upsertFromLegacy, payloadToPlan };
