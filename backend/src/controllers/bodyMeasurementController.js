const BodyMeasurementStore = require('../models/BodyMeasurementStore');
const userDB = require('../models/UserDatabase');
const { getCoachTrainerId, isCoachUser } = require('../utils/coachScope');

function canAccessUser(actor, targetUserId) {
  if (!actor) return false;
  if (Number(actor.id) === Number(targetUserId)) return true;
  const roles = Array.isArray(actor.roles) && actor.roles.length ? actor.roles : [actor.rol];
  if (roles.some((r) => ['super_admin', 'admin_d28d', 'admin_training'].includes(r))) return true;
  if (!isCoachUser(actor)) return false;
  const client = userDB.getById(Number(targetUserId));
  const tid = getCoachTrainerId(actor);
  return client && tid != null && Number(client.trainer_id) === Number(tid);
}

exports.listMine = async (req, res) => {
  try {
    await BodyMeasurementStore.hydrate?.();
    const data = BodyMeasurementStore.getByUserId(req.user.id);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error listando medidas' });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!canAccessUser(req.user, userId)) {
      return res.status(403).json({ error: 'Sin permiso para ver medidas de este usuario' });
    }
    await BodyMeasurementStore.hydrate?.();
    const data = BodyMeasurementStore.getByUserId(userId);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error' });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.body?.user_id != null ? Number(req.body.user_id) : req.user.id;
    if (!canAccessUser(req.user, userId)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    await BodyMeasurementStore.hydrate?.();
    const entry = BodyMeasurementStore.create({
      user_id: userId,
      ...req.body,
    });
    if (userId === req.user.id && entry.weight_kg != null) {
      const u = userDB.getById(userId);
      if (u) {
        u.peso = entry.weight_kg;
        userDB.update?.(userId, { peso: entry.weight_kg });
      }
    }
    return res.status(201).json({ success: true, data: entry });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error guardando medidas' });
  }
};

exports.update = async (req, res) => {
  try {
    await BodyMeasurementStore.hydrate?.();
    const current = BodyMeasurementStore.getById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Registro no encontrado' });
    if (!canAccessUser(req.user, current.user_id)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const updated = BodyMeasurementStore.update(req.params.id, req.body || {});
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error actualizando' });
  }
};

exports.remove = async (req, res) => {
  try {
    await BodyMeasurementStore.hydrate?.();
    const current = BodyMeasurementStore.getById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Registro no encontrado' });
    if (!canAccessUser(req.user, current.user_id)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    BodyMeasurementStore.delete(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error eliminando' });
  }
};
