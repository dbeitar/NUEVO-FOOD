const routineRepo = require('../db/repositories/d28dRoutineRepository');
const { useRelationalStorage } = require('./storageMode');

async function buildRoutineLinkFields(body = {}, existing = null) {
  const routineId = body.d28d_routine_id ?? existing?.d28d_routine_id;
  if (!routineId || !useRelationalStorage()) return {};
  const routine = await routineRepo.getRoutineById(routineId);
  if (!routine) return {};
  const snapshot = {
    id: routine.id,
    root_id: routine.root_id,
    nombre: routine.nombre,
    categoria: routine.categoria,
    subcategoria: routine.subcategoria,
    nivel: routine.nivel,
    version: routine.version,
    blocks: routine.blocks,
  };
  const patch = {
    d28d_routine_id: routine.id,
    d28d_routine_version: routine.version,
    d28d_routine_snapshot: snapshot,
  };
  if (!body.title && !existing?.title) patch.title = routine.nombre;
  if (body.description === undefined && !existing?.description && routine.descripcion) {
    patch.description = routine.descripcion;
  }
  return patch;
}

async function enrichClassWithRoutine(classItem) {
  if (!classItem) return classItem;
  let routine = classItem.d28d_routine_snapshot || null;
  if (!routine && classItem.d28d_routine_id && useRelationalStorage()) {
    try {
      routine = await routineRepo.getRoutineById(classItem.d28d_routine_id, { allowAnyVersion: true });
    } catch (_) {
      routine = null;
    }
  }
  return {
    ...classItem,
    d28d_routine: routine,
  };
}

async function enrichMany(classes) {
  return Promise.all((classes || []).map(enrichClassWithRoutine));
}

module.exports = {
  buildRoutineLinkFields,
  enrichClassWithRoutine,
  enrichMany,
};
