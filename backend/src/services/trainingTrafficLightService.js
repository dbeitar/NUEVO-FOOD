const TrainingLogStore = require('../models/TrainingLogStore');
const TrainingPlansStore = require('../models/TrainingPlansStore');
const coachTraining = require('./coachTrainingService');
const { getCoachTrainerId } = require('../utils/coachScope');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');
const communicationCenter = require('./communicationCenterService');
const platformAudit = require('./platformAuditService');

const WINDOW_DAYS = 7;

function trafficLight(pct) {
  if (pct >= 70) return 'GREEN';
  if (pct >= 40) return 'YELLOW';
  return 'RED';
}

function computeAdherence(userId, windowDays = WINDOW_DAYS) {
  const uid = Number(userId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const logs = TrainingLogStore.getAll().filter(
    (l) => Number(l.user_id) === uid && String(l.fecha) >= cutoffStr,
  );
  const planned = windowDays;
  const executed = logs.filter((l) => (l.ejercicios || []).length > 0).length;
  const pct = planned ? Math.round((executed / planned) * 100) : 0;
  return { adherence_pct: Math.min(pct, 100), executed, planned, status: trafficLight(pct) };
}

async function getForUser(userId) {
  const data = computeAdherence(userId);
  const plans = TrainingPlansStore.getAll().filter((p) => Number(p.user_id) === Number(userId));
  return {
    user_id: userId,
    plan_count: plans.length,
    ...data,
    traffic_light: data.status.toLowerCase(),
    window_days: WINDOW_DAYS,
    computed_at: new Date().toISOString(),
  };
}

async function saveSnapshot(userId, trainerId, data) {
  if (!useRelationalStorage()) return;
  try {
    await getPrisma().trainingTrafficLightSnapshot.create({
      data: {
        userId: Number(userId),
        trainerId: trainerId || null,
        status: data.status,
        adherencePct: data.adherence_pct,
        windowDays: WINDOW_DAYS,
      },
    });
  } catch (e) {
    console.warn('[trainingTrafficLight]', e.message);
  }
}

async function coachClientsWithLight(coachUser) {
  const clients = coachTraining.coachClients ? coachTraining.coachClients(coachUser) : [];
  return clients.map((c) => {
    const m = computeAdherence(c.id);
    return {
      user_id: c.id,
      nombre: c.nombre,
      email: c.email,
      ...m,
      traffic_light: m.status.toLowerCase(),
    };
  });
}

async function maybeNotifyTrafficLight(userId, data) {
  const key = `training.traffic_light.${data.status.toLowerCase()}`;
  await communicationCenter.dispatchEvent({
    evento: key,
    modulo: 'training',
    userId,
    vars: { adherence_pct: String(data.adherence_pct), status: data.status },
  }).catch(() => {});
  await platformAudit.log(userId, 'training', `traffic_light.${data.status.toLowerCase()}`, 'user', userId);
}

module.exports = {
  computeAdherence,
  getForUser,
  saveSnapshot,
  coachClientsWithLight,
  maybeNotifyTrafficLight,
  trafficLight,
};
