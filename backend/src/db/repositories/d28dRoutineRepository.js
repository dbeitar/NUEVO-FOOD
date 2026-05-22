const { getPrisma } = require('../../lib/prisma');

function mapExercise(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    orden: row.orden,
    repeticiones: row.repeticiones,
    duracion: row.duracion,
    descanso: row.descanso,
    observaciones: row.observaciones,
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
    nivel: row.nivel,
    descripcion: row.descripcion,
    estado: row.estado,
    scope: row.scope,
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

async function listRoutines({ estado, categoria, currentOnly = true } = {}) {
  const where = {};
  if (estado) where.estado = estado;
  if (categoria) where.categoria = categoria;
  if (currentOnly) where.isCurrent = true;

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
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const block = await tx.d28dRoutineBlock.create({
      data: {
        routineId,
        tipo: String(b.tipo || 'BLOQUE_LIBRE'),
        orden: Number(b.orden ?? i),
        nombre: b.nombre ? String(b.nombre) : null,
        config: b.config && typeof b.config === 'object' ? b.config : {},
      },
    });
    const exercises = Array.isArray(b.exercises) ? b.exercises : [];
    for (let j = 0; j < exercises.length; j += 1) {
      const ex = exercises[j];
      await tx.d28dRoutineExercise.create({
        data: {
          blockId: block.id,
          nombre: String(ex.nombre || '').trim(),
          orden: Number(ex.orden ?? j),
          repeticiones: ex.repeticiones != null ? String(ex.repeticiones) : null,
          duracion: ex.duracion != null ? String(ex.duracion) : null,
          descanso: ex.descanso != null ? String(ex.descanso) : null,
          observaciones: ex.observaciones ? String(ex.observaciones) : null,
          videoUrl: ex.video_url || ex.videoUrl || null,
          imagenUrl: ex.imagen_url || ex.imagenUrl || null,
        },
      });
    }
  }
}

async function createRoutine(payload, createdBy) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const draft = await tx.d28dRoutine.create({
      data: {
        rootId: 0,
        version: 1,
        isCurrent: true,
        nombre: String(payload.nombre).trim(),
        categoria: String(payload.categoria).trim(),
        subcategoria: payload.subcategoria ? String(payload.subcategoria) : null,
        nivel: payload.nivel ? String(payload.nivel) : null,
        descripcion: payload.descripcion ? String(payload.descripcion) : null,
        estado: payload.estado || 'activa',
        scope: payload.scope || 'd28d_platform',
        createdBy: createdBy || null,
      },
    });
    const rootId = draft.id;
    await tx.d28dRoutine.update({
      where: { id: draft.id },
      data: { rootId },
    });
    await createBlocks(tx, draft.id, payload.blocks || []);
    const full = await tx.d28dRoutine.findUnique({
      where: { id: draft.id },
      include: routineInclude,
    });
    return mapRoutine(full);
  });
}

async function updateRoutineInPlace(id, payload) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    await tx.d28dRoutine.update({
      where: { id: Number(id) },
      data: {
        nombre: payload.nombre != null ? String(payload.nombre).trim() : undefined,
        categoria: payload.categoria != null ? String(payload.categoria).trim() : undefined,
        subcategoria: payload.subcategoria !== undefined ? (payload.subcategoria ? String(payload.subcategoria) : null) : undefined,
        nivel: payload.nivel !== undefined ? (payload.nivel ? String(payload.nivel) : null) : undefined,
        descripcion: payload.descripcion !== undefined ? (payload.descripcion ? String(payload.descripcion) : null) : undefined,
        estado: payload.estado || undefined,
      },
    });
    if (Array.isArray(payload.blocks)) {
      await tx.d28dRoutineBlock.deleteMany({ where: { routineId: Number(id) } });
      await createBlocks(tx, Number(id), payload.blocks);
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
        nombre: overrides.nombre || `${source.nombre}${versionBump ? '' : ' (copia)'}`,
        categoria: overrides.categoria || source.categoria,
        subcategoria: overrides.subcategoria ?? source.subcategoria,
        nivel: overrides.nivel ?? source.nivel,
        descripcion: overrides.descripcion ?? source.descripcion,
        estado: overrides.estado || 'activa',
        scope: overrides.scope || source.scope,
        createdBy: createdBy || source.created_by,
      },
    });

    const rootId = versionBump ? source.root_id : created.id;
    if (!versionBump) {
      await tx.d28dRoutine.update({ where: { id: created.id }, data: { rootId } });
    }

    await createBlocks(tx, created.id, overrides.blocks || source.blocks);

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
};
