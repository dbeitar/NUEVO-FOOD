const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const domainRepo = require('../db/repositories/domainDocumentRepository');

const store = new JsonStore('training_log.json', []);
let rows = [];
let nextId = 1;

function userIdOf(row) {
  const raw = row?.user_id ?? row?.userId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(row) {
  if (!row) return row;
  const uid = userIdOf(row);
  return {
    ...row,
    user_id: uid,
    plan_id: row.plan_id != null ? Number(row.plan_id) : (row.planId != null ? Number(row.planId) : null),
  };
}

function recomputeNextId() {
  nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
}

if (!useRelationalStorage()) {
  rows = (store.getAll() || []).map(normalizeRow);
  recomputeNextId();
}

function persistRows() {
  if (useRelationalStorage()) {
    domainRepo.setArray('training_log', rows).catch((e) => {
      console.error('[TrainingLogStore] persist:', e.message);
    });
  } else {
    store.setAll(rows);
  }
}

async function hydrateFromRelational() {
  if (!useRelationalStorage()) return;
  const fromDb = await domainRepo.getArray('training_log');
  rows = Array.isArray(fromDb) ? fromDb.map(normalizeRow) : [];
  if (!rows.length) {
    const disk = store.getAll();
    if (Array.isArray(disk) && disk.length) {
      rows = disk.map(normalizeRow);
      await domainRepo.setArray('training_log', rows);
    }
  }
  recomputeNextId();
}

const TrainingLogStore = {
  getAll() {
    return [...rows];
  },

  getById(id) {
    return rows.find((r) => r.id === Number(id)) || null;
  },

  getByUserId(userId) {
    const uid = Number(userId);
    return rows
      .filter((r) => userIdOf(r) === uid)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  getByPlanId(planId) {
    return rows
      .filter((r) => r.plan_id === Number(planId))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  },

  getByUserAndDate(userId, fecha) {
    const uid = Number(userId);
    return rows.filter((r) => userIdOf(r) === uid && r.fecha === fecha);
  },

  getSummary(userId) {
    const userLogs = this.getByUserId(userId);
    const totalSessions = userLogs.length;
    const completedSessions = userLogs.filter((l) => l.completado).length;
    const totalMinutes = userLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    const lastSession = userLogs.length > 0 ? userLogs[0] : null;

    const exCount = {};
    for (const log of userLogs) {
      for (const ex of log.ejercicios || []) {
        const name = ex.exercise_name || ex.name || 'Ejercicio';
        exCount[name] = (exCount[name] || 0) + 1;
      }
    }
    const topExercises = Object.entries(exCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalSessions,
      completedSessions,
      totalMinutes,
      lastSession: lastSession ? { fecha: lastSession.fecha, dia: lastSession.dia } : null,
      topExercises,
    };
  },

  create({
    user_id,
    plan_id,
    dia,
    fecha = null,
    ejercicios = [],
    completado = false,
    duration_minutes = 0,
    trainer_notes = '',
    wellness = null,
  }) {
    const entry = normalizeRow({
      id: nextId++,
      user_id: Number(user_id),
      plan_id: plan_id ? Number(plan_id) : null,
      dia: dia || 1,
      fecha: fecha || new Date().toISOString().split('T')[0],
      ejercicios: (ejercicios || []).map((ex) => ({
        exercise_name: ex.exercise_name || ex.name || '',
        sets_done: ex.sets_done ?? 0,
        reps_done: ex.reps_done ?? '',
        weight_kg: ex.weight_kg ?? 0,
        intensity_actual: ex.intensity_actual ?? '',
        notes: ex.notes || '',
      })),
      completado: Boolean(completado),
      duration_minutes: Number(duration_minutes) || 0,
      trainer_notes: trainer_notes || '',
      wellness: wellness || {
        sleep_hours: 7,
        sleep_quality: 7,
        stress_level: 4,
        appetite: 7,
        energy_level: 7,
        soreness: 3,
      },
      created_at: new Date().toISOString(),
    });
    rows.push(entry);
    persistRows();
    return entry;
  },

  update(id, data) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    const entry = rows[idx];
    if (data.ejercicios) entry.ejercicios = data.ejercicios;
    if (data.completado !== undefined) entry.completado = Boolean(data.completado);
    if (data.duration_minutes !== undefined) entry.duration_minutes = Number(data.duration_minutes);
    if (data.trainer_notes !== undefined) entry.trainer_notes = data.trainer_notes;
    if (data.wellness) {
      entry.wellness = { ...entry.wellness, ...data.wellness };
    }
    rows[idx] = entry;
    persistRows();
    return entry;
  },

  delete(id) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    persistRows();
    return true;
  },

  hydrateFromRelational,
};

module.exports = TrainingLogStore;
