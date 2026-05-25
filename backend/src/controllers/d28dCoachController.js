const { hasRole } = require('../utils/accessControl');
const trackingService = require('../services/d28dCoachTrackingService');
const TrainingLogStore = require('../models/TrainingLogStore');
const { canD28dHostAccessUser } = require('../utils/d28dCoachTracking');

const D28D_HOST_ROLE = 'entrenador_d28d';

function isD28dHostActor(user) {
  return hasRole(user, [D28D_HOST_ROLE]);
}

exports.getOverview = async (req, res) => {
  try {
    if (!isD28dHostActor(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo entrenador D28D' });
    }
    const data = await trackingService.getOverview(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('d28d coach overview:', err);
    return res.status(500).json({ success: false, message: 'Error obteniendo seguimiento' });
  }
};

exports.getTrainingLogs = (req, res) => {
  try {
    if (!isD28dHostActor(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo entrenador D28D' });
    }
    const data = trackingService.getTrainingLogsForHost(req.user, req.query);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('d28d coach training logs:', err);
    return res.status(500).json({ success: false, message: 'Error obteniendo diario' });
  }
};

exports.updateTrainingLogNotes = (req, res) => {
  try {
    if (!isD28dHostActor(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo entrenador D28D' });
    }
    const log = TrainingLogStore.getById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    if (!canD28dHostAccessUser(req.user, log.user_id)) {
      return res.status(403).json({ success: false, message: 'Sin acceso a este usuario' });
    }
    const { trainer_notes } = req.body;
    const updated = TrainingLogStore.update(req.params.id, { trainer_notes });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('d28d coach log update:', err);
    return res.status(500).json({ success: false, message: 'Error actualizando notas' });
  }
};
