/**
 * Planes comerciales D28D precargados por programa.
 * Idempotente: upsert por `nombre` en hydrate.
 */

const D28D_MODULE = { d28d: true, live_classes: true, food_plan: false, nutrition: false, training: false };
const D28D_MODULE_BASIC = { d28d: true, live_classes: false, food_plan: false, nutrition: false, training: false };

function plan(base) {
  return {
    activo: true,
    visible: true,
    usuarios_activos: 0,
    max_usuarios: base.max_usuarios ?? 500,
    is_couple: false,
    included_seats: 1,
    cycle_ids: [7],
    kind: 'd28d',
    features: [],
    support_whatsapp: '573192635819',
    support_name: 'Soporte D28D',
    support_activo: true,
    ...base,
  };
}

const VITAL_PLANS = [
  plan({ nombre: 'Vital D28D - Mensual', program_id: 'vital', descripcion: 'Plan mensual Vital D28D', precio_mensual: 119000, precio_mensual_usd: 35, max_usuarios: 1, cycles_count: 1, sort_order: 1, module_access: D28D_MODULE }),
  plan({ nombre: 'Vital D28D - Trimestral', program_id: 'vital', descripcion: 'Plan trimestral Vital D28D', precio_mensual: 285000, precio_mensual_usd: 85, max_usuarios: 1, cycles_count: 3, sort_order: 2, module_access: D28D_MODULE }),
  plan({ nombre: 'Vital D28D - Semestral', program_id: 'vital', descripcion: 'Plan semestral Vital D28D', precio_mensual: 499000, precio_mensual_usd: 147, max_usuarios: 1, cycles_count: 6, sort_order: 3, module_access: D28D_MODULE }),
  plan({ nombre: 'Vital D28D - Anual', program_id: 'vital', descripcion: 'Plan anual Vital D28D', precio_mensual: 869000, precio_mensual_usd: 256, max_usuarios: 1, cycles_count: 13, sort_order: 4, module_access: D28D_MODULE }),
  plan({ nombre: 'Vital D28D - Parejas', program_id: 'vital', descripcion: 'Plan de pareja Vital D28D (2 usuarios)', precio_mensual: 199000, precio_mensual_usd: 57, max_usuarios: 2, included_seats: 2, is_couple: true, cycles_count: 1, sort_order: 5, module_access: D28D_MODULE }),
  plan({ nombre: 'Vital D28D - Posparto', program_id: 'vital', descripcion: 'Plan posparto Vital D28D', precio_mensual: 119000, precio_mensual_usd: 35, max_usuarios: 1, cycles_count: 1, sort_order: 6, module_access: D28D_MODULE }),
];

const PANCITAS_PLANS = [
  plan({ nombre: 'Pancitas Fit - Mensual', program_id: 'pancitas', descripcion: 'Plan mensual Pancitas Fit', precio_mensual: 169000, precio_mensual_usd: 49, max_usuarios: 1, cycles_count: 1, sort_order: 1, module_access: D28D_MODULE }),
  plan({ nombre: 'Pancitas Fit - Trimestral', program_id: 'pancitas', descripcion: 'Plan trimestral Pancitas Fit', precio_mensual: 424000, precio_mensual_usd: 120, max_usuarios: 1, cycles_count: 3, sort_order: 2, module_access: D28D_MODULE }),
];

const VIRTUAL_PLANS = [
  plan({ nombre: 'D28D Virtual - Básico', program_id: 'virtual_d28d', descripcion: 'Acceso a clases grabadas y comunidad', precio_mensual: 99000, precio_mensual_usd: 29, max_usuarios: 1000, cycles_count: 1, sort_order: 1, module_access: D28D_MODULE_BASIC, features: ['Clases grabadas', 'Comunidad Virtual'] }),
  plan({ nombre: 'D28D Virtual - Premium', program_id: 'virtual_d28d', descripcion: 'Acceso completo + clases en vivo', precio_mensual: 199000, precio_mensual_usd: 57, max_usuarios: 500, cycles_count: 1, sort_order: 2, module_access: D28D_MODULE, features: ['Clases en vivo', 'Contenido grabado', 'Chat con coach'] }),
];

const FOOD_TRAINING_PLANS = [
  {
    nombre: 'Plan Alimentación',
    program_id: 'food',
    kind: 'food',
    descripcion: 'Acceso al módulo de plan de alimentación',
    precio_mensual: 79000,
    precio_mensual_usd: 20,
    features: ['Calculadora', 'Recetas', 'Registro diario'],
    max_usuarios: 0,
    usuarios_activos: 0,
    module_access: { food_plan: true, nutrition: true },
    is_couple: false,
    included_seats: 1,
    cycle_ids: [],
    activo: true,
    visible: true,
    sort_order: 0,
  },
  {
    nombre: 'Entrenadores Pro',
    program_id: 'training',
    kind: 'training',
    descripcion: 'Licencia del módulo de entrenamiento para coaches',
    precio_mensual: 89000,
    precio_mensual_usd: 25,
    features: ['Rutinas y galería', 'Seguimiento de atletas', 'Branding de coach'],
    max_usuarios: 5000,
    usuarios_activos: 0,
    module_access: { training: true, nutrition: true, d28d: false, live_classes: false, food_plan: false },
    is_couple: false,
    included_seats: 1,
    cycle_ids: [],
    activo: true,
    visible: true,
    sort_order: 0,
  },
];

const COMMERCIAL_D28D_PLANS = [...VITAL_PLANS, ...PANCITAS_PLANS, ...VIRTUAL_PLANS];
const DEFAULT_COMMERCIAL_PLANS = [...COMMERCIAL_D28D_PLANS, ...FOOD_TRAINING_PLANS];

module.exports = {
  VITAL_PLANS,
  PANCITAS_PLANS,
  VIRTUAL_PLANS,
  COMMERCIAL_D28D_PLANS,
  DEFAULT_COMMERCIAL_PLANS,
};
