const { getPrisma } = require('../../lib/prisma');
const { normalizeRoutineInput } = require('../../shared/routineTemplateModel');

function mapExercise(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    orden: row.orden,
    series: row.series,
    repeticiones: row.repeticiones,
    duracion: row.duracion,
    descanso: row.descanso,
    tempo: row.tempo,
    intensidad: row.intensidad,
    observaciones: row.observaciones,
    variantes: row.variantes && typeof row.variantes === 'object' ? row.variantes : {},
    video_url: row.videoUrl,
    imagen_url: row.imagenUrl,
  };
}

function mapBlock(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    orden: row.orden,
    nombre: row.nombre,
    tecnica: row.tecnica,
    duracion: row.duracion,
    descanso: row.descanso,
    observaciones: row.observaciones,
    config: row.config || {},
    exercises: (row.exercises || []).map(mapExercise).sort((a, b) => a.orden - b.orden),
  };
}

function mapRoutine(row) {
  if (!row) return null;
  return {
    id: row.id,
    root_id: row.rootId,
    version: row.version,
    is_current: row.isCurrent,
    nombre: row.nombre,
    categoria: row.categoria,
    subcategoria: row.subcategoria,
    objetivo: row.objetivo,
    nivel: row.nivel,
    duracion: row.duracion,
    descripcion: row.descripcion,
    notas_tecnicas: row.notasTecnicas,
    equipamiento: Array.isArray(row.equipamiento) ? row.equipamiento : [],
    estado: row.estado,
    scope: row.scope,
    trainer_id: row.trainerId,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    blocks: (row.blocks || []).map(mapBlock).sort((a, b) => a.orden - b.orden),
  };
}

const routineInclude = {
  blocks: {
    orderBy: { orden: 'asc' },
    include: { exercises: { orderBy: { orden: 'asc' } } },
  },
};

function routineCoreData(normalized, createdBy) {
  return {
    nombre: normalized.nombre,
    categoria: normalized.categoria,
    subcategoria: normalized.subcategoria,
    objetivo: normalized.objetivo,
    nivel: normalized.nivel,
    duracion: normalized.duracion,
    descripcion: normalized.descripcion,
    notasTecnicas: normalized.notas_tecnicas,
    equipamiento: normalized.equipamiento,
    estado: normalized.estado,
    scope: normalized.scope,
    trainerId: normalized.trainer_id != null ? Number(normalized.trainer_id) : undefined,
    createdBy: createdBy ?? undefined,
  };
}

async function ensureDefaultCategories() {
  const prisma = getPrisma();
  const { DEFAULT_CATEGORIES } = require('../../constants/d28dRoutineTypes');
  let orden = 0;
  for (const nombre of DEFAULT_CATEGORIES) {
    orden += 1;
    await prisma.d28dRoutineCategory.upsert({
      where: { nombre },
      create: { nombre, orden },
      update: { orden, activo: true },
    });
  }
}

async function listCategories({ includeInactive = false } = {}) {
  await ensureDefaultCategories();
  const rows = await getPrisma().d28dRoutineCategory.findMany({
    where: includeInactive ? {} : { activo: true },
    orderBy: { orden: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    orden: r.orden,
    activo: r.activo,
  }));
}

async function upsertCategory({ id, nombre, orden, activo }) {
  if (id) {
    const row = await getPrisma().d28dRoutineCategory.update({
      where: { id: Number(id) },
      data: {
        nombre: String(nombre).trim(),
        orden: Number(orden || 0),
        activo: activo !== false,
      },
    });
    return { id: row.id, nombre: row.nombre, orden: row.orden, activo: row.activo };
  }
  const row = await getPrisma().d28dRoutineCategory.create({
    data: {
      nombre: String(nombre).trim(),
      orden: Number(orden || 0),
      activo: activo !== false,
    },
  });
  return { id: row.id, nombre: row.nombre, orden: row.orden, activo: row.activo };
}

async function listRoutines({
  estado,
  categoria,
  currentOnly = true,
  scopes,
  coachTrainerId,
} = {}) {
  const where = {};
  if (estado) where.estado = estado;
  if (categoria) where.categoria = categoria;
  if (currentOnly) where.isCurrent = true;

  if (coachTrainerId != null) {
    where.scope = { in: ['coach_wl', 'training'] };
    where.trainerId = Number(coachTrainerId);
  } else if (Array.isArray(scopes) && scopes.length) {
    where.scope = { in: scopes };
  }

  const rows = await getPrisma().d28dRoutine.findMany({
    where,
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    include: routineInclude,
  });
  return rows.map(mapRoutine);
}

