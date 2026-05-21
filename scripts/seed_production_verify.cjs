#!/usr/bin/env node
/**
 * Semilla completa para producción / piloto:
 *  1) Códigos invite en gimnasios y entrenadores
 *  2) Cuentas admin piloto (reset contraseña)
 *  3) Usuarios finales de verificación (un perfil por tipo de código)
 *
 * Uso (en el servidor, con volumen en backend/data/):
 *   node scripts/seed_production_verify.cjs
 *   node scripts/seed_production_verify.cjs 'TuPasswordSegura'
 *
 * Tras ejecutar: reiniciar el backend (UserDatabase cachea en RAM).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const MANIFEST_PATH = path.join(__dirname, 'seeds', 'production-verify.manifest.json');

process.chdir(BACKEND);
require('dotenv').config();
process.env.USE_RELATIONAL_STORAGE = 'true';

const bcrypt = require(path.join(BACKEND, 'node_modules', 'bcryptjs'));
const userRepo = require(path.join(BACKEND, 'src/db/repositories/userRepository'));
const { resolveInviteCodeAsync } = require(path.join(BACKEND, 'src/utils/inviteResolver'));
const { connectPrisma, getPrisma } = require(path.join(BACKEND, 'src/lib/prisma'));

let password = 'Demo!2026';

function loadManifest() {
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  return JSON.parse(raw);
}

async function seedInviteCodes(manifest) {
  const prisma = getPrisma();
  let gyms = 0;
  let trainers = 0;
  for (const spec of manifest.gym_invite_codes) {
    await prisma.gym.updateMany({
      where: { id: spec.gym_id },
      data: { inviteCode: spec.invite_code },
    });
    gyms++;
  }
  for (const spec of manifest.trainer_invite_codes) {
    await prisma.trainer.updateMany({
      where: { id: spec.trainer_id },
      data: { inviteCode: spec.invite_code },
    });
    trainers++;
  }
  return { gyms, trainers };
}

async function upsertUser({ email, nombre, rol, roles, gym_id, trainer_id, module_access }) {
  const hash = await bcrypt.hash(password, 10);
  const existing = await userRepo.findByEmail(email);
  const legacy = {
    nombre,
    email,
    clave_hash: hash,
    rol: rol || 'usuario_final',
    roles: roles || [rol || 'usuario_final'],
    gym_id: gym_id ?? null,
    trainer_id: trainer_id ?? null,
    gymId: gym_id ?? null,
    module_access: module_access || {},
    genero: 'masculino',
    objetivo: 'mantenimiento',
    activo: true,
  };
  const row = await userRepo.upsertLegacy(legacy);
  return { action: existing ? 'updated' : 'created', id: row.id, email };
}

async function seedEndUser(spec) {
  const resolved = await resolveInviteCodeAsync(spec.invite_code);
  if (!resolved.ok) {
    throw new Error(`Código inválido para ${spec.email}: ${spec.invite_code} — ${resolved.error}`);
  }
  const data = resolved.data;
  return upsertUser({
    email: spec.email,
    nombre: spec.nombre,
    rol: 'usuario_final',
    roles: ['usuario_final'],
    gym_id: data.gym_id,
    trainer_id: data.trainer_id,
    module_access: data.module_access,
  });
}

async function main() {
  await connectPrisma();
  const manifest = loadManifest();
  const argPwd = (process.argv[2] || '').trim();
  password = argPwd || manifest.default_password || 'Demo!2026';
  if (password.length < 6) {
    console.error('Contraseña inválida (mínimo 6 caracteres).');
    process.exit(1);
  }
  const pwd = password;

  console.log('=== Semilla verificación producción ===\n');
  console.log(`Manifiesto: ${MANIFEST_PATH}`);
  console.log(`Contraseña: ${pwd}\n`);

  const { gyms, trainers } = await seedInviteCodes(manifest);
  console.log(`Códigos invite: ${gyms} gimnasios, ${trainers} entrenadores`);
  console.log(`Códigos D28D (env D28D_INVITE_CODE): ${manifest.d28d_invite_codes.join(', ')}\n`);

  const licenseService = require(path.join(BACKEND, 'src/services/licenseService'));
  const prisma = getPrisma();
  for (const [i, mod] of ['food', 'training', 'd28d', 'gym'].entries()) {
    await prisma.paymentLink.upsert({
      where: { moduleCode: mod },
      create: { moduleCode: mod, label: `Pago ${mod}`, paymentUrl: '', active: false, sortOrder: i + 1 },
      update: {},
    });
  }

  console.log('--- Administradores piloto ---');
  for (const acc of manifest.admin_accounts) {
    const r = await upsertUser({
      email: acc.email,
      nombre: acc.nombre,
      rol: acc.rol,
      roles: acc.roles || [acc.rol],
      module_access: acc.module_access || {},
    });
    await licenseService.syncFromModuleAccess(r.id, acc.module_access || {}, 'seed');
    console.log(`  ${r.action.toUpperCase().padEnd(7)} ${acc.email} (id=${r.id}, ${acc.rol})`);
  }

  console.log('\n--- Usuarios finales de verificación ---');
  for (const spec of manifest.end_users_verification) {
    const r = await seedEndUser(spec);
    await licenseService.applyInviteModules(r.id, (await resolveInviteCodeAsync(spec.invite_code)).data.module_access, 'invite');
    const resolved = await resolveInviteCodeAsync(spec.invite_code);
    const mods = Object.entries(resolved.data.module_access)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');
    console.log(`  ${r.action.toUpperCase().padEnd(7)} ${spec.email}`);
    console.log(`           código: ${spec.invite_code} → módulos: ${mods}`);
    console.log(`           ${spec.dashboard_note}`);
  }

  console.log('\n--- Smoke API (local) ---');
  for (const code of ['D28D-PILOTO', 'GYM-D28D-004', 'COACH-CARLOS-001']) {
    const r = await resolveInviteCodeAsync(code);
    console.log(`  ${code}: ${r.ok ? r.data.type + ' — ' + r.data.label : 'ERROR ' + r.error}`);
  }

  console.log('\n✓ Listo. Reinicia el backend y prueba login con las cuentas del manifiesto.');
  console.log('  Documentación: docs/manuales/03_PRODUCTO_Y_OPERACION.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
