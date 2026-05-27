/** Rotating pool of seed accounts — read-only load, no registration spam in hot paths */
export const USER_POOL = [
  'final.d28d@d28d.local',
  'usuario.demo@foodplan.local',
  'demo+20260302@foodplan.local',
];

export const ADMIN_POOL = [
  'admin@foodplan.local',
  'admin.d28d@foodplan.local',
];

export const COACH_POOL = [
  'admin.entrenador@foodplan.local',
  'coach.demo@foodplan.local',
];

export function pickUser(vu) {
  return USER_POOL[(vu - 1) % USER_POOL.length];
}

export function pickAdmin(vu) {
  return ADMIN_POOL[(vu - 1) % ADMIN_POOL.length];
}
