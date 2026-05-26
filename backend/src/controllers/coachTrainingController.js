const coachTraining = require('../services/coachTrainingService');
const TrainingPlansStore = require('../models/TrainingPlansStore');
const { isCoachUser, getCoachTrainerId } = require('../utils/coachScope');
const { auditTraining } = require('../services/trainingAudit');
const userDB = require('../models/UserDatabase');

function denyIfNotCoach(req, res) {
  if (!isCoachUser(req.user)) {
    res.status(403).json({ error: 'Solo entrenadores pueden usar esta función' });
    return true;
  }
  if (getCoachTrainerId(req.user) == null) {
    res.status(400).json({ error: 'Cuenta sin entrenador vinculado' });
    return true;
  }
  return false;
}

exports.getClients = async (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    await coachTraining.hydrateCoachNotifications?.();
    const data = await coachTraining.listClientsWithStats(req.user);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error listando clientes' });
  }
};

exports.getClientInsights = (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    const data = coachTraining.clientInsights(req.user, req.params.userId);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error obteniendo ficha' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    await coachTraining.hydrateCoachNotifications?.();
    const tid = getCoachTrainerId(req.user);
    const unreadOnly = req.query.unread === 'true';
    const data = await coachTraining.listNotifications(tid, { unreadOnly });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    const tid = getCoachTrainerId(req.user);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : null;
    await coachTraining.markNotificationsRead(tid, ids);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Error' });
  }
};

exports.aiBuildPlanFromRoutine = async (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    const { routine_id, user_id, dias = 4 } = req.body || {};
    if (!routine_id || !user_id) {
      return res.status(400).json({ error: 'routine_id y user_id son requeridos' });
    }
    const client = userDB.getById(Number(user_id));
    const tid = getCoachTrainerId(req.user);
    if (!client || Number(client.trainer_id) !== Number(tid)) {
      return res.status(403).json({ error: 'El usuario no es tu cliente' });
    }
    const built = await coachTraining.buildPlanDaysFromRoutine(routine_id, dias, req.user);
    const plan = TrainingPlansStore.create({
      user_id: Number(user_id),
      trainer_id: tid,
      level: built.level,
      method: built.method,
      split_type: built.split_type,
      dias: built.dias,
    });
    auditTraining(req.user.id, 'training.assignment', 'Plan generado desde plantilla IA', {
      plan_id: plan.id,
      user_id,
      routine_id,
    });
    await coachTraining.pushNotification({
      trainer_id: tid,
      user_id: Number(user_id),
      type: 'plan_assigned',
      title: 'Nuevo plan de entrenamiento',
      body: `Tu entrenador te asignó: ${built.routine.nombre}`,
      meta: { plan_id: plan.id, routine_id },
    });
    return res.status(201).json({
      success: true,
      data: { plan, routine: { id: built.routine.id, nombre: built.routine.nombre } },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error creando plan' });
  }
};

exports.previewPlanFromRoutine = async (req, res) => {
  try {
    if (denyIfNotCoach(req, res)) return;
    const { routine_id, dias = 4 } = req.body || {};
    if (!routine_id) return res.status(400).json({ error: 'routine_id requerido' });
    const built = await coachTraining.buildPlanDaysFromRoutine(routine_id, dias, req.user);
    return res.json({
      success: true,
      data: {
        routine_id: built.routine.id,
        nombre: built.routine.nombre,
        dias: built.dias,
        dias_count: built.dias.length,
        specialist_note: 'Cada día incluye calentamiento, trabajo principal, cardio con pulsaciones y estiramiento. Intensidad en RPE/RIR.',
      },
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || 'Error en vista previa' });
  }
};
