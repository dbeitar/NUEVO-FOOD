/**
 * Lógica de negocio del módulo entrenador (seguimiento, IA, planes).
 */
const userDB = require('../models/UserDatabase');
const TrainingLogStore = require('../models/TrainingLogStore');
const BodyMeasurementStore = require('../models/BodyMeasurementStore');
const TrainingPlansStore = require('../models/TrainingPlansStore');
const ExercisesGalleryStore = require('../models/ExercisesGalleryStore');
const routineService = require('./d28dRoutineService');
const { getCoachTrainerId, isCoachUser } = require('../utils/coachScope');
const { canReadRoutine } = require('../utils/d28dRoutineAccess');
const { filterGalleryItems } = require('../utils/trainingTenantScope');
const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const domainRepo = require('../db/repositories/domainDocumentRepository');

const notifyStore = new JsonStore('coach_notifications.json', []);
let notifications = [];
let notifyNextId = 1;
let notifyHydrated = false;

function recomputeNotifyId() {
  notifyNextId = notifications.length
    ? Math.max(...notifications.map((n) => n.id || 0)) + 1
    : 1;
}

function persistNotifications() {
  if (useRelationalStorage()) {
    domainRepo.setArray('coach_notifications', notifications).catch((e) => {
      console.error('[coachTraining] notifications persist:', e.message);
    });
  } else {
    notifyStore.setAll(notifications);
  }
}

async function ensureNotificationsLoaded() {
  if (notifyHydrated) return;
  if (useRelationalStorage()) {
    const fromDb = await domainRepo.getArray('coach_notifications');
    notifications = Array.isArray(fromDb) ? fromDb : [];
    if (!notifications.length) {
      const disk = notifyStore.getAll();
      if (Array.isArray(disk) && disk.length) {
        notifications = disk;
        await domainRepo.setArray('coach_notifications', notifications);
      }
    }
  } else {
    notifications = notifyStore.getAll();
    if (!Array.isArray(notifications)) notifications = [];
  }
  recomputeNotifyId();
  notifyHydrated = true;
}

function normalizeName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function galleryUrlForExercise(name, coachUser) {
  const items = filterGalleryItems(ExercisesGalleryStore.getAll(), coachUser);
  const key = normalizeName(name);
  const hit = items.find((i) => normalizeName(i.name) === key);
  return hit?.youtube_url || null;
}

function coachClients(actor) {
  const tid = getCoachTrainerId(actor);
  if (tid == null) return [];
  return userDB.getAll().filter((u) => {
    const roles = Array.isArray(u.roles) && u.roles.length ? u.roles : [u.rol];
    if (roles.some((r) => ['super_admin', 'admin_d28d', 'entrenador', 'admin_training'].includes(r))) {
      return false;
    }
    return Number(u.trainer_id) === Number(tid);
  });
}

async function pushNotification({ trainer_id, user_id, type, title, body, meta = {} }) {
  await ensureNotificationsLoaded();
  const entry = {
    id: notifyNextId++,
    trainer_id: Number(trainer_id),
    user_id: Number(user_id),
    type,
    title,
    body,
    meta,
    read: false,
    created_at: new Date().toISOString(),
  };
  notifications.push(entry);
  persistNotifications();
  return entry;
}

