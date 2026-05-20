const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');

const store = new JsonStore('user_plans.json', {});
let plans = {};
if (!useRelationalStorage()) {
  plans = store.getAll();
  if (typeof plans !== 'object' || plans === null || Array.isArray(plans)) plans = {};
}

async function savePlan(userId, payload) {
  if (useRelationalStorage()) {
    await getPrisma().userPlan.upsert({
      where: { userId: Number(userId) },
      create: { userId: Number(userId), payload },
      update: { payload },
    });
  } else {
    store.setAll(plans);
  }
}

const api = {
  // Devuelve el plan del usuario o null si todavía no tiene uno asignado.
  // No se auto-popula con valores ficticios para no mostrar datos falsos al usuario.
  get(userId) {
    const key = String(userId);
    return plans[key] || null;
  },
  update(userId, updates = {}, updatedBy = null) {
    const key = String(userId);
    const prev = plans[key] || {};
    const merged = {
      ...prev,
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    };
    plans[key] = merged;
    savePlan(userId, merged).catch((e) => console.error('[UserPlan]', e.message));
    return merged;
  },

  async hydrate() {
    if (!useRelationalStorage()) return;
    const rows = await getPrisma().userPlan.findMany();
    plans = {};
    rows.forEach((r) => {
      plans[String(r.userId)] = r.payload;
    });
  },
};

module.exports = api;
