#!/usr/bin/env node
/**
 * Restablece TODAS las cuentas piloto con una sola contraseña.
 * Funciona con PostgreSQL (Prisma) o users.json.
 *
 * Uso:
 *   npm run seed:dev
 *   npm run seed:dev -- 'OtraClave123!'
 *   CORE_PASSWORD=Demo!2026 node scripts/seed_dev_users.cjs
 */
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const req = (rel) => require(path.join(BACKEND_DIR, rel));

process.chdir(BACKEND_DIR);
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const customPwd = process.argv[2] ? String(process.argv[2]).trim() : '';
if (customPwd) {
  process.env.CORE_PASSWORD = customPwd;
  process.env.DEMO_PASSWORD = customPwd;
}

(async () => {
  const { useRelationalStorage } = req('src/utils/storageMode');
  if (useRelationalStorage()) {
    const { connectPrisma } = req('src/lib/prisma');
    await connectPrisma();
  } else {
    const userDB = req('src/models/UserDatabase');
    if (userDB.hydrate) await userDB.hydrate();
  }

  const {
    syncPilotAccounts,
    resolvePasswords,
    printPilotCheatSheet,
    DEV_PASSWORD_DEFAULT,
  } = req('src/seed/syncPilotAccounts');

  const result = await syncPilotAccounts({ force: true });
  if (result.skipped) {
    console.error('No se pudo sincronizar:', result.reason);
    console.error(`Usa contraseña >= 8 chars. Ejemplo: npm run seed:dev -- '${DEV_PASSWORD_DEFAULT}'`);
    process.exit(1);
  }

  const { core } = resolvePasswords();
  printPilotCheatSheet(core);
  console.log('Listo. Reinicia sesión en el navegador (o borra token) e ingresa de nuevo.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
