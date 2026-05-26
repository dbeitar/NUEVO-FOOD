const TrainerMastersDatabase = require('../models/TrainerMastersDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const userDB = require('../models/UserDatabase');
const { hasRole } = require('../utils/accessControl');

const canManageTrainer = (req, trainerId) => {
  if (hasRole(req.user, ['super_admin', 'admin_marca', 'admin_gimnasio'])) return true;
  if (!hasRole(req.user, ['entrenador'])) return false;
  const trainer = TrainersDatabase.getById(Number(trainerId));
  return trainer && (trainer.email === req.user.email || Number(req.user.trainer_id) === Number(trainerId));
};

const getAll = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_marca', 'admin_gimnasio'])) {
      return res.status(403).json({ error: 'No tienes permiso para ver todos los maestros' });
    }
    return res.json({ success: true, data: TrainerMastersDatabase.getAll() });
  } catch (error) {
    console.error('Error obteniendo maestros de entrenador:', error);
    return res.status(500).json({ error: 'Error obteniendo maestros de entrenador' });
  }
};

const getByTrainerId = (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!canManageTrainer(req, trainerId)) {
      return res.status(403).json({ error: 'No tienes permiso para este maestro' });
    }
    const data = TrainerMastersDatabase.getByTrainerId(trainerId);
    if (!data) return res.status(404).json({ error: 'Maestro no encontrado' });
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error obteniendo maestro:', error);
    return res.status(500).json({ error: 'Error obteniendo maestro' });
  }
};

const update = (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    if (!canManageTrainer(req, trainerId)) {
      return res.status(403).json({ error: 'No tienes permiso para editar este maestro' });
    }
    const updated = TrainerMastersDatabase.update(trainerId, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Maestro no encontrado' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error actualizando maestro:', error);
    return res.status(500).json({ error: 'Error actualizando maestro' });
  }
};

const assignUser = (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    const userId = Number(req.body?.user_id);
    if (!canManageTrainer(req, trainerId)) {
      return res.status(403).json({ error: 'No tienes permiso para asignar usuarios' });
    }
    const user = userDB.getById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    userDB.update(userId, { trainer_id: trainerId });
    const updated = TrainerMastersDatabase.assignUser(trainerId, userId);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error asignando usuario a entrenador:', error);
    return res.status(500).json({ error: 'Error asignando usuario a entrenador' });
  }
};

module.exports = {
  assignUser,
  getAll,
  getByTrainerId,
  update,
};
