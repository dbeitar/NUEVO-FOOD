const platformAudit = require('../services/platformAuditService');
const { hasRole } = require('../utils/accessControl');

exports.list = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const data = await platformAudit.list({ modulo: req.query.modulo, limit: Number(req.query.limit) || 100 });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
