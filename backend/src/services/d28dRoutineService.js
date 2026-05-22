const fs = require('fs');
const path = require('path');
const routineRepo = require('../db/repositories/d28dRoutineRepository');
const { BLOCK_TYPES, DEFAULT_CATEGORIES } = require('../constants/d28dRoutineTypes');
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
  listRoutines: (query) => {
    assertRelational();
    return routineRepo.listRoutines({
      estado: query.estado,
      categoria: query.categoria,
      currentOnly: query.all_versions !== 'true',
    });
  },
  getRoutine: (id, opts) => getDetail(id, opts),
  getHistory: (rootId) => {
    assertRelational();
    return routineRepo.getVersionHistory(rootId);
  },
  createRoutine: (body, userId) => {
    assertRelational();
    return routineRepo.createRoutine(body, userId);
  },
  updateRoutine: (id, body, { newVersion = false, userId } = {}) => {
    assertRelational();
    if (newVersion) {
      return routineRepo.cloneRoutine(id, { versionBump: true, createdBy: userId, overrides: body });
    }
    return routineRepo.updateRoutineInPlace(id, body);
  },
  duplicateRoutine: (id, userId) => {
    assertRelational();
    return routineRepo.cloneRoutine(id, { versionBump: false, createdBy: userId });
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
    default_categories: DEFAULT_CATEGORIES,
  }),
};
