#!/usr/bin/env node
/**
 * Migra module_access → module_licenses (idempotente).
 * Uso: node scripts/migrate_module_access_to_licenses.cjs
 */
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { connectPrisma, disconnectPrisma } = require('../backend/src/lib/prisma');
const userRepo = require('../backend/src/db/repositories/userRepository');
const licenseService = require('../backend/src/services/licenseService');

async function main() {
  await connectPrisma();
  const users = await userRepo.findAllLegacy();
  let n = 0;
  for (const u of users) {
    if (!u.id || !u.activo) continue;
    const access = u.module_access || {};
    if (!Object.keys(access).length) continue;
    await licenseService.syncFromModuleAccess(u.id, access, 'migration');
    n += 1;
  }
  console.log(`Licencias sincronizadas para ${n} usuarios.`);
  await disconnectPrisma();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
