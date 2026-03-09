const UserPlanStore = require('../models/UserPlanStore');

const allowedEditors = new Set(['super_admin', 'admin_gimnasio', 'entrenador']);

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
      if (!allowedEditors.has(req.user.rol)) {
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
