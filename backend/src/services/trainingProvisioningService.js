/**
 * Provisionamiento módulo TRAINING (perfil + plan SQL/JSON). Paridad con Food.
 */
const userRepo = require('../db/repositories/userRepository');
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
  const key = String(process.env.TRAINING_SHELL_API_KEY || process.env.FOOD_SHELL_API_KEY || '').trim();
  if (!base || !key) return { skipped: true };
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

module.exports = {
  trainingModuleEnabled,
  hasTrainingLicense,
  provisionTrainingUser,
  deactivateTrainingProfile,
  onTrainingLicenseChange,
  apiBase,
};
