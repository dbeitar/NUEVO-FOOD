#!/usr/bin/env node
/**
 * @deprecated Usa: npm run seed:dev
 * Mantiene compatibilidad con el script anterior.
 */
require('child_process').execFileSync(
  process.execPath,
  [require('path').join(__dirname, 'seed_dev_users.cjs'), ...process.argv.slice(2)],
  { stdio: 'inherit' },
);
