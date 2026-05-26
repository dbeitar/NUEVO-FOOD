const express = require('express');
const auth = require('../middleware/auth');
const userRepo = require('../db/repositories/userRepository');
const foodProvisioning = require('../services/foodProvisioningService');
const { resolveBrandingForUser } = require('../services/foodBrandingService');
const {
  createHandoffToken,
  verifyHandoffToken,
  buildLaunchUrl,
  buildEmbeddedLaunchUrl,
  useEmbeddedFoodLaunch,
} = require('../services/foodSsoService');
const licenseService = require('../services/licenseService');
const { auditFood } = require('../services/foodAudit');
const { hydrateAccess } = require('../utils/accessControl');
const { userHasModule, ensureModuleLicensesSynced } = require('../middleware/requireModuleLicense');

async function foodAccessContext(userRow) {
  if (!userRow) return null;
  const module_access = await ensureModuleLicensesSynced(
    { id: userRow.id, module_access: userRow.module_access || {}, rol: userRow.rol, roles: userRow.roles },
    'food_gate',
  );
  const access = hydrateAccess({ ...userRow, module_access });
  return {
    id: userRow.id,
    email: userRow.email,
    rol: access.roles[0] || userRow.rol,
    roles: access.roles,
    module_access,
  };
}

const router = express.Router();

async function deliverFoodSession(res, user, { handoffToken = null, auditAction = 'food.exchange' } = {}) {
  const ctx = await foodAccessContext(user);
  const ok = await userHasModule(ctx, 'food');
  if (!ok) {
    return res.status(403).json({ error: 'Módulo food no licenciado o vencido', module: 'food' });
  }

  const branding = await resolveBrandingForUser(user.id);
  const session = await foodProvisioning.foodSessionForShell({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    moduleAccess: ctx.module_access,
    handoffToken,
    branding,
    rol: ctx.rol,
    roles: ctx.roles,
  });
  if (!session.ok) {
    return res.status(502).json({ error: session.error || 'No se pudo abrir Food Plan' });
  }
  auditFood(user.id, auditAction, 'Sesión Food entregada al shell embebido', {
    food_user_id: user.food_user_id,
  });
  return res.json({
    success: true,
    data: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
      subscription: session.subscription,
      branding: session.branding || branding,
    },
  });
}

function publicFoodUrl() {
  return process.env.FOOD_MODULE_PUBLIC_URL
    || process.env.VITE_FOOD_MODULE_URL
    || 'https://foodplan.tech';
}

router.get('/status', auth, async (req, res) => {
  try {
    const user = await userRepo.findById(req.user.id);
    const hasLicense = await userHasModule(req.user, 'food');
    res.json({
      success: true,
      data: {
        enabled: foodProvisioning.foodModuleEnabled(),
        external: String(process.env.VITE_FOOD_EXTERNAL || process.env.FOOD_EXTERNAL_MODE || 'false').toLowerCase() === 'true',
        external_url: publicFoodUrl(),
        food_user_id: user?.food_user_id || null,
        licensed: hasLicense,
        legacy_open: String(process.env.FOOD_LEGACY_ROUTES_OPEN || 'true').toLowerCase() !== 'false',
        api_base: foodProvisioning.apiBase(),
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
    const ctx = await foodAccessContext(await userRepo.findById(req.user.id));
    const ok = await userHasModule(ctx || req.user, 'food');
    if (!ok) {
      auditFood(req.user.id, 'food.access.denied', 'Sin licencia food activa', {}, 'warn');
      return res.status(403).json({ error: 'Módulo food no licenciado o vencido', module: 'food' });
    }
    const user = await userRepo.findById(req.user.id);
    const branding = await resolveBrandingForUser(req.user.id);
    const returnUrl = req.query.return_url || process.env.SHELL_PUBLIC_URL || 'http://localhost:5175';
    const dest = String(req.query.dest || '').trim() || (req.query.panel === 'trainer' ? '/trainer' : '');
    const roles = Array.isArray(ctx?.roles) ? ctx.roles : [ctx?.rol].filter(Boolean);
    const isFoodCoach = roles.some((r) => [
      'entrenador', 'nutricionista', 'admin_training', 'admin_entrenador',
    ].includes(r));
    const token = createHandoffToken({
      sub: user.id,
      email: user.email,
      food_user_id: user.food_user_id || null,
      branding,
      coach: isFoodCoach,
    });
    const wantsTrainerPanel = dest === '/trainer' || req.query.panel === 'trainer';
    const embedded = useEmbeddedFoodLaunch() && !wantsTrainerPanel;
    const url = embedded
      ? buildEmbeddedLaunchUrl(returnUrl, token, dest)
      : buildLaunchUrl(publicFoodUrl(), token, returnUrl, dest);
    auditFood(req.user.id, 'food.launch', 'URL de ingreso Food generada', {
      food_user_id: user.food_user_id,
      embedded,
    });
    res.json({
      success: true,
      data: {
        url,
        token,
        mode: embedded ? 'embedded' : 'external',
        expires_in: Number(process.env.FOOD_SSO_TTL_SEC || 600),
        return_url: returnUrl,
      },
    });
  } catch (e) {
    auditFood(req.user?.id, 'food.launch.error', e.message, {}, 'error');
    res.status(500).json({ error: e.message });
  }
});

/** Intercambio SSO sin cookie shell: evita pisar localStorage.token de D28D. */
router.post('/exchange', async (req, res) => {
  try {
    const handoffToken = req.body?.token;
    if (!handoffToken) return res.status(400).json({ error: 'token requerido' });

    let payload;
    try {
      payload = verifyHandoffToken(handoffToken);
    } catch {
      return res.status(401).json({ error: 'Token shell inválido o expirado' });
    }
    if (payload.typ !== 'food_shell_sso') {
      return res.status(401).json({ error: 'Token shell no válido' });
    }

    const user = await userRepo.findById(Number(payload.sub));
    if (!user) return res.status(404).json({ error: 'Usuario shell no encontrado' });

    return deliverFoodSession(res, user, { handoffToken, auditAction: 'food.exchange' });
  } catch (e) {
    auditFood(null, 'food.exchange.error', e.message, {}, 'error');
    res.status(500).json({ error: e.message });
  }
});

/** SSO embebido usando JWT del shell (sin handoff en URL; evita expiración de 120s). */
router.post('/exchange-session', auth, async (req, res) => {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario shell no encontrado' });
    return deliverFoodSession(res, user, { handoffToken: null, auditAction: 'food.exchange.session' });
  } catch (e) {
    auditFood(req.user?.id, 'food.exchange.session.error', e.message, {}, 'error');
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
    const result = await foodProvisioning.provisionFoodUser({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      password: req.body?.password,
      moduleAccess: module_access,
      telefono: user.telefono,
      peso: user.peso,
      altura: user.altura,
      genero: user.genero,
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
    const result = await foodProvisioning.onFoodLicenseChange(user.id, module_access);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
