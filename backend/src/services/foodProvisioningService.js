/**
 * Provisionamiento Food Plan (food_version_final / api/v1).
 * No bloquea registro shell; reversible vía licencia food.
 */
const crypto = require('crypto');
const userRepo = require('../db/repositories/userRepository');
const licenseService = require('./licenseService');
const { userHasModule } = require('../middleware/requireModuleLicense');
const { resolveBrandingForUser } = require('./foodBrandingService');
const { auditFood } = require('./foodAudit');

function foodModuleEnabled() {
  return Boolean(String(process.env.FOOD_MODULE_URL || '').trim());
}

function apiBase() {
  const raw = String(process.env.FOOD_MODULE_URL || '').trim().replace(/\/$/, '');
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api')) return `${raw}/v1`;
  return `${raw}/api/v1`;
}

function internalKey() {
  return String(process.env.FOOD_SHELL_API_KEY || '').trim();
}

function ssoSecret() {
  return process.env.FOOD_SSO_SECRET || process.env.JWT_SECRET || '';
}

/** Contraseña determinística shell↔Food para login tras provisionamiento. */
function foodBridgePassword(email) {
  const secret = ssoSecret();
  if (!secret) return `D28d!${Date.now().toString(36).slice(-8)}`;
  const h = crypto.createHmac('sha256', secret)
    .update(String(email || '').toLowerCase().trim())
    .digest('hex');
  return `Fp8!${h.slice(0, 12)}`;
}

function mapFoodAuthResponse(data) {
  if (!data?.accessToken) return null;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    user: data.user,
    subscription: data.subscription || null,
    branding: data.branding || null,
  };
}

async function foodApiLogin(email, password) {
  const { res, data } = await fetchJson(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
  const mapped = mapFoodAuthResponse(data);
  return mapped ? { ok: true, ...mapped } : { ok: false, error: 'Respuesta Food inválida' };
}

async function foodApiShellExchange(handoffToken) {
  const { res, data } = await fetchJson(`${apiBase()}/auth/shell-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token: handoffToken }),
  });
  if (!res.ok) return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
  const mapped = mapFoodAuthResponse(data);
  return mapped ? { ok: true, ...mapped } : { ok: false, error: 'Respuesta Food inválida' };
}

function splitName(nombre) {
  const parts = String(nombre || 'Usuario').trim().split(/\s+/);
  const firstName = parts[0] || 'Usuario';
  const lastName = parts.slice(1).join(' ') || 'D28D';
  return { firstName, lastName };
}

function hasFoodLicense(moduleAccess) {
  if (!moduleAccess || typeof moduleAccess !== 'object') return false;
  return Boolean(moduleAccess.food_plan || moduleAccess.nutrition || moduleAccess.food);
}

/** Misma política que requireModuleLicense (super_admin, roles food, module_access). */
async function userCanUseFood({ userId, moduleAccess, rol, roles } = {}) {
  let userLike = {
    id: userId,
    module_access: moduleAccess || {},
    rol,
    roles,
  };
  if (userId && !rol && !roles?.length) {
    const u = await userRepo.findById(userId);
    if (u) {
      userLike = {
        id: u.id,
        module_access: moduleAccess || u.module_access || {},
        rol: u.rol,
        roles: u.roles,
      };
    }
  }
  return userHasModule(userLike, 'food');
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

async function provisionFoodUser({
  userId,
  email,
  nombre,
  password,
  moduleAccess,
  telefono,
  peso,
  altura,
  genero,
  source = 'shell',
}) {
  if (!foodModuleEnabled()) {
    auditFood(userId, 'food.provision.skipped', 'FOOD_MODULE_URL no configurada', { source });
    return { ok: true, skipped: true, reason: 'FOOD_MODULE_URL no configurada' };
  }
  if (!(await userCanUseFood({ userId, moduleAccess }))) {
    auditFood(userId, 'food.provision.skipped', 'Sin licencia food', { source });
    return { ok: true, skipped: true, reason: 'sin licencia food' };
  }

  const existing = await userRepo.findById(userId);
  if (existing?.food_user_id) {
    await syncFoodUserState(userId, { active: true });
    auditFood(userId, 'food.provision.linked', 'Usuario ya vinculado', {
      food_user_id: existing.food_user_id,
      source,
    });
    return { ok: true, skipped: true, reason: 'ya vinculado', food_user_id: existing.food_user_id };
  }

  const { firstName, lastName } = splitName(nombre);
  const registerUrl = `${apiBase()}/auth/register`;
  const body = {
    email,
    firstName,
    lastName,
    password: password && String(password).length >= 6 ? password : foodBridgePassword(email),
    phone: telefono || undefined,
    planType: 'ADVANCED',
    acceptedPrivacyPolicy: true,
    acceptedTerms: true,
  };
  if (peso) body.weightKg = Number(peso);
  if (altura) body.heightCm = Number(altura);
  if (genero) body.gender = genero === 'femenino' ? 'FEMALE' : 'MALE';

  try {
    const { res, data } = await fetchJson(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const duplicate = res.status === 409
        || /exist|duplicate|registrado/i.test(String(data.message || data.error || ''));
      if (duplicate) {
        const linked = await linkExistingFoodUserByEmail(userId, email);
        auditFood(userId, 'food.provision.duplicate', 'Email ya en Food — vinculado', {
          source,
          linked: !!linked.food_user_id,
        });
        return linked;
      }
      auditFood(userId, 'food.provision.error', data.message || data.error || `HTTP ${res.status}`, {
        source,
        status: res.status,
      }, 'error');
      return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
    }

    const foodUserId = data.user?.id || data.userId || null;
    if (foodUserId) {
      await userRepo.patchLegacy(userId, { food_user_id: String(foodUserId) });
      await pushShellLinkToFood(userId, foodUserId, email, true);
      await syncBrandingToFood(userId, foodUserId);
    }
    auditFood(userId, 'food.provision.success', 'Usuario provisionado en Food', {
      food_user_id: foodUserId,
      source,
    });
    const tokens = mapFoodAuthResponse(data);
    return {
      ok: true,
      food_user_id: foodUserId,
      provisioned: true,
      ...(tokens || {}),
    };
  } catch (e) {
    auditFood(userId, 'food.provision.error', e.message, { source }, 'error');
    return { ok: false, error: e.message };
  }
}

/**
 * Sesión Food para SSO embebido: shell-exchange → login puente → provision + login.
 */
async function foodSessionForShell({
  userId,
  email,
  nombre,
  moduleAccess,
  handoffToken,
  branding,
  rol,
  roles,
}) {
  if (!foodModuleEnabled()) {
    return { ok: false, error: 'FOOD_MODULE_URL no configurada en el servidor' };
  }
  if (!(await userCanUseFood({ userId, moduleAccess, rol, roles }))) {
    return { ok: false, error: 'Módulo food no licenciado o vencido' };
  }

  if (handoffToken) {
    const exchanged = await foodApiShellExchange(handoffToken);
    if (exchanged.ok) {
      auditFood(userId, 'food.sso.exchange', 'Sesión Food vía shell-exchange', {});
      return exchanged;
    }
  }

  const bridge = foodBridgePassword(email);
  let login = await foodApiLogin(email, bridge);
  if (login.ok) {
    auditFood(userId, 'food.sso.login', 'Sesión Food vía login puente', {});
    return login;
  }

  await provisionFoodUser({
    userId,
    email,
    nombre,
    password: bridge,
    moduleAccess,
    source: 'sso',
  });

  login = await foodApiLogin(email, bridge);
  if (login.ok) {
    auditFood(userId, 'food.sso.login_after_provision', 'Sesión Food tras provisionamiento', {});
    return login;
  }

  auditFood(userId, 'food.sso.error', login.error || 'No se pudo abrir sesión Food', { branding: !!branding }, 'error');
  return {
    ok: false,
    error: login.error || 'No se pudo iniciar sesión en Food Plan. Si ya tenías cuenta, contacta al administrador.',
  };
}

async function linkExistingFoodUserByEmail(userId, email) {
  const key = internalKey();
  if (key) {
    const { res, data } = await fetchJson(`${apiBase()}/auth/shell-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shell-Key': key,
      },
      body: JSON.stringify({ email, shellUserId: userId }),
    });
    if (res.ok && data.foodUserId) {
      await userRepo.patchLegacy(userId, { food_user_id: String(data.foodUserId) });
      await syncBrandingToFood(userId, data.foodUserId);
      return { ok: true, food_user_id: data.foodUserId, linked: true };
    }
  }
  auditFood(userId, 'food.provision.link_pending', 'Food existe; configurar FOOD_SHELL_API_KEY para vínculo automático', {
    email,
  }, 'warn');
  return { ok: true, skipped: true, reason: 'email ya existe en Food' };
}

