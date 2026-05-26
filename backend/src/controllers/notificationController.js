const NotificationDatabase = require('../models/NotificationDatabase');

exports.listMine = (req, res) => {
  try {
    const data = NotificationDatabase.getByUserId(req.user.id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
};

exports.markRead = (req, res) => {
  try {
    const updated = NotificationDatabase.markRead(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ error: 'Notificación no encontrada' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Error actualizando notificación' });
  }
};
