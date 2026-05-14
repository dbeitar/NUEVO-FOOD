// Resuelve qué SERVICIOS ve un usuario en su pantalla de inicio.
//
// Reglas (alineadas con docs/ECOSISTEMA_MODULAR_MARCA_BLANCA.md):
//   - Cada usuario hace UN registro y puede tener uno o varios servicios.
//   - Los servicios disponibles se determinan a partir de:
//       1) `user.module_access` (objeto explícito por módulo si está poblado).
//       2) En su defecto, los roles del usuario.
//       3) Como fallback razonable para usuario final, asumimos al menos el
//          servicio que existe por contrato del gym (food-plan + entrenamiento).
//   - Cada servicio se renderiza con la misma identidad visual (foto + título)
//     pero su acción cambia según el rol: usuario final entra a su experiencia
//     de consumo; admin/coach entra al maestro de ese servicio.

const SERVICE_DEFS = [
  {
    id: 'food-plan',
    title: 'Food Plan',
    desc: 'Tu alimentación guiada por tu equipo.',
    descAdmin: 'Calculadora, alimentos, equivalentes, recetas y registro.',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    alt: 'Plato saludable',
  },
  {
    id: 'training',
    title: 'Entrenamiento',
    desc: 'Tu rutina del día y seguimiento con tu coach.',
    descAdmin: 'Maestro de rutinas, galería y usuarios asignados.',
    img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    alt: 'Entrenamiento personalizado',
  },
  {
    id: 'd28d',
    title: 'D28D',
    desc: 'Programas Vital, Pancitas y Virtual D28D.',
    descAdmin: 'Programas, clases en vivo y galería D28D.',
    img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    alt: 'Sesión de entrenamiento grupal',
  },
  {
    id: 'gym',
    title: 'Mi gimnasio',
    desc: 'Información de tu centro y comunicación con tu equipo.',
    descAdmin: 'Marca blanca: branding, equipo y métricas básicas.',
    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    alt: 'Interior de gimnasio',
  },
];

const ADMINISH = new Set([
  'super_admin', 'admin_marca', 'admin_gimnasio', 'admin_gym',
  'admin_d28d', 'admin_food_plan', 'admin_training',
  'entrenador', 'nutricionista',
]);

export function getRolesArr(user) {
  return Array.isArray(user?.roles) && user.roles.length
    ? user.roles
    : [user?.rol].filter(Boolean);
}

function isAdminish(user) {
  return getRolesArr(user).some((r) => ADMINISH.has(r));
}

// Devuelve los IDs de servicios habilitados para el usuario dado.
// - super_admin: todos.
// - admin_d28d: d28d (+ los demás si están explícitos).
// - admin_food_plan: food-plan.
// - admin_training / entrenador / nutricionista: training (+ food-plan).
// - admin_marca / admin_gimnasio / admin_gym: gym + lo que su gym ofrezca.
// - usuario_final: lo que diga `module_access`. Si está vacío, mostramos
//   food-plan + training como mínimo razonable (no exponemos d28d ni gym).
export function getEnabledServiceIds(user) {
  if (!user) return [];
  const roles = getRolesArr(user);
  const access = user.module_access && typeof user.module_access === 'object'
    ? user.module_access
    : null;

  // 1) Acceso explícito declarado en el usuario.
  if (access && Object.keys(access).length > 0) {
    const mapped = [];
    if (access.food_plan || access['food-plan']) mapped.push('food-plan');
    if (access.training) mapped.push('training');
    if (access.d28d) mapped.push('d28d');
    if (access.gym) mapped.push('gym');
    if (mapped.length > 0) return mapped;
  }

  // 2) Resolución por rol.
  if (roles.includes('super_admin')) return ['food-plan', 'training', 'd28d', 'gym'];

  const ids = new Set();
  if (roles.includes('admin_food_plan')) ids.add('food-plan');
  if (roles.includes('admin_training') || roles.includes('entrenador') || roles.includes('nutricionista')) {
    ids.add('training');
    ids.add('food-plan'); // los coaches casi siempre tocan ambos
  }
  if (roles.includes('admin_d28d')) ids.add('d28d');
  if (roles.includes('admin_marca') || roles.includes('admin_gimnasio') || roles.includes('admin_gym')) {
    ids.add('gym');
    // Un admin de gym normalmente opera entrenamiento y food-plan también:
    ids.add('training');
    ids.add('food-plan');
  }

  if (ids.size > 0) return Array.from(ids);

  // 3) Usuario final sin module_access: mínimo razonable.
  return ['food-plan', 'training'];
}

// Devuelve los servicios habilitados, ya enriquecidos con su definición visual,
// el copy contextual (admin vs usuario final) y la vista destino.
//
// destinationView: a qué vista del Dashboard navegar al hacer click.
// En usuario final navegamos a la experiencia de consumo; en admin/coach
// navegamos al panel del maestro.
export function getServicesFor(user) {
  const ids = new Set(getEnabledServiceIds(user));
  const adminMode = isAdminish(user);

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
    case 'gym': return 'myaccount';
    default: return 'myplan';
  }
}

export function isAdminUser(user) {
  return isAdminish(user);
}
