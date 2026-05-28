const bcryptjs = require('bcryptjs');
const { PILOT_ACCOUNTS, DEV_PASSWORD_DEFAULT, moduleAccessForRole } = require('./pilotAccounts');
const { useRelationalStorage } = require('../utils/storageMode');
const { hydrateAccess, normalizeRoles } = require('../utils/accessControl');

function resolvePasswords(options = {}) {
  const isDev = String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
  const core = String(
    options.corePassword
    || process.env.CORE_PASSWORD
    || process.env.DEV_SEED_PASSWORD
    || (isDev ? DEV_PASSWORD_DEFAULT : ''),
  ).trim();
  const demo = String(
    options.demoPassword
    || process.env.DEMO_PASSWORD
    || core,
  ).trim();
  return { core, demo, isDev };
}

function shouldSyncPilotAccounts() {
  const flag = String(process.env.SEED_DEMO || '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  return String(process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
}

async function syncPilotAccounts(options = {}) {
  if (options.force !== true && !shouldSyncPilotAccounts()) {
    return { skipped: true, reason: 'SEED_DEMO deshabilitado' };
  }

  const { core, demo } = resolvePasswords(options);
  if (!core || core.length < 8) {
    console.warn('[syncPilot] Define CORE_PASSWORD (>=8) o ejecuta: npm run seed:dev');
    return { skipped: true, reason: 'sin contraseña' };
  }

  const demoHash = await bcryptjs.hash(demo, 10);
  const coreHash = await bcryptjs.hash(core, 10);
  let created = 0;
  let updated = 0;

  const extraCore = String(process.env.CORE_ACCOUNT_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((e) => !PILOT_ACCOUNTS.some((a) => a.email === e))
    .map((e) => ({ email: e, nombre: e, rol: 'super_admin', bucket: 'core' }));

  const all = [...PILOT_ACCOUNTS, ...extraCore];

  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    for (const acc of all) {
      const hash = acc.bucket === 'demo' ? demoHash : coreHash;
      const roles = normalizeRoles({ rol: acc.rol, roles: [acc.rol] });
      const module_access = moduleAccessForRole(acc.rol);
      const access = hydrateAccess({ rol: acc.rol, roles, module_access });
      const existing = await prisma.user.findUnique({ where: { email: acc.email } });
      await prisma.user.upsert({
        where: { email: acc.email },
        create: {
          nombre: acc.nombre,
          email: acc.email,
          claveHash: hash,
          rol: acc.rol,
          roles,
          permissions: access.permissions,
          moduleAccess: module_access,
          activo: true,
        },
        update: {
          nombre: acc.nombre,
          claveHash: hash,
          rol: acc.rol,
          roles,
          permissions: access.permissions,
          moduleAccess: module_access,
          activo: true,
        },
      });
      if (existing) updated += 1;
      else created += 1;
    }
  } else {
    const userDB = require('../models/UserDatabase');
    if (userDB.hydrate) await userDB.hydrate();
    for (const acc of all) {
      const hash = acc.bucket === 'demo' ? demoHash : coreHash;
      const existing = userDB.getByEmail(acc.email);
      const module_access = moduleAccessForRole(acc.rol);
      if (existing) {
        userDB.update(existing.id, {
          clave_hash: hash,
          rol: acc.rol,
          roles: [acc.rol],
          module_access,
        });
        updated += 1;
      } else {
        await userDB.create({
          nombre: acc.nombre,
          email: acc.email,
          clave_hash: hash,
          rol: acc.rol,
          roles: [acc.rol],
          module_access,
        });
        created += 1;
      }
    }
  }

  const summary = { created, updated, corePassword: core, demoPassword: demo };
  console.log(`[syncPilot] ${created} creadas, ${updated} actualizadas (pass core="${core}"${demo !== core ? `, demo="${demo}"` : ''})`);
  return summary;
}

function printPilotCheatSheet(password) {
  const lines = [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║  MVPFOOD — cuentas piloto (desarrollo)                       ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  Contraseña (casi todas): ${String(password).padEnd(28)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
  ];
  for (const acc of PILOT_ACCOUNTS) {
    const row = `  ${acc.email.padEnd(36)} ${acc.rol}`;
    lines.push(`║${row.padEnd(62)}║`);
  }
  lines.push('╚══════════════════════════════════════════════════════════════╝', '');
  console.log(lines.join('\n'));
}

module.exports = {
  syncPilotAccounts,
  shouldSyncPilotAccounts,
  resolvePasswords,
  printPilotCheatSheet,
  PILOT_ACCOUNTS,
  DEV_PASSWORD_DEFAULT,
};
