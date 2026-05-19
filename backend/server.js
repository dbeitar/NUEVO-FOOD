/**
 * Arranque: inicializa PostgreSQL (si USE_PG_STORAGE) antes de cargar modelos.
 */
require('dotenv').config();

(async () => {
  const { initStorage } = require('./src/bootstrap/initStorage');
  await initStorage();
  require('./serverApp');
})().catch((err) => {
  console.error('[boot] Error al iniciar:', err.message || err);
  process.exit(1);
});