async function listNotifications(trainerId, { unreadOnly = false } = {}) {
  await ensureNotificationsLoaded();
  let list = notifications.filter((n) => Number(n.trainer_id) === Number(trainerId));
  if (unreadOnly) list = list.filter((n) => !n.read);
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function markNotificationsRead(trainerId, ids = null) {
  await ensureNotificationsLoaded();
  notifications = notifications.map((n) => {
    if (Number(n.trainer_id) !== Number(trainerId)) return n;
    if (ids && !ids.includes(n.id)) return n;
    return { ...n, read: true };
  });
  persistNotifications();
}

async function hydrateCoachNotifications() {
  await ensureNotificationsLoaded();
}

function progressionFromLogs(logs) {
  const byExercise = {};
  const sorted = [...logs].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  for (const log of sorted) {
    for (const ex of log.ejercicios || []) {
      const name = ex.exercise_name || 'Ejercicio';
      if (!byExercise[name]) byExercise[name] = [];
      const weight = Number(ex.weight_kg) || 0;
      byExercise[name].push({
        fecha: log.fecha,
        weight_kg: weight,
        reps: ex.reps_done || '',
        sets: ex.sets_done || 0,
      });
    }
  }
  return Object.entries(byExercise).map(([exercise_name, points]) => {
    const weights = points.map((p) => p.weight_kg).filter((w) => w > 0);
    const first = weights[0] ?? 0;
    const last = weights[weights.length - 1] ?? 0;
    const delta = last - first;
    return {
      exercise_name,
      points,
      first_weight: first,
      last_weight: last,
      delta_kg: Math.round(delta * 10) / 10,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    };
  }).sort((a, b) => Math.abs(b.delta_kg) - Math.abs(a.delta_kg));
}

function wellnessSummary(logs) {
  const recent = logs.slice(0, 14);
  if (!recent.length) return null;
  const avg = (field) => {
    const vals = recent
      .map((l) => l.wellness?.[field])
      .filter((v) => v != null && !Number.isNaN(Number(v)));
    if (!vals.length) return null;
    return Math.round((vals.reduce((s, v) => s + Number(v), 0) / vals.length) * 10) / 10;
  };
  return {
    sessions: recent.length,
    sleep_hours: avg('sleep_hours'),
    sleep_quality: avg('sleep_quality'),
    stress_level: avg('stress_level'),
    energy_level: avg('energy_level'),
    appetite: avg('appetite'),
    soreness: avg('soreness'),
  };
}

function sessionWindowStats(logs, daysBack) {
  const since = Date.now() - Number(daysBack) * 86400000;
  const recent = (logs || []).filter((l) => l?.fecha && new Date(l.fecha).getTime() >= since);
  const total = recent.length;
  const completed = recent.filter((l) => l.completado).length;
  return {
    sessions: total,
    completed,
    adherence: total ? Math.round((completed / total) * 100) : 0,
  };
}

function streakFromLogs(logs) {
  const dates = (logs || [])
    .filter((l) => l?.fecha)
    .map((l) => String(l.fecha))
    .sort((a, b) => b.localeCompare(a));
  const unique = [...new Set(dates)];
  if (!unique.length) return { current: 0, best: 0 };
  const toDay = (iso) => Math.floor(new Date(iso).getTime() / 86400000);
  const days = unique.map(toDay);
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i - 1] - days[i] <= 1) run += 1;
    else { best = Math.max(best, run); run = 1; }
  }
  best = Math.max(best, run);
  // current streak counts from most recent day backwards with no gaps >1 day
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i - 1] - days[i] <= 1) current += 1;
    else break;
  }
  return { current, best };
}

function volumeFromLog(log) {
  let v = 0;
  for (const ex of log?.ejercicios || []) {
    const w = Number(ex.weight_kg) || 0;
    const sets = Number(ex.sets_done) || 0;
    const repsRaw = String(ex.reps_done || '').trim();
    const reps = Number.parseInt(repsRaw, 10) || 0;
    if (w > 0 && sets > 0 && reps > 0) v += w * sets * reps;
  }
  return Math.round(v);
}

function volumeByWeek(logs, weeks = 8) {
  const toWeekKey = (iso) => {
    const d = new Date(iso);
    const year = d.getUTCFullYear();
    const onejan = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  };
  const map = new Map();
  for (const l of logs || []) {
    if (!l?.fecha) continue;
    const key = toWeekKey(l.fecha);
    map.set(key, (map.get(key) || 0) + volumeFromLog(l));
  }
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b)).slice(-weeks);
  return keys.map((k) => ({ week: k, volume: map.get(k) || 0 }));
}

function prsFromLogs(logs) {
  const byEx = new Map();
  for (const l of logs || []) {
    for (const ex of l?.ejercicios || []) {
      const name = ex.exercise_name;
      if (!name) continue;
      const w = Number(ex.weight_kg) || 0;
      const repsRaw = String(ex.reps_done || '').trim();
      const reps = Number.parseInt(repsRaw, 10) || 0;
      const prev = byEx.get(name) || { max_weight: 0, max_reps: 0, last_fecha: null };
      const next = {
        max_weight: Math.max(prev.max_weight, w),
        max_reps: Math.max(prev.max_reps, reps),
        last_fecha: l.fecha || prev.last_fecha,
      };
      byEx.set(name, next);
    }
  }
  return [...byEx.entries()]
    .map(([exercise_name, p]) => ({ exercise_name, ...p }))
    .filter((p) => p.max_weight > 0 || p.max_reps > 0)
    .sort((a, b) => (b.max_weight - a.max_weight) || (b.max_reps - a.max_reps))
    .slice(0, 12);
}