async function getRoutineById(id, { allowAnyVersion = false } = {}) {
  const row = await getPrisma().d28dRoutine.findUnique({
    where: { id: Number(id) },
    include: routineInclude,
  });
  if (!row) return null;
  if (!allowAnyVersion && !row.isCurrent) return mapRoutine(row);
  return mapRoutine(row);
}

async function getVersionHistory(rootId) {
  const rows = await getPrisma().d28dRoutine.findMany({
    where: { rootId: Number(rootId) },
    orderBy: { version: 'desc' },
    include: routineInclude,
  });
  return rows.map(mapRoutine);
}

async function createBlocks(tx, routineId, blocks = []) {
  const normalized = normalizeRoutineInput({ nombre: '_', categoria: '_', blocks });
  for (let i = 0; i < normalized.blocks.length; i += 1) {
    const b = normalized.blocks[i];
    const block = await tx.d28dRoutineBlock.create({
      data: {
        routineId,
        tipo: b.tipo,
        orden: b.orden,
        nombre: b.nombre,
        tecnica: b.tecnica,
        duracion: b.duracion,
        descanso: b.descanso,
        observaciones: b.observaciones,
        config: b.config,
      },
    });
    for (let j = 0; j < b.exercises.length; j += 1) {
      const ex = b.exercises[j];
      if (!ex.nombre) continue;
      await tx.d28dRoutineExercise.create({
        data: {
          blockId: block.id,
          nombre: ex.nombre,
          orden: ex.orden,
          series: ex.series,
          repeticiones: ex.repeticiones,
          duracion: ex.duracion,
          descanso: ex.descanso,
          tempo: ex.tempo,
          intensidad: ex.intensidad,
          observaciones: ex.observaciones,
          variantes: ex.variantes,
          videoUrl: ex.video_url,
          imagenUrl: ex.imagen_url,
        },
      });
    }
  }
}

async function createRoutine(payload, createdBy, trainerId = null) {
  const normalized = normalizeRoutineInput(payload);
  const prisma = getPrisma();
  const core = routineCoreData(normalized, createdBy);
  if (trainerId != null) core.trainerId = Number(trainerId);
  return prisma.$transaction(async (tx) => {
    const draft = await tx.d28dRoutine.create({
      data: {
        rootId: 0,
        version: 1,
        isCurrent: true,
        ...core,
      },
    });
    const rootId = draft.id;
    await tx.d28dRoutine.update({
      where: { id: draft.id },
      data: { rootId },
    });
    await createBlocks(tx, draft.id, normalized.blocks);
    const full = await tx.d28dRoutine.findUnique({
      where: { id: draft.id },
      include: routineInclude,
    });
    return mapRoutine(full);
  });
}

async function updateRoutineInPlace(id, payload) {
  const has = (key) => Object.prototype.hasOwnProperty.call(payload || {}, key);
  const normalized = normalizeRoutineInput(
    { ...payload, nombre: payload.nombre || ' ', categoria: payload.categoria || ' ' },
    { partial: true },
  );
  const prisma = getPrisma();
  const data = {};
  if (has('nombre')) data.nombre = normalized.nombre || undefined;
  if (has('categoria')) data.categoria = normalized.categoria || undefined;
  if (has('subcategoria')) data.subcategoria = normalized.subcategoria;
  if (has('objetivo')) data.objetivo = normalized.objetivo;
  if (has('nivel')) data.nivel = normalized.nivel;
  if (has('duracion')) data.duracion = normalized.duracion;
  if (has('descripcion')) data.descripcion = normalized.descripcion;
  if (has('notas_tecnicas') || has('notasTecnicas')) data.notasTecnicas = normalized.notas_tecnicas;
  if (has('equipamiento')) data.equipamiento = normalized.equipamiento;
  if (has('estado')) data.estado = normalized.estado;
  if (has('scope')) data.scope = normalized.scope;

  return prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) {
      await tx.d28dRoutine.update({
        where: { id: Number(id) },
        data,
      });
    }
    if (Array.isArray(payload.blocks)) {
      await tx.d28dRoutineBlock.deleteMany({ where: { routineId: Number(id) } });
      await createBlocks(tx, Number(id), normalized.blocks);
    }
    const full = await tx.d28dRoutine.findUnique({
      where: { id: Number(id) },
      include: routineInclude,
    });
    return mapRoutine(full);
  });
}