async function pushShellLinkToFood(shellUserId, foodUserId, email, active) {
  const key = internalKey();
  if (!key) return;
  await fetchJson(`${apiBase()}/auth/shell-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shell-Key': key },
    body: JSON.stringify({
      email,
      shellUserId,
      foodUserId,
      active,
    }),
  }).catch(() => {});
}

async function syncBrandingToFood(shellUserId, foodUserId) {
  const key = internalKey();
  const branding = await resolveBrandingForUser(shellUserId);
  if (!key || !branding) return;
  await fetchJson(`${apiBase()}/branding/shell`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shell-Key': key },
    body: JSON.stringify({ foodUserId, branding }),
  }).catch(() => {});
}

async function syncFoodUserState(userId, { active = true } = {}) {
  const user = await userRepo.findById(userId);
  if (!user?.email) return { ok: false };
  const key = internalKey();
  if (!key) return { ok: true, skipped: true };
  const { res, data } = await fetchJson(`${apiBase()}/auth/shell-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shell-Key': key },
    body: JSON.stringify({
      email: user.email,
      shellUserId: user.id,
      foodUserId: user.food_user_id || undefined,
      active,
    }),
  });
  const event = active ? 'food.license.reactivated' : 'food.license.suspended';
  auditFood(userId, event, active ? 'Acceso Food reactivado' : 'Acceso Food suspendido', {
    status: res.status,
    food_user_id: user.food_user_id,
  });
  return { ok: res.ok, data };
}

async function onFoodLicenseChange(userId, moduleAccess) {
  const user = await userRepo.findById(userId);
  if (!user) return null;
  const has = await userCanUseFood({
    userId,
    moduleAccess,
    rol: user.rol,
    roles: user.roles,
  });
  if (has) {
    return provisionFoodUser({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      moduleAccess,
      telefono: user.telefono,
      peso: user.peso,
      altura: user.altura,
      genero: user.genero,
      source: 'license',
    });
  }
  if (user.food_user_id || foodModuleEnabled()) {
    return syncFoodUserState(userId, { active: false });
  }
  auditFood(userId, 'food.license.revoked', 'Licencia food retirada', {});
  return { ok: true, deactivated: true };
}

module.exports = {
  foodModuleEnabled,
  hasFoodLicense,
  userCanUseFood,
  provisionFoodUser,
  syncFoodUserState,
  onFoodLicenseChange,
  apiBase,
  foodBridgePassword,
  foodSessionForShell,
};