function coachHeatmapFromLogs(logs, daysBack = 35) {
  const byDate = new Map();
  for (const l of logs || []) {
    if (!l?.fecha) continue;
    const key = String(l.fecha);
    const prev = byDate.get(key) || { date: key, total: 0, completed: 0, minutes: 0 };
    prev.total += 1;
    if (l.completado) prev.completed += 1;
    prev.minutes += Number(l.duration_minutes) || 0;
    byDate.set(key, prev);
  }
  const out = [];
  const now = new Date();
  for (let i = daysBack - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const rec = byDate.get(iso) || { date: iso, total: 0, completed: 0, minutes: 0 };
    out.push({
      date: rec.date,
      total: rec.total,
      completed: rec.completed,
      minutes: rec.minutes,
      intensity: rec.total === 0 ? 0 : rec.completed === rec.total ? 3 : 2,
    });
  }
  return out;
}

function improvementsFromLogs(logs, windowDays = 28) {
  const since = Date.now() - Number(windowDays) * 86400000;
  const recent = (logs || []).filter((l) => l?.fecha && new Date(l.fecha).getTime() >= since);
  const byEx = new Map();
  for (const l of recent) {
    for (const ex of l?.ejercicios || []) {
      const name = ex.exercise_name;
      if (!name) continue;
      const w = Number(ex.weight_kg) || 0;
      const reps = Number.parseInt(String(ex.reps_done || '').trim(), 10) || 0;
      const arr = byEx.get(name) || [];
      arr.push({ fecha: l.fecha, w, reps });
      byEx.set(name, arr);
    }
  }
  const out = [];
  for (const [exercise_name, arr] of byEx.entries()) {
    const sorted = arr.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    const weights = sorted.map((p) => p.w).filter((x) => x > 0);
    const repsList = sorted.map((p) => p.reps).filter((x) => x > 0);
    const w0 = weights[0] ?? 0;
    const w1 = weights[weights.length - 1] ?? 0;
    const r0 = repsList[0] ?? 0;
    const r1 = repsList[repsList.length - 1] ?? 0;
    const dw = w1 - w0;
    const dr = r1 - r0;
    if (dw === 0 && dr === 0) continue;
    out.push({
      exercise_name,
      delta_kg: Math.round(dw * 10) / 10,
      delta_reps: dr,
      first_weight: w0,
      last_weight: w1,
      first_reps: r0,
      last_reps: r1,
      points: sorted.slice(-6),
    });
  }
  out.sort((a, b) => (Math.abs(b.delta_kg) - Math.abs(a.delta_kg)) || (Math.abs(b.delta_reps) - Math.abs(a.delta_reps)));
  return out.slice(0, 10);
}

function coachAlerts({ stats7d, daysSinceLast, wellness, plan, measurements }) {
  const alerts = [];
  if (!plan) {
    alerts.push({
      severity: 'high',
      code: 'no_plan',
      title: 'Sin plan activo',
      message: 'Asigna un plan para guiar y medir adherencia.',
      action: 'Ir a Asignar planes / Asistente IA',
    });
  }
  if ((stats7d?.sessions || 0) === 0) {
    alerts.push({
      severity: 'high',
      code: 'no_sessions_7d',
      title: '0 sesiones en 7 días',
      message: 'Riesgo alto de abandono. Recomendación: contacto + sesión mínima.',
      action: 'Enviar recordatorio y ajustar carga',
    });
  } else if ((stats7d?.adherence || 0) < 50) {
    alerts.push({
      severity: 'medium',
      code: 'low_adherence',
      title: 'Adherencia baja (7d)',
      message: `Adherencia ${stats7d.adherence}%. Recomendación: reducir fricción (menos ejercicios, menos días).`,
      action: 'Simplificar plan y objetivos',
    });
  }
  if (daysSinceLast != null && daysSinceLast >= 7) {
    alerts.push({
      severity: 'high',
      code: 'inactive_7d',
      title: 'Inactividad',
      message: `Sin entrenar hace ${daysSinceLast} días.`,
      action: 'Reenganche: sesión corta + feedback',
    });
  }
  if (wellness) {
    if (wellness.sleep_hours != null && wellness.sleep_hours < 6) {
      alerts.push({
        severity: 'medium',
        code: 'low_sleep',
        title: 'Sueño bajo',
        message: `Promedio sueño ${wellness.sleep_hours}h (últimas 2 semanas).`,
        action: 'Bajar intensidad + educar higiene sueño',
      });
    }
    if (wellness.stress_level != null && wellness.stress_level >= 7) {
      alerts.push({
        severity: 'medium',
        code: 'high_stress',
        title: 'Estrés alto',
        message: `Estrés promedio ${wellness.stress_level}/10.`,
        action: 'Ajustar volumen + cardio zona 2',
      });
    }
    if (wellness.energy_level != null && wellness.energy_level <= 4) {
      alerts.push({
        severity: 'medium',
        code: 'low_energy',
        title: 'Energía baja',
        message: `Energía promedio ${wellness.energy_level}/10.`,
        action: 'Reducir densidad + revisar nutrición/sueño',
      });
    }
  }
  const weightSeries = (measurements || []).filter((m) => m.weight_kg != null).slice(0, 6);
  if (weightSeries.length >= 2) {
    const first = weightSeries[weightSeries.length - 1].weight_kg;
    const last = weightSeries[0].weight_kg;
    const delta = last - first;
    if (Math.abs(delta) >= 2) {
      alerts.push({
        severity: 'low',
        code: 'weight_change',
        title: 'Cambio de peso relevante',
        message: `Cambio ~${Math.round(delta * 10) / 10}kg en últimos registros.`,
        action: 'Validar si es objetivo esperado',
      });
    }
  }
  return alerts;
}

