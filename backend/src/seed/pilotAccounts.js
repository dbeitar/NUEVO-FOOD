/**
 * Cuentas piloto para desarrollo y demos.
 * Una sola contraseña (CORE_PASSWORD) para todas salvo el bucket "demo".
 */
const PILOT_ACCOUNTS = [
  { email: 'admin@foodplan.local', nombre: 'Super Admin', rol: 'super_admin', bucket: 'core' },
  { email: 'admin.d28d@foodplan.local', nombre: 'Admin D28D', rol: 'admin_d28d', bucket: 'core' },
  { email: 'admin.food@foodplan.local', nombre: 'Admin Plan Alim.', rol: 'admin_food_plan', bucket: 'core' },
  { email: 'admin.entrenador@foodplan.local', nombre: 'Admin Entrenadores', rol: 'admin_training', bucket: 'core' },
  { email: 'gym.demo@foodplan.local', nombre: 'Admin Gym Demo', rol: 'admin_gimnasio', bucket: 'core' },
  { email: 'coach.demo@foodplan.local', nombre: 'Coach Demo', rol: 'entrenador', bucket: 'core' },
  { email: 'usuario.demo@foodplan.local', nombre: 'Usuario Demo', rol: 'usuario_final', bucket: 'core' },
  { email: 'demo+20260302@foodplan.local', nombre: 'Demo Público', rol: 'usuario_final', bucket: 'demo' },
];

const DEV_PASSWORD_DEFAULT = 'Demo!2026';

function moduleAccessForRole(rol) {
  switch (rol) {
    case 'super_admin':
      return { d28d: true, live_classes: true, food_plan: true, nutrition: true, training: true, gym: true };
    case 'admin_d28d':
      return { d28d: true, live_classes: true, d28d_program: 'virtual_d28d' };
    case 'admin_food_plan':
      return { food_plan: true, nutrition: true };
    case 'admin_training':
      return { training: true, nutrition: true };
    case 'admin_gimnasio':
      return { gym: true, d28d: true, live_classes: true };
    case 'entrenador':
      return { training: true, nutrition: true };
    default:
      return { d28d: true, live_classes: true, d28d_program: 'virtual_d28d' };
  }
}

module.exports = { PILOT_ACCOUNTS, DEV_PASSWORD_DEFAULT, moduleAccessForRole };
