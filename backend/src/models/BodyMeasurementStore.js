const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const domainRepo = require('../db/repositories/domainDocumentRepository');

const store = new JsonStore('body_measurements.json', []);
let rows = [];
let nextId = 1;

const FIELD_KEYS = [
  'weight_kg',
  'chest_cm',
  'shoulders_cm',
  'right_bicep_cm',
  'left_bicep_cm',
  'abdomen_above_cm',
  'abdomen_navel_cm',
  'abdomen_below_cm',
  'glute_cm',
  'right_thigh_cm',
  'left_thigh_cm',
  'right_calf_cm',
  'left_calf_cm',
];

function persistRows() {
  if (useRelationalStorage()) {
    domainRepo.setArray('body_measurements', rows).catch((e) => {
      console.error('[BodyMeasurementStore] persist:', e.message);
    });
  } else {
    store.setAll(rows);
  }
}

function recomputeNextId() {
  nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
}

if (!useRelationalStorage()) {
  rows = store.getAll() || [];
  recomputeNextId();
}

async function hydrate() {
  if (!useRelationalStorage()) return;
  rows = await domainRepo.getArray('body_measurements');
  if (!Array.isArray(rows)) rows = [];
  if (!rows.length) {
    const disk = store.getAll();
    if (Array.isArray(disk) && disk.length) {
      rows = disk;
      await domainRepo.setArray('body_measurements', rows);
    }
  }
  recomputeNextId();
}

function pickNumericFields(payload = {}) {
  const out = {};
  for (const key of FIELD_KEYS) {
    if (payload[key] == null || payload[key] === '') continue;
    const n = Number(payload[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

const BodyMeasurementStore = {
  FIELD_KEYS,

  getAll() {
    return [...rows];
  },

  getByUserId(userId) {
    return rows
      .filter((r) => Number(r.user_id) === Number(userId))
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
  },

  getById(id) {
    return rows.find((r) => r.id === Number(id)) || null;
  },

  create({ user_id, recorded_at = null, notes = '', ...measures }) {
    const entry = {
      id: nextId++,
      user_id: Number(user_id),
      recorded_at: recorded_at || new Date().toISOString().split('T')[0],
      notes: String(notes || '').trim(),
      ...pickNumericFields(measures),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    rows.push(entry);
    persistRows();
    return entry;
  },

  update(id, patch = {}) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    const entry = { ...rows[idx], ...pickNumericFields(patch) };
    if (patch.recorded_at !== undefined) entry.recorded_at = patch.recorded_at;
    if (patch.notes !== undefined) entry.notes = String(patch.notes || '').trim();
    entry.updated_at = new Date().toISOString();
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

  latestForUser(userId) {
    const list = this.getByUserId(userId);
    return list[0] || null;
  },

  hydrate,
};

module.exports = BodyMeasurementStore;
