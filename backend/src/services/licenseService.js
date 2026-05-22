const path = require('path');
const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');

const MODULE_CODES = ['food', 'training', 'd28d', 'gym', 'live_classes'];

/** Mapeo module_access legacy → códigos de licencia */
const ACCESS_TO_CODE = {
  food_plan: 'food',
  nutrition: 'food',
  training: 'training',
  d28d: 'd28d',
  gym: 'gym',
  live_classes: 'live_classes',
};

const CODE_TO_ACCESS = {
  food: { food_plan: true, nutrition: true },
  training: { training: true },
  d28d: { d28d: true },
  gym: { gym: true },
  live_classes: { live_classes: true },
};

let jsonStore;
function getJsonStore() {
  if (!jsonStore) jsonStore = new JsonStore('module_licenses.json', []);
  return jsonStore;
}

function normalizeModuleAccess(raw = {}) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (v) out[k] = true;
  }
  return out;
}

function moduleAccessFromCodes(codes = []) {
  const access = {};
  for (const code of codes) {
    const part = CODE_TO_ACCESS[code];
    if (part) Object.assign(access, part);
  }
  return access;
}

function codesFromModuleAccess(moduleAccess = {}) {
  const codes = new Set();
  for (const [key, val] of Object.entries(moduleAccess || {})) {
    if (!val) continue;
    const code = ACCESS_TO_CODE[key] || (MODULE_CODES.includes(key) ? key : null);
    if (code) codes.add(code);
  }
  return Array.from(codes);
}

function licensesToList(moduleAccess = {}) {
  const codes = codesFromModuleAccess(moduleAccess);
  return codes.map((moduleCode) => ({
    module_code: moduleCode,
    active: true,
    source: 'module_access',
  }));
}

function isLicenseRowActive(lic) {
  if (!lic || lic.active === false) return false;
  if (lic.valid_until) {
    return new Date(lic.valid_until).getTime() >= Date.now();
  }
  return true;
}

async function listForUser(userId, { includeInactive = false } = {}) {
  const id = Number(userId);
  if (!id) return [];
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const rows = await getPrisma().moduleLicense.findMany({
      where: includeInactive ? { userId: id } : { userId: id, active: true },
      orderBy: { moduleCode: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      module_code: r.moduleCode,
      active: r.active,
      valid_from: r.validFrom,
      valid_until: r.validUntil,
      source: r.source,
      metadata: r.metadata,
    }));
  }
  const all = (getJsonStore().getAll() || []).filter((r) => Number(r.user_id) === id);
  return includeInactive ? all : all.filter((r) => r.active !== false);
}

async function userHasActiveModule(userId, moduleCode) {
  const licenses = await listForUser(userId, { includeInactive: true });
  return licenses.some((l) => l.module_code === moduleCode && isLicenseRowActive(l));
}

async function syncFromModuleAccess(userId, moduleAccess = {}, source = 'sync', licenseMeta = {}) {
  const id = Number(userId);
  if (!id) return [];
  const codes = codesFromModuleAccess(normalizeModuleAccess(moduleAccess));
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    for (const code of MODULE_CODES) {
      const active = codes.includes(code);
      const meta = licenseMeta[code] || {};
      let validUntil = null;
      if (meta.valid_until) {
        const d = new Date(meta.valid_until);
        if (!Number.isNaN(d.getTime())) validUntil = d;
      }
      if (meta.suspended === true) {
        await prisma.moduleLicense.upsert({
          where: { userId_moduleCode: { userId: id, moduleCode: code } },
          create: { userId: id, moduleCode: code, active: false, source, validUntil },
          update: { active: false, source, validUntil, updatedAt: new Date() },
        });
        continue;
      }
      await prisma.moduleLicense.upsert({
        where: { userId_moduleCode: { userId: id, moduleCode: code } },
        create: { userId: id, moduleCode: code, active, source, validUntil },
        update: { active, source, validUntil, updatedAt: new Date() },
      });
    }
    return listForUser(id, { includeInactive: true });
  }
  const all = getJsonStore().getAll() || [];
  const rest = all.filter((r) => Number(r.user_id) !== id);
  const nextId = all.length ? Math.max(...all.map((r) => r.id || 0)) + 1 : 1;
  let nid = nextId;
  const mine = MODULE_CODES.map((moduleCode) => ({
    id: nid++,
    user_id: id,
    module_code: moduleCode,
    active: codes.includes(moduleCode),
    source,
    valid_from: new Date().toISOString(),
  }));
  getJsonStore().setAll([...rest, ...mine]);
  return mine.filter((r) => r.active);
}

async function resolveModuleAccess(userId, legacyAccess = {}) {
  const normalized = normalizeModuleAccess(legacyAccess);
  const licenses = await listForUser(userId);
  if (!licenses.length) return normalized;
  const fromLicenses = moduleAccessFromCodes(
    licenses.filter((l) => isLicenseRowActive(l)).map((l) => l.module_code),
  );
  return { ...normalized, ...fromLicenses };
}

async function applyInviteModules(userId, moduleAccess, source = 'invite') {
  const merged = normalizeModuleAccess(moduleAccess);
  await syncFromModuleAccess(userId, merged, source);
  return resolveModuleAccess(userId, merged);
}

module.exports = {
  MODULE_CODES,
  MODULE_ACCESS_KEYS: Object.keys(ACCESS_TO_CODE),
  codesFromModuleAccess,
  moduleAccessFromCodes,
  licensesToList,
  isLicenseRowActive,
  listForUser,
  userHasActiveModule,
  syncFromModuleAccess,
  resolveModuleAccess,
  applyInviteModules,
};
