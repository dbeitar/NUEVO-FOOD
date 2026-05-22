/**
 * Registro de módulos de plataforma (Fase 3).
 * Shell solo orquesta licencia + navegación; la lógica de negocio vive en cada dominio.
 */
const MODULES = {
  food: {
    code: 'food',
    label: 'Plan de alimentación',
    kind: 'external',
    licenseCodes: ['food'],
    legacyKeys: ['food_plan', 'nutrition'],
  },
  training: {
    code: 'training',
    label: 'Entrenadores',
    kind: 'external',
    licenseCodes: ['training'],
    legacyKeys: ['training'],
  },
  d28d: {
    code: 'd28d',
    label: 'D28D Core',
    kind: 'core',
    licenseCodes: ['d28d', 'live_classes'],
    legacyKeys: ['d28d', 'live_classes'],
  },
  gym: {
    code: 'gym',
    label: 'Gimnasio marca blanca',
    kind: 'core',
    licenseCodes: ['gym'],
    legacyKeys: ['gym'],
    /** Producto visible en dashboard; operación dentro del panel D28D. */
    dashboardServiceId: 'gym',
    panelRoute: 'd28d',
  },
};

const CORE_CODES = new Set(['d28d', 'gym', 'live_classes']);
const EXTERNAL_CODES = new Set(['food', 'training']);

function listModules() {
  return Object.values(MODULES);
}

function getModule(code) {
  return MODULES[code] || null;
}

function isCoreModule(code) {
  return CORE_CODES.has(code);
}

module.exports = {
  MODULES,
  CORE_CODES,
  EXTERNAL_CODES,
  listModules,
  getModule,
  isCoreModule,
};
