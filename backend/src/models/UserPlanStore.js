const JsonStore = require('../utils/JsonStore');

const store = new JsonStore('user_plans.json', {});
let plans = store.getAll();
if (typeof plans !== 'object' || plans === null || Array.isArray(plans)) {
  plans = {};
}

function save() {
  store.setAll(plans);
}

module.exports = {
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
    save();
    return merged;
  },
};
