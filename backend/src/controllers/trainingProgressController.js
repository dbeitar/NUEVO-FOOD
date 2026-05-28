const trafficService = require('../services/trainingTrafficLightService');
const { hasRole } = require('../utils/accessControl');

exports.getMyProgress = async (req, res) => {
  try {
    const data = await trafficService.getForUser(req.user.id);
    await trafficService.saveSnapshot(req.user.id, req.user.trainer_id, data);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getMyTrafficLight = async (req, res) => {
  try {
    const data = await trafficService.getForUser(req.user.id);
    res.json({ success: true, data: { status: data.status, traffic_light: data.traffic_light, adherence_pct: data.adherence_pct } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getCoachClients = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d', 'entrenador', 'admin_training', 'admin_entrenador'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const data = await trafficService.coachClientsWithLight(req.user);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
