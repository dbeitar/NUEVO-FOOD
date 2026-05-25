/**
 * Provisionamiento módulo TRAINING (perfil + plan SQL/JSON). Paridad con Food.
 */
const crypto = require('crypto');
const userRepo = require('../db/repositories/userRepository');
const licenseService = require('./licenseService');
const TrainingPlansStore = require('../models/TrainingPlansStore');
const planRowRepo = require('../db/repositories/trainingPlanRowRepository');
const { useTrainingPlanSql } = require('../utils/storageMode');
const { resolveBrandingForUser } = require('./trainingBrandingService');
const { auditTraining } = require('./trainingAudit');

function trainingModuleEnabled() {
  return Boolean(String(process.env.TRAINING_MODULE_URL || '').trim());
}

function apiBase() {
  const raw = String(process.env.TRAINING_MODULE_URL || '').trim().replace(/\/$/, '');
  if (!raw) return null;
  if (raw.endsWith('/api/v1')) return raw;
  if (raw.endsWith('/api')) return `${raw}/v1`;
  return `${raw}/api/v1`;
}

function shellKey() {
  return String(process.env.TRAINING_SHELL_API_KEY || process.env.FOOD_SHELL_API_KEY || '').trim();
}

function ssoSecret() {
  return process.env.TRAINING_SSO_SECRET || process.env.TRAINING_SHELL_SSO_SECRET
    || process.env.FOOD_SSO_SECRET || process.env.JWT_SECRET || '';
}

function trainingBridgePassword(email) {
  const secret = ssoSecret();
  if (!secret) return `Tr8!${Date.now().toString(36).slice(-8)}`;
  const h = crypto.createHmac('sha256', secret)
    .update(String(email || '').toLowerCase().trim())
    .digest('hex');
  return `Tr8!${h.slice(0, 12)}`;
}

function mapTrainingAuthResponse(data) {
  if (!data?.accessToken) return null;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    user: data.user,
    branding: data.branding || null,
    destinationView: data.destinationView || null,
  };
}

async function trainingApiShellExchange(handoffToken) {
  const { res, data } = await fetchJson(`${apiBase()}/auth/shell-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token: handoffToken }),
  });
  if (!res.ok) return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
  const mapped = mapTrainingAuthResponse(data);
  return mapped ? { ok: true, ...mapped, external: true } : { ok: false, error: 'Respuesta Training inválida' };
}

async function trainingApiLogin(email, password) {
  const { res, data } = await fetchJson(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return { ok: false, error: data.message || data.error || `HTTP ${res.status}` };
  const mapped = mapTrainingAuthResponse(data);
  return mapped ? { ok: true, ...mapped, external: true } : { ok: false, error: 'Respuesta Training inválida' };
}

function hasTrainingLicense(moduleAccess) {
  if (!moduleAccess || typeof moduleAccess !== 'object') return false;
  return Boolean(moduleAccess.training);
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

async function ensureInternalTrainingProfile(user) {
  await TrainingPlansStore.hydrate?.();
  let plan = TrainingPlansStore.getActiveByUserId(user.id);
  if (!plan) {
    plan = TrainingPlansStore.create({
      user_id: user.id,
      trainer_id: user.trainer_id || null,
      level: user.experiencia || 'principiante',
      method: user.metodo_entrenamiento || 'D28D',
      split_type: 'full_body',
      dias: [],
    });
    auditTraining(user.id, 'training.plan.created', 'Plan training inicial creado', {
      plan_id: plan.id,
    });
  } else {
    auditTraining(user.id, 'training.plan.updated', 'Plan training existente vinculado', {
      plan_id: plan.id,
    });
  }
  const trainingUserId = String(plan._sql_id || plan.id);
  await userRepo.patchLegacy(user.id, { training_user_id: trainingUserId });
  return { plan, training_user_id: trainingUserId };
}

async function pushExternalProvision(user, branding) {
  const base = apiBase();
  const key = shellKey();
  if (!base || !key) return { skipped: true };
  const roles = rolesOf(user);
  const { res, data } = await fetchJson(`${base}/training/shell-provision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shell-Key': key },
    body: JSON.stringify({
      shellUserId: user.id,
      email: user.email,
      nombre: user.nombre,
      trainerId: user.trainer_id,
      gymId: user.gym_id,
      branding,
      active: true,
      roles,
    }),
  });
  if (res.ok && data.trainingUserId) {
    await userRepo.patchLegacy(user.id, { training_user_id: String(data.trainingUserId) });
    return { ok: true, training_user_id: data.trainingUserId, external: true };
  }
  return { ok: false, error: data.message || data.error };
}

