const progressService = require('../services/d28dProgressService');
const { hasRole } = require('../utils/accessControl');

exports.getMyProgress = async (req, res) => {
  try {
    const programId = req.user?.module_access?.d28d_program || req.query.program_id || null;
    const data = progressService.computeForUser(req.user.id, programId);
    await progressService.saveSnapshot(data);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getUserProgress = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const data = progressService.computeForUser(req.params.userId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getAdminOverview = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    res.json({ success: true, data: progressService.adminOverview() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.recompute = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const data = progressService.computeForUser(req.body.user_id || req.user.id);
    await progressService.saveSnapshot(data);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
