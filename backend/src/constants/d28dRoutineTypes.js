const BLOCK_TYPES = [
  'REST_PAUSE',
  'TABATA',
  'HIIT',
  'AMRAP',
  'EMOM',
  'SUPER_SET',
  'BLOQUE_LIBRE',
];

const BLOCK_TYPE_LABELS = {
  REST_PAUSE: 'Rest-Pause',
  TABATA: 'Tabata',
  HIIT: 'HIIT',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  SUPER_SET: 'Super Set',
  BLOQUE_LIBRE: 'Bloque libre',
};

const DEFAULT_CATEGORIES = [
  'Fuerza Pierna',
  'Fuerza Tren Superior',
  'Abdomen Cardio',
  'Full Body',
  'Fuerza Glúteo',
  'Movilidad',
  'Cardio',
  'Especiales',
];

const ROUTINE_STATES = ['activa', 'archivada'];

const ROUTINE_SCOPES = ['d28d_platform', 'training', 'coach_wl', 'gym_wl'];

module.exports = {
  BLOCK_TYPES,
  BLOCK_TYPE_LABELS,
  DEFAULT_CATEGORIES,
  ROUTINE_STATES,
  ROUTINE_SCOPES,
};
