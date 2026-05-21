#!/usr/bin/env node
/**
 * Reset rápido de contraseñas para las cuentas demo del piloto.
 *
 * Uso:
 *   node scripts/reset_pilot_passwords.cjs            # usa 'Demo!2026'
 *   node scripts/reset_pilot_passwords.cjs 'OtraPwd!' # contraseña custom
 *
 * Para producción (admins + códigos invite + usuarios finales de prueba):
 *   node scripts/seed_production_verify.cjs
 *   Ver docs/manuales/03_PRODUCTO_Y_OPERACION.md
 *
 * No requiere reiniciar el backend (modifica directamente
 * backend/data/users.json). Si la cuenta no existe la crea.
 *
 * No depende de variables de entorno; funciona en piloto local.
 */
const path = require('path');
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
process.chdir(BACKEND_DIR);
const bcrypt = require(path.join(BACKEND_DIR, 'node_modules', 'bcryptjs'));
const userDB = require(path.join(BACKEND_DIR, 'src', 'models', 'UserDatabase'));

const PASSWORD = (process.argv[2] || 'Demo!2026').trim();
if (PASSWORD.length < 6) {
  console.error('Contraseña inválida (mínimo 6 caracteres).');
  process.exit(1);
}

const ACCOUNTS = [
  // Dominio documentado en MANUAL_PLATAFORMA_D28D.md (@d28d.local)
  { email: 'admin@d28d.local',                nombre: 'Super Admin',         rol: 'super_admin' },
  { email: 'd28d.admin@d28d.local',            nombre: 'Admin D28D',          rol: 'admin_d28d' },
  { email: 'food.admin@d28d.local',             nombre: 'Admin Plan Alim.',    rol: 'admin_food' },
  { email: 'coach.admin@d28d.local',            nombre: 'Admin Entrenadores',  rol: 'admin_entrenador' },
  // Alias legacy (@foodplan.local)
  { email: 'admin@foodplan.local',            nombre: 'Super Admin',         rol: 'super_admin' },
  { email: 'admin.d28d@foodplan.local',       nombre: 'Admin D28D',          rol: 'admin_d28d' },
  { email: 'admin.food@foodplan.local',       nombre: 'Admin Plan Alim.',    rol: 'admin_food_plan' },
  { email: 'admin.entrenador@foodplan.local', nombre: 'Admin Entrenadores',  rol: 'admin_training' },
  { email: 'gym.demo@foodplan.local',         nombre: 'Admin Gym Demo',      rol: 'admin_gimnasio' },
  { email: 'coach.demo@foodplan.local',       nombre: 'Coach Demo',          rol: 'entrenador' },
  { email: 'usuario.demo@foodplan.local',     nombre: 'Usuario Demo',        rol: 'usuario_final' },
  { email: 'demo+20260302@foodplan.local',    nombre: 'Demo Público',        rol: 'usuario_final' },
];

(async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  let created = 0;
  let updated = 0;
  for (const acc of ACCOUNTS) {
    const existing = userDB.getByEmail(acc.email);
    if (existing) {
      userDB.update(existing.id, { clave_hash: hash, rol: acc.rol, roles: [acc.rol] });
      updated++;
      console.log(`  OK     ${acc.email.padEnd(34)} (id=${existing.id}, rol=${acc.rol})`);
    } else {
      const created_user = userDB.create({
        nombre: acc.nombre,
        email: acc.email,
        clave_hash: hash,
        rol: acc.rol,
        roles: [acc.rol],
      });
      created++;
      console.log(`  NUEVO  ${acc.email.padEnd(34)} (id=${created_user.id}, rol=${acc.rol})`);
    }
  }
  console.log(`\n${created} creadas, ${updated} actualizadas. Contraseña aplicada: "${PASSWORD}"`);
})();
