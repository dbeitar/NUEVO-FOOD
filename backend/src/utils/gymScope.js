/** Gimnasios marca blanca viven bajo D28D; solo la plataforma crea sedes nuevas. */
const { isPlatformAdmin } = require('./tenantScope');

function canCreateGym(user) {
  return isPlatformAdmin(user);
}

module.exports = { canCreateGym };
