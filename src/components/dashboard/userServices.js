// Resuelve qué SERVICIOS ve un usuario en su pantalla de inicio.
//
// Reglas (alineadas con docs/ECOSISTEMA_MODULAR_MARCA_BLANCA.md):
//   - Cada usuario hace UN registro y puede tener uno o varios servicios.
//   - Los servicios disponibles se determinan a partir de:
//       1) `user.module_access` (objeto explícito por módulo si está poblado).
//       2) En su defecto, los roles del usuario.
//   - Solo `super_admin` ve TODOS los servicios.
//   - Cada `admin_*` específico solo ve el servicio que administra.
//   - Cada servicio se renderiza con la misma identidad visual (foto + título)
//     pero su acción cambia según el rol: usuario final entra a su experiencia
//     de consumo; admin/coach entra al maestro de ese servicio.
//
// Orden visual fijo: D28D → Plan de Alimentación → Entrenadores → Clases en Vivo
//
// IMPORTANTE: los GIMNASIOS NO son un servicio independiente. Viven bajo
// D28D porque consumen el contenido D28D y agendan sobre las plantillas de
// clases en vivo de D28D. Por eso "Mi Gimnasio" / "Marca Blanca" aparece
// como tarjeta DENTRO del panel D28D (D28DAdminView), no como card del Hero.

const SERVICE_DEFS = [
  {
    id: 'd28d',
    title: 'D28D',
    desc: 'Programas Vital, Pancitas y Virtual D28D + tu gimnasio.',
    descAdmin: 'Programas, gimnasios marca blanca, clases en vivo y galería.',
    img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    alt: 'Sesión de entrenamiento grupal',
  },
  {
    id: 'food-plan',
    title: 'Plan de Alimentación',
    desc: 'Tu alimentación guiada por tu equipo.',
    descAdmin: 'Calculadora, alimentos, equivalentes, recetas y registro.',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    alt: 'Plato saludable',
  },
  {
    id: 'training',
    title: 'Entrenadores',
    desc: 'Tu rutina del día y seguimiento con tu coach.',
    descAdmin: 'Rutinas, galería y usuarios asignados.',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    alt: 'Entrenamiento personalizado',
  },
  {
    id: 'live-classes',
    title: 'Clases en Vivo',
    desc: 'Agenda de clases en vivo y links de reunión.',
    descAdmin: 'Plantillas de clases, links de Zoom y asistencia.',
    img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
    alt: 'Clase en vivo de fitness',
  },
];

const ADMIN_ROLES = new Set([
  'super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym',
  'admin_d28d', 'admin_food_plan', 'admin_food',
  'admin_training', 'admin_entrenador',
  'entrenador', 'nutricionista',
]);

export function getRolesArr(user) {
  return Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol].filter(Boolean);
}

function isAdminish(user) {
  return getRolesArr(user).some((r) => ADMIN_ROLES.has(r));
}

// Devuelve los IDs de servicios habilitados para el usuario dado.
//
// REGLA ESTRICTA POR ROL:
//   - super_admin → TODOS los servicios (4).
//   - admin_d28d → solo d28d + live-classes (las clases en vivo viven en D28D).
//   - admin_food / admin_food_plan → solo food-plan.
//   - admin_entrenador / admin_training → solo training.
//   - admin_gym / admin_marca / admin_gimnasio → entran por D28D (su gimnasio
//     consume contenido D28D y agenda en plantillas D28D). Si su gym contrata
//     food-plan o entrenadores, también ven esos.
//   - entrenador (coach individual) → training + food-plan + live-classes (consumo).
//   - nutricionista → food-plan.
//   - usuario_final → lo que diga module_access. Sin él, food-plan + training +
//     live-classes como mínimo razonable.
export function getEnabledServiceIds(user) {
  if (!user) return [];
  const roles = getRolesArr(user);
  const access = user.module_access && typeof user.module_access === 'object'
    ? user.module_access
    : null;

  // 1) super_admin SIEMPRE ve todo (regla pedida explícitamente).
  if (roles.includes('super_admin')) {
    return ['d28d', 'food-plan', 'training', 'live-classes'];
  }

  // 2) Admin específico: solo SU servicio (override estricto sobre module_access).
  if (roles.includes('admin_d28d') && roles.length === 1) {
    return ['d28d', 'live-classes'];
  }
  if ((roles.includes('admin_food') || roles.includes('admin_food_plan')) && roles.length === 1) {
    return ['food-plan'];
  }
  if ((roles.includes('admin_entrenador') || roles.includes('admin_training')) && roles.length === 1) {
    return ['training'];
  }

  // 3) Acceso explícito declarado en el usuario (cuando hay multi-rol mixto
  //    o cuando el gym ha contratado servicios concretos).
  if (access && Object.keys(access).length > 0) {
    const mapped = [];
    if (access.d28d) mapped.push('d28d');
    if (access.food_plan || access['food-plan']) mapped.push('food-plan');
    if (access.training) mapped.push('training');
    if (access.live_classes || access['live-classes']) mapped.push('live-classes');
    if (mapped.length > 0) return mapped;
  }

  // 4) Resolución por combinaciones de rol.
  const ids = new Set();
  if (roles.includes('admin_d28d')) {
    ids.add('d28d');
    ids.add('live-classes');
  }
  if (roles.includes('admin_food') || roles.includes('admin_food_plan')) {
    ids.add('food-plan');
  }
  if (roles.includes('admin_entrenador') || roles.includes('admin_training')) {
    ids.add('training');
  }
  // Gimnasios marca blanca: entran por D28D + sus clases en vivo.
  if (roles.includes('admin_marca') || roles.includes('admin_gimnasio') || roles.includes('admin_gym')) {
    ids.add('d28d');
    ids.add('live-classes');
  }
  if (roles.includes('entrenador')) {
    ids.add('training');
    ids.add('food-plan');
    ids.add('live-classes');
  }
  if (roles.includes('nutricionista')) {
    ids.add('food-plan');
  }
  if (ids.size > 0) return orderServiceIds(Array.from(ids));

  // 5) Usuario final sin module_access ni roles administrativos: experiencia mínima.
  return ['food-plan', 'training', 'live-classes'];
}

function orderServiceIds(ids) {
  const order = ['d28d', 'food-plan', 'training', 'live-classes'];
  return order.filter((id) => ids.includes(id));
}

// Devuelve los servicios habilitados, ya enriquecidos con su definición visual,
// el copy contextual (admin vs usuario final) y la vista destino.
export function getServicesFor(user) {
  const ids = new Set(getEnabledServiceIds(user));
  const adminMode = isAdminish(user);

  // Mantener orden de SERVICE_DEFS (= orden visual fijo pedido).
  return SERVICE_DEFS
    .filter((s) => ids.has(s.id))
    .map((s) => ({
      ...s,
      desc: adminMode ? s.descAdmin : s.desc,
      destinationView: adminMode
        ? `service:${s.id}`
        : userFacingDestinationFor(s.id),
    }));
}

function userFacingDestinationFor(serviceId) {
  switch (serviceId) {
    case 'food-plan': return 'myplan';
    case 'training': return 'training';
    case 'd28d': return 'liveclasses';
    case 'live-classes': return 'liveclasses';
    default: return 'myplan';
  }
}

export function isAdminUser(user) {
  return isAdminish(user);
}
