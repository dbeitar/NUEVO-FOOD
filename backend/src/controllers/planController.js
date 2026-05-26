const UserPlanStore = require('../models/UserPlanStore');
const { hasRole } = require('../utils/accessControl');

const canEditNutritionPlan = (user) => hasRole(user, [
  'super_admin', 'admin_gimnasio', 'admin_marca',
  'entrenador', 'nutricionista', 'admin_food', 'admin_food_plan',
  'admin_entrenador', 'admin_training',
]);

const planController = {
  getMine: (req, res) => {
    try {
      const plan = UserPlanStore.get(req.user.id);
      res.json({ success: true, data: plan });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error al obtener plan' });
    }
  },
  updateForUser: (req, res) => {
    try {
      if (!canEditNutritionPlan(req.user)) {
        return res.status(403).json({ success: false, error: 'Sin permisos para actualizar plan' });
      }
      const { userId } = req.params;
      const updated = UserPlanStore.update(parseInt(userId, 10), req.body || {}, req.user.id);
      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(500).json({ success: false, error: 'Error al actualizar plan' });
    }
  },
};

module.exports = planController;