async function buildPlanDaysFromRoutine(routineId, diasCount, coachUser) {
  const routine = await routineService.getRoutine(routineId, { allowAnyVersion: true });
  if (!routine) {
    const err = new Error('Plantilla no encontrada');
    err.status = 404;
    throw err;
  }
  if (!canReadRoutine(coachUser, routine)) {
    const err = new Error('Sin permiso sobre esta plantilla');
    err.status = 403;
    throw err;
  }

  const coachAi = require('./coachAiTrainingService');
  const structured = coachAi.buildPlanDaysFromStructuredRoutine(
    routine,
    diasCount,
    coachUser,
    galleryUrlForExercise,
  );
  if (structured) return structured;

  const days = Math.min(6, Math.max(2, Number(diasCount) || 4));
  const allExercises = (routine.blocks || []).flatMap((b) =>
    (b.exercises || []).filter((e) => e.nombre).map((e) => ({
      ...e,
      blockName: b.nombre || b.tipo,
    })),
  );
  if (!allExercises.length) {
    const err = new Error('La plantilla no tiene ejercicios');
    err.status = 400;
    throw err;
  }
  const perDay = Math.max(1, Math.ceil(allExercises.length / days));
  const dias = [];
  for (let d = 0; d < days; d += 1) {
    const chunk = allExercises.slice(d * perDay, (d + 1) * perDay);
    if (!chunk.length) break;
    dias.push({
      dia: d + 1,
      nombre: `${routine.nombre} — Día ${d + 1}`,
      completado: false,
      ejercicios: chunk.map((ex) => ({
        exercise_name: ex.nombre,
        sets: Number.parseInt(ex.series, 10) || 3,
        reps: ex.repeticiones || '10',
        rest_seconds: 75,
        intensity_type: 'RPE/RIR',
        intensity_value: 7,
        tempo: ex.tempo || '2-1-2-0',
        youtube_url: ex.video_url || galleryUrlForExercise(ex.nombre, coachUser),
        notes: ex.observaciones || '',
      })),
    });
  }
  return {
    routine,
    dias,
    split_type: `${days} días / semana`,
    method: routine.objetivo || 'Plan coach',
    level: routine.nivel || 'intermedio',
  };
}

