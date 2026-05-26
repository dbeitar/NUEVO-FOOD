export const BLOCK_TYPES = [
  'REST_PAUSE', 'TABATA', 'HIIT', 'AMRAP', 'EMOM', 'SUPER_SET', 'BLOQUE_LIBRE',
];

export const BLOCK_LABELS = {
  REST_PAUSE: 'Rest-Pause',
  TABATA: 'Tabata',
  HIIT: 'HIIT',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  SUPER_SET: 'Super Set',
  BLOQUE_LIBRE: 'Bloque libre',
};

export const NIVEL_OPTIONS = ['principiante', 'intermedio', 'avanzado'];

export const OBJETIVO_OPTIONS = [
  'fuerza', 'hipertrofia', 'resistencia', 'movilidad', 'metabolico', 'mantenimiento',
];

export const EQUIPMENT_OPTIONS = [
  { id: 'banda', label: 'Banda' },
  { id: 'mancuerna', label: 'Mancuerna' },
  { id: 'barra', label: 'Barra' },
  { id: 'silla', label: 'Silla' },
  { id: 'peso_corporal', label: 'Peso corporal' },
  { id: 'otros', label: 'Otros' },
];

export const VARIANT_LEVELS = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
];

export const BLOCK_CONFIG_FIELDS = {
  REST_PAUSE: [
    { key: 'rest_pause_seconds', label: 'Pausa (seg)', type: 'number' },
    { key: 'clusters', label: 'Clusters', type: 'number' },
  ],
  TABATA: [
    { key: 'work_seconds', label: 'Trabajo (seg)', type: 'number' },
    { key: 'rest_seconds', label: 'Descanso (seg)', type: 'number' },
    { key: 'rounds', label: 'Rondas', type: 'number' },
  ],
  HIIT: [
    { key: 'intervals', label: 'Intervalos', type: 'number' },
    { key: 'work_seconds', label: 'Trabajo (seg)', type: 'number' },
    { key: 'rest_seconds', label: 'Descanso (seg)', type: 'number' },
  ],
  AMRAP: [{ key: 'duration_minutes', label: 'Duración (min)', type: 'number' }],
  EMOM: [
    { key: 'interval_minutes', label: 'Cada (min)', type: 'number' },
    { key: 'rounds', label: 'Rondas', type: 'number' },
  ],
  SUPER_SET: [{ key: 'rest_between_pairs', label: 'Descanso entre pares (seg)', type: 'number' }],
  BLOQUE_LIBRE: [{ key: 'rounds', label: 'Rondas', type: 'number' }],
};

export function emptyVariantSlice() {
  return { series: '', repeticiones: '', duracion: '', descanso: '', tempo: '', intensidad: '' };
}

export function emptyVariants() {
  return {
    principiante: emptyVariantSlice(),
    intermedio: emptyVariantSlice(),
    avanzado: emptyVariantSlice(),
  };
}

export function emptyExercise(orden = 0) {
  return {
    nombre: '',
    orden,
    series: '',
    repeticiones: '',
    duracion: '',
    descanso: '',
    tempo: '',
    intensidad: '',
    observaciones: '',
    video_url: '',
    imagen_url: '',
    variantes: emptyVariants(),
  };
}

export function emptyBlock(orden = 0) {
  return {
    tipo: 'BLOQUE_LIBRE',
    orden,
    nombre: '',
    tecnica: '',
    duracion: '',
    descanso: '',
    observaciones: '',
    config: { rounds: 1 },
    exercises: [emptyExercise(0)],
  };
}

export function emptyRoutine({ scope = 'd28d_platform' } = {}) {
  return {
    nombre: '',
    categoria: 'Full Body',
    subcategoria: '',
    objetivo: 'mantenimiento',
    nivel: 'intermedio',
    duracion: '45 min',
    descripcion: '',
    notas_tecnicas: '',
    equipamiento: [],
    estado: 'activa',
    scope,
    blocks: [emptyBlock(0)],
  };
}

export function routineFromApi(data) {
  if (!data) return emptyRoutine();
  return {
    nombre: data.nombre || '',
    categoria: data.categoria || 'Full Body',
    subcategoria: data.subcategoria || '',
    objetivo: data.objetivo || 'mantenimiento',
    nivel: data.nivel || 'intermedio',
    duracion: data.duracion || '',
    descripcion: data.descripcion || '',
    notas_tecnicas: data.notas_tecnicas || '',
    equipamiento: Array.isArray(data.equipamiento) ? data.equipamiento : [],
    estado: data.estado || 'activa',
    scope: data.scope || 'd28d_platform',
    blocks: (data.blocks || []).map((b, i) => ({
      ...b,
      orden: b.orden ?? i,
      config: b.config || {},
      exercises: (b.exercises || []).map((ex, j) => ({
        ...ex,
        orden: ex.orden ?? j,
        variantes: ex.variantes && typeof ex.variantes === 'object' ? ex.variantes : emptyVariants(),
      })),
    })),
  };
}
