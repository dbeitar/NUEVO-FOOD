const express = require('express');
const auth = require('../middleware/auth');
const userRepo = require('../db/repositories/userRepository');
const trainingProvisioning = require('../services/trainingProvisioningService');
const { resolveBrandingForUser } = require('../services/trainingBrandingService');
const { createHandoffToken, buildExternalLaunchUrl } = require('../services/trainingSsoService');
const licenseService = require('../services/licenseService');
const { auditTraining } = require('../services/trainingAudit');
const { userHasModule } = require('../middleware/requireModuleLicense');

const router = express.Router();

function publicTrainingUrl() {
  return process.env.TRAINING_MODULE_PUBLIC_URL
    || process.env.VITE_TRAINING_MODULE_URL
    || process.env.SHELL_PUBLIC_URL
    || 'http://localhost:5175';
}

function isTrainingExternalMode() {
  return String(
    process.env.TRAINING_EXTERNAL_MODE || process.env.VITE_TRAINING_EXTERNAL || 'false',
  ).toLowerCase() === 'true';
}

router.get('/status', auth, async (req, res) => {
  try {
    const user = await userRepo.findById(req.user.id);
    const licensed = await userHasModule(req.user, 'training');
    res.json({
      success: true,
      data: {
        enabled: trainingProvisioning.trainingModuleEnabled(),
        external: isTrainingExternalMode(),
        external_url: publicTrainingUrl(),
        training_user_id: user?.training_user_id || null,
        licensed,
        legacy_open: String(process.env.TRAINING_LEGACY_ROUTES_OPEN || 'true').toLowerCase() !== 'false',
        api_base: trainingProvisioning.apiBase(),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/branding', auth, async (req, res) => {
  try {
    const branding = await resolveBrandingForUser(req.user.id);
    res.json({ success: true, data: branding });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/launch', auth, async (req, res) => {
  try {
    const licensed = await userHasModule(req.user, 'training');
    if (!licensed) {
      auditTraining(req.user.id, 'training.access.denied', 'Sin licencia training', {}, 'warn');
      return res.status(403).json({ error: 'Módulo training no licenciado o vencido', module: 'training' });
    }
    const user = await userRepo.findById(req.user.id);
    const branding = await resolveBrandingForUser(req.user.id);
    const returnUrl = req.query.return_url || process.env.SHELL_PUBLIC_URL || 'http://localhost:5175/dashboard';
    const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.rol];
    const adminish = roles.some((r) => [
      'super_admin', 'admin_training', 'admin_entrenador', 'admin_marca',
      'admin_gimnasio', 'entrenador',
    ].includes(r));

    const token = createHandoffToken({
      sub: user.id,
      email: user.email,
      training_user_id: user.training_user_id || null,
      branding,
    });

    auditTraining(req.user.id, 'training.login', 'Launch training generado', {
      training_user_id: user.training_user_id,
      mode: isTrainingExternalMode() ? 'external' : 'internal',
    });

    if (isTrainingExternalMode() && trainingProvisioning.trainingModuleEnabled()) {
      const url = buildExternalLaunchUrl(publicTrainingUrl(), token, returnUrl);
      return res.json({
        success: true,
        data: {
          mode: 'external',
          url,
          token,
          expires_in: Number(process.env.TRAINING_SSO_TTL_SEC || 120),
          return_url: returnUrl,
        },
      });
    }

    res.json({
      success: true,
      data: {
        mode: 'internal',
        url: null,
        panel: 'training',
        destinationView: adminish ? 'service:training' : 'training',
        token,
        branding,
        expires_in: Number(process.env.TRAINING_SSO_TTL_SEC || 120),
        return_url: returnUrl,
      },
    });
  } catch (e) {
    auditTraining(req.user?.id, 'training.launch.error', e.message, {}, 'error');
    res.status(500).json({ error: e.message });
  }
});

router.post('/provision', auth, async (req, res) => {
  try {
    const roles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.rol];
    if (!roles.includes('super_admin') && !roles.includes('admin_d28d')) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const targetId = Number(req.body?.user_id || req.user.id);
    const user = await userRepo.findById(targetId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const module_access = await licenseService.resolveModuleAccess(user.id, user.module_access || {});
    const result = await trainingProvisioning.provisionTrainingUser({
      userId: user.id,
      moduleAccess: module_access,
      source: 'admin',
    });
    res.json({ success: result.ok, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync-license', auth, async (req, res) => {
  try {
    if (!['super_admin', 'admin_d28d'].some((r) => (req.user.roles || [req.user.rol]).includes(r))) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const targetId = Number(req.body?.user_id || req.user.id);
    const user = await userRepo.findById(targetId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const module_access = await licenseService.resolveModuleAccess(user.id, user.module_access || {});
    const result = await trainingProvisioning.onTrainingLicenseChange(user.id, module_access);
    auditTraining(req.user.id, 'training.license.updated', 'Sync licencia training', {
      target_user_id: targetId,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
