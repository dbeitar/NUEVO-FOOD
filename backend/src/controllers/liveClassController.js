const LiveClassDatabase = require('../models/LiveClassDatabase');

const isAdmin = (req) => req.user && ['super_admin', 'admin_gimnasio'].includes(req.user.rol);
const canAccessClass = (classItem, user) => {
  if (!classItem || !classItem.active) return false;
  if (classItem.gym_id === null) return true;
  return user && (user.gym_id === classItem.gym_id || user.gymId === classItem.gym_id);
};

const getPublicClasses = (req, res) => {
  try {
    const classes = LiveClassDatabase.getAll().filter((item) => item.active && (item.gym_id === null || canAccessClass(item, req.user)));
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error('Error obteniendo clases en vivo:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const getAdminClasses = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver las clases' });
    }
    return res.json({ success: true, data: LiveClassDatabase.getAll() });
  } catch (error) {
    console.error('Error obteniendo clases admin:', error);
    return res.status(500).json({ error: 'Error obteniendo clases en vivo' });
  }
};

const createClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para crear clases' });
    }
    const { title, description = '', zoom_link, start_time, end_time, gym_id = null, active = true, is_global = true } = req.body || {};
    if (!title || !zoom_link || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, zoom_link, start_time y end_time son requeridos' });
    }
    const created = LiveClassDatabase.create({
      title,
      description,
      zoom_link,
      start_time,
      end_time,
      gym_id: gym_id || null,
      active,
      is_global,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error creando clase en vivo:', error);
    return res.status(500).json({ error: 'Error creando clase en vivo' });
  }
};

const updateClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar clases' });
    }
    const id = parseInt(req.params.id, 10);
    const updated = LiveClassDatabase.update(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error actualizando clase en vivo:', error);
    return res.status(500).json({ error: 'Error actualizando clase en vivo' });
  }
};

const deleteClass = (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar clases' });
    }
    const id = parseInt(req.params.id, 10);
    const deleted = LiveClassDatabase.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando clase en vivo:', error);
    return res.status(500).json({ error: 'Error eliminando clase en vivo' });
  }
};

module.exports = {
  getPublicClasses,
  getAdminClasses,
  createClass,
  updateClass,
  deleteClass,
};