function clientInsights(actor, userId) {
  const tid = getCoachTrainerId(actor);
  const client = userDB.getById(Number(userId));
  if (!client || Number(client.trainer_id) !== Number(tid)) {
    const err = new Error('Usuario no pertenece a tu lista');
    err.status = 403;
    throw err;
  }
  const logs = TrainingLogStore.getByUserId(userId);
  const measurements = BodyMeasurementStore.getByUserId(userId);
  const latestMeasurement = measurements[0] || null;
  const plan = TrainingPlansStore.getActiveByUserId(userId);
  const summary = TrainingLogStore.getSummary(userId);
  const daysSinceLast = summary.lastSession
    ? Math.floor((Date.now() - new Date(summary.lastSession.fecha).getTime()) / 86400000)
    : null;

  const stats7d = sessionWindowStats(logs, 7);
  const stats14d = sessionWindowStats(logs, 14);
  const stats30d = sessionWindowStats(logs, 30);
  const streak = streakFromLogs(logs);
  const volume_chart = volumeByWeek(logs, 10);
  const prs = prsFromLogs(logs);
  const improvements = improvementsFromLogs(logs, 28);
  const heatmap = coachHeatmapFromLogs(logs, 35);
  const weightSeries = measurements
    .filter((m) => m.weight_kg != null)
    .slice(0, 8)
    .reverse()
    .map((m) => ({ fecha: m.recorded_at, weight_kg: m.weight_kg }));
  const weight_delta_4w = weightSeries.length >= 2
    ? Math.round((weightSeries[weightSeries.length - 1].weight_kg - weightSeries[0].weight_kg) * 10) / 10
    : null;

  return {
    user: {
      id: client.id,
      nombre: client.nombre,
      email: client.email,
      peso: client.peso,
      altura: client.altura,
      objetivo: client.objetivo,
      telefono: client.telefono,
    },
    plan: plan ? { id: plan.id, method: plan.method, level: plan.level, dias_count: plan.dias?.length || 0 } : null,
    summary,
    days_since_last_session: daysSinceLast,
    coach_kpis: {
      window_7d: stats7d,
      window_14d: stats14d,
      window_30d: stats30d,
      streak,
      weight_delta_4w,
    },
    alerts: coachAlerts({
      stats7d,
      daysSinceLast,
      wellness: wellnessSummary(logs),
      plan,
      measurements,
    }),
    progression: progressionFromLogs(logs),
    wellness: wellnessSummary(logs),
    prs,
    volume_chart,
    improvements,
    heatmap,
    recent_logs: logs.slice(0, 10),
    measurements,
    latest_measurement: latestMeasurement,
    measurement_chart: measurements.slice(0, 24).reverse().map((m) => ({
      fecha: m.recorded_at,
      weight_kg: m.weight_kg,
      chest_cm: m.chest_cm,
      waist_cm: m.abdomen_navel_cm,
    })),
  };
}

async function listClientsWithStats(actor) {
  await ensureNotificationsLoaded();
  const clients = coachClients(actor);
  const tid = getCoachTrainerId(actor);
  const unreadByUser = {};
  if (tid != null) {
    const unreadList = await listNotifications(tid, { unreadOnly: true });
    for (const n of unreadList) {
      const uid = Number(n.user_id);
      unreadByUser[uid] = (unreadByUser[uid] || 0) + 1;
    }
  }
  return clients.map((u) => {
    const summary = TrainingLogStore.getSummary(u.id);
    const plan = TrainingPlansStore.getActiveByUserId(u.id);
    const unread = unreadByUser[Number(u.id)] || 0;
    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      peso: u.peso,
      altura: u.altura,
      objetivo: u.objetivo,
      has_plan: Boolean(plan),
      adherence: summary.totalSessions
        ? Math.round((summary.completedSessions / summary.totalSessions) * 100)
        : 0,
      total_sessions: summary.totalSessions,
      last_session: summary.lastSession,
      unread_notifications: unread,
    };
  });
}

function notifyCoachOnAthleteLog(athleteUser, log) {
  const tid = athleteUser?.trainer_id;
  if (!tid) return;
  const coachRow = userDB.getAll().find((u) => {
    const tidCoach = getCoachTrainerId(u);
    return tidCoach != null && Number(tidCoach) === Number(tid);
  });
  if (!coachRow) return;
  void pushNotification({
    trainer_id: tid,
    user_id: athleteUser.id,
    type: log.completado ? 'session_completed' : 'session_logged',
    title: log.completado ? 'Sesión completada' : 'Nuevo registro de entreno',
    body: `${athleteUser.nombre} registró el día ${log.dia} (${log.fecha})`,
    meta: { log_id: log.id, completado: log.completado },
  });
}

module.exports = {
  coachClients,
  listClientsWithStats,
  clientInsights,
  buildPlanDaysFromRoutine,
  listNotifications,
  markNotificationsRead,
  pushNotification,
  notifyCoachOnAthleteLog,
  progressionFromLogs,
  hydrateCoachNotifications,
};