async function provisionTrainingUser({
  userId,
  moduleAccess,
  source = 'shell',
}) {
  if (!hasTrainingLicense(moduleAccess)) {
    auditTraining(userId, 'training.provision.skipped', 'Sin licencia training', { source });
    return { ok: true, skipped: true, reason: 'sin licencia training' };
  }

  const user = await userRepo.findById(userId);
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  if (user.training_user_id) {
    auditTraining(userId, 'training.provision.linked', 'Perfil training ya vinculado', {
      training_user_id: user.training_user_id,
      source,
    });
    return { ok: true, skipped: true, reason: 'ya vinculado', training_user_id: user.training_user_id };
  }

  try {
    const branding = await resolveBrandingForUser(userId);
    if (trainingModuleEnabled()) {
      const ext = await pushExternalProvision(user, branding);
      if (ext.ok && ext.training_user_id) {
        auditTraining(userId, 'training.provision.success', 'Provision externo training', {
          training_user_id: ext.training_user_id,
          source,
        });
        return { ok: true, ...ext, provisioned: true };
      }
    }
    const internal = await ensureInternalTrainingProfile(user);
    auditTraining(userId, 'training.provision.success', 'Perfil training interno provisionado', {
      training_user_id: internal.training_user_id,
      source,
    });
    return { ok: true, provisioned: true, ...internal };
  } catch (e) {
    auditTraining(userId, 'training.provision.error', e.message, { source }, 'error');
    return { ok: false, error: e.message };
  }
}

async function deactivateTrainingProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) return { ok: false };
  if (useTrainingPlanSql()) {
    const { getPrisma } = require('../lib/prisma');
    await getPrisma().trainingPlanRow.updateMany({
      where: { userId: Number(userId) },
      data: { activo: false },
    });
  }
  const base = apiBase();
  const key = String(process.env.TRAINING_SHELL_API_KEY || process.env.FOOD_SHELL_API_KEY || '').trim();
  if (base && key) {
    await fetchJson(`${base}/training/shell-provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shell-Key': key },
      body: JSON.stringify({ shellUserId: user.id, email: user.email, active: false }),
    }).catch(() => {});
  }
  auditTraining(userId, 'training.license.suspended', 'Perfil training suspendido', {});
  return { ok: true, deactivated: true };
}

async function onTrainingLicenseChange(userId, moduleAccess) {
  if (hasTrainingLicense(moduleAccess)) {
    return provisionTrainingUser({ userId, moduleAccess, source: 'license' });
  }
  return deactivateTrainingProfile(userId);
}

function rolesOf(user) {
  if (!user) return [];
  return Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol].filter(Boolean);
}

function isCoachish(roles) {
  return roles.some((r) => [
    'entrenador', 'nutricionista', 'admin_training', 'admin_entrenador',
    'admin_marca', 'admin_gimnasio', 'super_admin',
  ].includes(r));
}

/**
 * Sesión del módulo training embebido (paridad food-module/exchange-session).
 * Usa el JWT del shell; provisiona plan interno si falta.
 */
async function trainingSessionForShell({
  userId,
  branding: brandingIn = null,
  handoffToken = null,
}) {
  const user = await userRepo.findById(Number(userId));
  if (!user) return { ok: false, error: 'Usuario no encontrado' };

  const module_access = await licenseService.resolveModuleAccess(user.id, user.module_access || {});
  if (!hasTrainingLicense(module_access)) {
    return { ok: false, error: 'Módulo training no licenciado o vencido' };
  }

  await provisionTrainingUser({ userId: user.id, moduleAccess: module_access, source: 'session' });
  const refreshed = await userRepo.findById(user.id);
  const roles = rolesOf(refreshed);
  const branding = brandingIn || await resolveBrandingForUser(user.id);
  const coachMode = isCoachish(roles);

  const shellUser = {
    id: refreshed.id,
    email: refreshed.email,
    nombre: refreshed.nombre,
    rol: roles[0] || refreshed.rol,
    roles,
    trainer_id: refreshed.trainer_id,
    gym_id: refreshed.gym_id,
    training_user_id: refreshed.training_user_id,
    module_access,
  };

  if (trainingModuleEnabled()) {
    if (handoffToken) {
      const exchanged = await trainingApiShellExchange(handoffToken);
      if (exchanged.ok) {
        auditTraining(userId, 'training.sso.exchange', 'Sesión Training vía shell-exchange', {});
        return {
          ok: true,
          user: shellUser,
          branding: exchanged.branding || branding,
          panel: 'training',
          destinationView: exchanged.destinationView || (coachMode ? '/coach' : '/athlete'),
          coach_mode: coachMode,
          training_api: {
            accessToken: exchanged.accessToken,
            refreshToken: exchanged.refreshToken,
            training_user: exchanged.user,
          },
        };
      }
    }
    const bridge = trainingBridgePassword(refreshed.email);
    let login = await trainingApiLogin(refreshed.email, bridge);
    if (!login.ok) {
      await pushExternalProvision(refreshed, branding);
      login = await trainingApiLogin(refreshed.email, bridge);
    }
    if (login.ok) {
      auditTraining(userId, 'training.sso.login', 'Sesión Training vía login puente', {});
      return {
        ok: true,
        user: shellUser,
        branding: login.branding || branding,
        panel: 'training',
        destinationView: login.destinationView || (coachMode ? '/coach' : '/athlete'),
        coach_mode: coachMode,
        training_api: {
          accessToken: login.accessToken,
          refreshToken: login.refreshToken,
          training_user: login.user,
        },
      };
    }
  }

  return {
    ok: true,
    user: shellUser,
    branding,
    panel: 'training',
    destinationView: coachMode ? '/coach' : '/athlete',
    coach_mode: coachMode,
  };
}

module.exports = {
  trainingModuleEnabled,
  hasTrainingLicense,
  provisionTrainingUser,
  deactivateTrainingProfile,
  onTrainingLicenseChange,
  trainingSessionForShell,
  apiBase,
};
