const store = new Map();

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
    if (!store.has(userId)) {
      store.set(userId, defaultPlan());
    }
    return store.get(userId);
  },
  update(userId, updates = {}, updatedBy = null) {
    const prev = this.get(userId);
    const merged = {
      ...prev,
      ...updates,
      updatedAt: new Date(),
      updatedBy,
    };
    store.set(userId, merged);
    return merged;
  },
};
