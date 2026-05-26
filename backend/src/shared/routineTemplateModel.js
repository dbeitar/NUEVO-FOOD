/**
 * Modelo de plantilla de rutina compartido (D28D · Training · WL).
 * Una sola forma de normalizar payloads API ↔ Prisma ↔ snapshots de clase.
 */
const {
  BLOCK_TYPES,
  BLOCK_TYPE_LABELS,
  DEFAULT_CATEGORIES,
  ROUTINE_STATES,
  ROUTINE_SCOPES,
  NIVEL_OPTIONS,
  OBJETIVO_OPTIONS,
  EQUIPMENT_OPTIONS,
  VARIANT_LEVELS,
} = require('../constants/d28dRoutineTypes');

const BLOCK_CONFIG_DEFAULTS = {
  REST_PAUSE: { rest_pause_seconds: 15, clusters: 2 },
  TABATA: { work_seconds: 20, rest_seconds: 10, rounds: 8 },
  HIIT: { intervals: 6, work_seconds: 40, rest_seconds: 20 },
  AMRAP: { duration_minutes: 12 },
  EMOM: { interval_minutes: 1, rounds: 10 },
  SUPER_SET: { rest_between_pairs: 90 },
  BLOQUE_LIBRE: { rounds: 1 },
};

function emptyVariantSlice() {
  return { series: '', repeticiones: '', duracion: '', descanso: '', tempo: '', intensidad: '' };
}

function emptyVariants() {
  return {
    principiante: emptyVariantSlice(),
    intermedio: emptyVariantSlice(),
    avanzado: emptyVariantSlice(),
  };
}

function normalizeEquipment(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((x) => String(x).trim().toLowerCase())
    .filter((x) => EQUIPMENT_OPTIONS.includes(x) || x === 'otros');
}

function normalizeVariants(raw) {
  if (!raw || typeof raw !== 'object') return emptyVariants();
  const out = emptyVariants();
  for (const level of VARIANT_LEVELS) {
    const slice = raw[level];
    if (slice && typeof slice === 'object') {
      out[level] = { ...emptyVariantSlice(), ...slice };
    }
  }
  return out;
}

function normalizeBlockConfig(tipo, config) {
  const base = { ...(BLOCK_CONFIG_DEFAULTS[tipo] || {}) };
  if (!config || typeof config !== 'object') return base;
  return { ...base, ...config };
}

function normalizeExerciseInput(ex = {}, orden = 0) {
  return {
    id: ex.id,
    nombre: String(ex.nombre || '').trim(),
    orden: Number(ex.orden ?? orden),
    series: ex.series != null ? String(ex.series) : null,
    repeticiones: ex.repeticiones != null ? String(ex.repeticiones) : null,
    duracion: ex.duracion != null ? String(ex.duracion) : null,
    descanso: ex.descanso != null ? String(ex.descanso) : null,
    tempo: ex.tempo != null ? String(ex.tempo) : null,
    intensidad: ex.intensidad != null ? String(ex.intensidad) : null,
    observaciones: ex.observaciones ? String(ex.observaciones) : null,
    video_url: ex.video_url || ex.videoUrl || null,
    imagen_url: ex.imagen_url || ex.imagenUrl || null,
    variantes: normalizeVariants(ex.variantes),
  };
}

function normalizeBlockInput(b = {}, orden = 0) {
  const tipo = BLOCK_TYPES.includes(b.tipo) ? b.tipo : 'BLOQUE_LIBRE';
  return {
    id: b.id,
    tipo,
    orden: Number(b.orden ?? orden),
    nombre: b.nombre ? String(b.nombre) : null,
    tecnica: b.tecnica ? String(b.tecnica) : (b.config?.tecnica ? String(b.config.tecnica) : null),
    duracion: b.duracion != null ? String(b.duracion) : (b.config?.duracion != null ? String(b.config.duracion) : null),
    descanso: b.descanso != null ? String(b.descanso) : (b.config?.descanso != null ? String(b.config.descanso) : null),
    observaciones: b.observaciones ? String(b.observaciones) : (b.config?.observaciones ? String(b.config.observaciones) : null),
    config: normalizeBlockConfig(tipo, b.config),
    exercises: (Array.isArray(b.exercises) ? b.exercises : []).map(normalizeExerciseInput),
  };
}

function normalizeRoutineInput(payload = {}, { partial = false } = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(payload, key);

  const out = {
    nombre: String(payload.nombre || '').trim(),
    categoria: String(payload.categoria || '').trim(),
    subcategoria: payload.subcategoria ? String(payload.subcategoria) : null,
    objetivo: payload.objetivo ? String(payload.objetivo) : null,
    nivel: payload.nivel ? String(payload.nivel) : null,
    duracion: payload.duracion ? String(payload.duracion) : null,
    descripcion: payload.descripcion ? String(payload.descripcion) : null,
    notas_tecnicas: payload.notas_tecnicas || payload.notasTecnicas
      ? String(payload.notas_tecnicas || payload.notasTecnicas)
      : null,
    equipamiento: normalizeEquipment(payload.equipamiento),
    blocks: (Array.isArray(payload.blocks) ? payload.blocks : []).map(normalizeBlockInput),
  };

  if (!partial || has('estado')) {
    out.estado = ROUTINE_STATES.includes(payload.estado) ? payload.estado : 'activa';
  }
  if (!partial || has('scope')) {
    const rawScope = payload.scope != null ? String(payload.scope).trim() : '';
    out.scope = ROUTINE_SCOPES.includes(rawScope) ? rawScope : 'd28d_platform';
  }

  return out;
}

/** Migra bloques legacy: campos sueltos en config → columnas explícitas. */
function migrateLegacyBlock(block) {
  if (!block || typeof block !== 'object') return block;
  const config = block.config && typeof block.config === 'object' ? { ...block.config } : {};
  const out = { ...block };
  if (!out.tecnica && config.tecnica) out.tecnica = config.tecnica;
  if (!out.duracion && config.duracion) out.duracion = String(config.duracion);
  if (!out.descanso && config.descanso) out.descanso = String(config.descanso);
  if (!out.observaciones && config.observaciones) out.observaciones = config.observaciones;
  delete config.tecnica;
  delete config.duracion;
  delete config.descanso;
  delete config.observaciones;
  out.config = config;
  return out;
}

function routineSnapshot(routine) {
  if (!routine) return null;
  return {
    id: routine.id,
    root_id: routine.root_id,
    nombre: routine.nombre,
    categoria: routine.categoria,
    subcategoria: routine.subcategoria,
    objetivo: routine.objetivo,
    nivel: routine.nivel,
    duracion: routine.duracion,
    descripcion: routine.descripcion,
    notas_tecnicas: routine.notas_tecnicas,
    equipamiento: routine.equipamiento || [],
    version: routine.version,
    blocks: (routine.blocks || []).map(migrateLegacyBlock),
  };
}

module.exports = {
  BLOCK_TYPES,
  BLOCK_TYPE_LABELS,
  DEFAULT_CATEGORIES,
  ROUTINE_STATES,
  ROUTINE_SCOPES,
  NIVEL_OPTIONS,
  OBJETIVO_OPTIONS,
  EQUIPMENT_OPTIONS,
  VARIANT_LEVELS,
  BLOCK_CONFIG_DEFAULTS,
  emptyVariantSlice,
  emptyVariants,
  normalizeRoutineInput,
  normalizeExerciseInput,
  normalizeBlockInput,
  migrateLegacyBlock,
  routineSnapshot,
};