async function cloneRoutine(sourceId, { versionBump = false, createdBy, overrides = {} } = {}) {
  const source = await getRoutineById(sourceId, { allowAnyVersion: true });
  if (!source) return null;
  const merged = normalizeRoutineInput({
    ...source,
    ...overrides,
    blocks: overrides.blocks || source.blocks,
  });
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    if (versionBump) {
      await tx.d28dRoutine.updateMany({
        where: { rootId: source.root_id },
        data: { isCurrent: false },
      });
    }

    const nextVersion = versionBump
      ? (await tx.d28dRoutine.aggregate({
        where: { rootId: source.root_id },
        _max: { version: true },
      }))._max.version + 1
      : 1;

    const created = await tx.d28dRoutine.create({
      data: {
        rootId: versionBump ? source.root_id : 0,
        version: versionBump ? nextVersion : 1,
        isCurrent: true,
        nombre: merged.nombre + (versionBump ? '' : ' (copia)'),
        categoria: merged.categoria,
        subcategoria: merged.subcategoria,
        objetivo: merged.objetivo,
        nivel: merged.nivel,
        duracion: merged.duracion,
        descripcion: merged.descripcion,
        notasTecnicas: merged.notas_tecnicas,
        equipamiento: merged.equipamiento,
        estado: merged.estado,
        scope: merged.scope,
        trainerId: overrides.trainer_id != null
          ? Number(overrides.trainer_id)
          : (source.trainer_id != null ? Number(source.trainer_id) : undefined),
        createdBy: createdBy || source.created_by,
      },
    });

    const rootId = versionBump ? source.root_id : created.id;
    if (!versionBump) {
      await tx.d28dRoutine.update({ where: { id: created.id }, data: { rootId } });
    }

    await createBlocks(tx, created.id, merged.blocks);

    const full = await tx.d28dRoutine.findUnique({
      where: { id: created.id },
      include: routineInclude,
    });
    return mapRoutine(full);
  });
}

async function archiveRoutine(id) {
  const row = await getPrisma().d28dRoutine.update({
    where: { id: Number(id) },
    data: { estado: 'archivada' },
    include: routineInclude,
  });
  return mapRoutine(row);
}

async function addHostNote({ routineId, liveClassId, userId, texto }) {
  const row = await getPrisma().d28dRoutineHostNote.create({
    data: {
      routineId: Number(routineId),
      liveClassId: liveClassId ? Number(liveClassId) : null,
      userId: Number(userId),
      texto: String(texto).trim(),
    },
  });
  return {
    id: row.id,
    routine_id: row.routineId,
    live_class_id: row.liveClassId,
    user_id: row.userId,
    texto: row.texto,
    created_at: row.createdAt,
  };
}

async function listHostNotes({ routineId, liveClassId } = {}) {
  const where = {};
  if (routineId) where.routineId = Number(routineId);
  if (liveClassId) where.liveClassId = Number(liveClassId);
  const rows = await getPrisma().d28dRoutineHostNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    routine_id: r.routineId,
    live_class_id: r.liveClassId,
    user_id: r.userId,
    texto: r.texto,
    created_at: r.createdAt,
  }));
}

async function listHostNotesForHost({ hostUserId, liveClassIds } = {}) {
  const where = { userId: Number(hostUserId) };
  if (Array.isArray(liveClassIds) && liveClassIds.length > 0) {
    where.liveClassId = { in: liveClassIds.map(Number) };
  }
  const rows = await getPrisma().d28dRoutineHostNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    routine_id: r.routineId,
    live_class_id: r.liveClassId,
    user_id: r.userId,
    texto: r.texto,
    created_at: r.createdAt,
  }));
}

module.exports = {
  mapRoutine,
  ensureDefaultCategories,
  listCategories,
  upsertCategory,
  listRoutines,
  getRoutineById,
  getVersionHistory,
  createRoutine,
  updateRoutineInPlace,
  cloneRoutine,
  archiveRoutine,
  addHostNote,
  listHostNotes,
  listHostNotesForHost,
};
