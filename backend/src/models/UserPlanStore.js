const JsonStore = require('../utils/JsonStore');

const store = new JsonStore('user_plans.json', {});
let plans = store.getAll();
if (typeof plans !== 'object' || plans === null || Array.isArray(plans)) {
  plans = {};
}

function save() {
  store.setAll(plans);
}

function defaultPlan() {
  return {
    calorias: 2000,
    proteina: 150,
    carbohidratos: 250,
    grasas: 65,
    objetivo: 'Mantenimiento',
    nivelActividad: 'Moderado',
    updatedAt: new Date(),
    updatedBy: null,
  };
}

module.exports = {
  get(userId) {
    const key = String(userId);
    if (!plans[key]) {
      plans[key] = defaultPlan();
      save();
    }
    return plans[key];
  },
  update(userId, updates = {}, updatedBy = null) {
    const key = String(userId);
    const prev = this.get(userId);
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
