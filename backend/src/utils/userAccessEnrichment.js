const { hydrateAccess } = require('./accessControl');
const licenseService = require('../services/licenseService');

async function enrichUserAccess(user) {
  if (!user) return hydrateAccess({});
  const base = hydrateAccess(user);
  const userId = user.id;
  if (!userId) return { ...base, licenses: [] };
  let module_access = await licenseService.resolveModuleAccess(userId, base.module_access);
  const licenses = await licenseService.listForUser(userId);
  if (!licenses.length && module_access && Object.keys(module_access).length) {
    await licenseService.syncFromModuleAccess(userId, module_access, 'legacy');
    module_access = await licenseService.resolveModuleAccess(userId, module_access);
  }
  return { ...base, module_access, licenses };
}

module.exports = { enrichUserAccess };
