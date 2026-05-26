/**
 * Arranque: inicializa PostgreSQL (si USE_PG_STORAGE) antes de cargar modelos.
 */
require('dotenv').config();

(async () => {
  const { initStorage } = require('./src/bootstrap/initStorage');
  await initStorage();
  const { syncPilotAccounts } = require('./src/seed/syncPilotAccounts');
  await syncPilotAccounts();
  require('./serverApp');
})().catch((err) => {
  console.error('[boot] Error al iniciar:', err && err.stack ? err.stack : (err.message || err));
  process.exit(1);
});
