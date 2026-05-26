const fs = require('fs');
const path = require('path');
const routineRepo = require('../db/repositories/d28dRoutineRepository');
const {
  BLOCK_TYPES,
  DEFAULT_CATEGORIES,
  BLOCK_TYPE_LABELS,
  NIVEL_OPTIONS,
  OBJETIVO_OPTIONS,
  EQUIPMENT_OPTIONS,
  VARIANT_LEVELS,
} = require('../constants/d28dRoutineTypes');
const { normalizeRoutineInput, BLOCK_CONFIG_DEFAULTS } = require('../shared/routineTemplateModel');
const { useRelationalStorage } = require('../utils/storageMode');

function assertRelational() {
  if (!useRelationalStorage()) {
    const err = new Error('Maestro de Rutinas requiere PostgreSQL (USE_RELATIONAL_STORAGE).');
    err.status = 503;
    throw err;
  }
}

async function listForSchedule() {
  assertRelational();
  return routineRepo.listRoutines({ estado: 'activa', currentOnly: true });
}

async function getDetail(id, opts) {
  assertRelational();
  return routineRepo.getRoutineById(id, opts);
}

async function importFromFile(filePath, createdBy) {
  assertRelational();
  const abs = filePath
    ? (path.isAbsolute(filePath) ? filePath : path.resolve(filePath))
    : path.join(__dirname, '../../data/d28d_routines_import.json');
  if (!fs.existsSync(abs)) {
    const err = new Error('Archivo de importación no encontrado.');
    err.status = 404;
    throw err;
  }
  const payload = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const routines = Array.isArray(payload.routines) ? payload.routines : payload;
  const results = { created: 0, skipped: 0, errors: [] };

  const existing = await routineRepo.listRoutines({ currentOnly: true });
  const byName = new Set(existing.map((r) => `${r.categoria}::${r.nombre}`.toLowerCase()));

  for (const item of routines) {
    const key = `${item.categoria}::${item.nombre}`.toLowerCase();
    if (byName.has(key)) {
      results.skipped += 1;
      continue;
    }
    try {
      if (!BLOCK_TYPES.includes(item.blocks?.[0]?.tipo) && item.blocks?.length) {
        item.blocks = item.blocks.map((b, i) => ({
          ...b,
          tipo: BLOCK_TYPES.includes(b.tipo) ? b.tipo : 'BLOQUE_LIBRE',
          orden: b.orden ?? i,
        }));
      }
      await routineRepo.createRoutine(item, createdBy);
      byName.add(key);
      results.created += 1;
    } catch (e) {
      results.errors.push({ nombre: item.nombre, error: e.message });
    }
  }
  return results;
}

module.exports = {
  assertRelational,
  listCategories: () => {
    assertRelational();
    return routineRepo.listCategories();
  },
  upsertCategory: (body) => {
    assertRelational();
    return routineRepo.upsertCategory(body);
  },
  listRoutines: (query, listFilter = {}) => {
    assertRelational();
    return routineRepo.listRoutines({
      estado: query.estado,
      categoria: query.categoria,
      currentOnly: query.all_versions !== 'true',
      scopes: listFilter.scopes,
      coachTrainerId: listFilter.coachTrainerId,
    });
  },
  getRoutine: (id, opts) => getDetail(id, opts),
  getHistory: (rootId) => {
    assertRelational();
    return routineRepo.getVersionHistory(rootId);
  },
  createRoutine: (body, userId, trainerId = null) => {
    assertRelational();
    return routineRepo.createRoutine(normalizeRoutineInput(body), userId, trainerId);
  },
  updateRoutine: (id, body, { newVersion = false, userId } = {}) => {
    assertRelational();
    const {
      new_version: _nv,
      id: _id,
      root_id: _rootId,
      version: _version,
      is_current: _isCurrent,
      created_at: _createdAt,
      updated_at: _updatedAt,
      trainer_id: _trainerId,
      created_by: _createdBy,
      history: _history,
      ...clean
    } = body || {};
    const normalized = normalizeRoutineInput(clean, { partial: true });
    if (newVersion) {
      const full = normalizeRoutineInput(clean);
      return routineRepo.cloneRoutine(id, { versionBump: true, createdBy: userId, overrides: full });
    }
    return routineRepo.updateRoutineInPlace(id, clean);
  },
  duplicateRoutine: (id, userId, overrides = {}) => {
    assertRelational();
    return routineRepo.cloneRoutine(id, { versionBump: false, createdBy: userId, overrides });
  },
  archiveRoutine: (id) => {
    assertRelational();
    return routineRepo.archiveRoutine(id);
  },
  addHostNote: (body) => {
    assertRelational();
    return routineRepo.addHostNote(body);
  },
  listHostNotes: (query) => {
    assertRelational();
    return routineRepo.listHostNotes(query);
  },
  listForSchedule,
  importBundled: (userId) => importFromFile(null, userId),
  importFromFile,
  meta: () => ({
    block_types: BLOCK_TYPES,
    block_type_labels: BLOCK_TYPE_LABELS,
    block_config_defaults: BLOCK_CONFIG_DEFAULTS,
    default_categories: DEFAULT_CATEGORIES,
    nivel_options: NIVEL_OPTIONS,
    objetivo_options: OBJETIVO_OPTIONS,
    equipment_options: EQUIPMENT_OPTIONS,
    variant_levels: VARIANT_LEVELS,
  }),
};
