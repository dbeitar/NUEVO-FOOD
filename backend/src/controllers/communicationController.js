const { hasRole } = require('../utils/accessControl');
const comms = require('../services/communicationCenterService');

function requireSuperAdmin(req, res) {
  if (!hasRole(req.user, ['super_admin'])) {
    res.status(403).json({ error: 'Solo super admin' });
    return false;
  }
  return true;
}

exports.listTemplates = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const data = await comms.listTemplates({
      evento: req.query.evento || null,
      modulo: req.query.modulo || null,
      canal: req.query.canal || null,
      activo: req.query.activo === undefined ? null : String(req.query.activo) === 'true',
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'Error listando plantillas' });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const out = await comms.createTemplate(req.body || {});
    if (out.error) return res.status(400).json({ error: out.error });
    return res.status(201).json({ success: true, data: out.data });
  } catch (e) {
    return res.status(500).json({ error: 'Error creando plantilla' });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const out = await comms.updateTemplate(req.params.id, req.body || {});
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json({ success: true, data: out.data });
  } catch (e) {
    return res.status(500).json({ error: 'Error actualizando plantilla' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const out = await comms.deleteTemplate(req.params.id);
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Error eliminando plantilla' });
  }
};

exports.listLogs = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const data = await comms.listLogs({
      modulo: req.query.modulo || null,
      canal: req.query.canal || null,
      evento: req.query.evento || null,
      user_id: req.query.user_id || null,
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'Error listando logs' });
  }
};

// Super admin: enviar email de prueba con una plantilla existente
exports.sendTestEmail = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { evento, modulo = 'd28d', to } = req.body || {};
    if (!evento || !to) return res.status(400).json({ error: 'evento y to son requeridos' });
    const now = new Date();
    const sampleVars = {
      user: { id: req.user?.id, nombre: req.user?.nombre || 'Admin', email: req.user?.email || null },
      now: now.toISOString(),
      payment: { account_id: 0, module_code: modulo === 'training' ? 'training' : 'd28d', valid_until: new Date(now.getTime() + 30 * 86400000).toISOString(), reason: 'prueba' },
      class: { id: 0, title: 'Clase demo', start_time: new Date(now.getTime() + 86400000).toISOString(), end_time: new Date(now.getTime() + 90000000).toISOString(), program_id: 'virtual_d28d', zoom_link: 'https://zoom.us/j/demo' },
      license: { module_code: modulo === 'training' ? 'training' : 'd28d', valid_until: new Date(now.getTime() + 7 * 86400000).toISOString(), days_left: 7, source: 'test' },
      cycle: { id: 0, name: 'Ciclo demo', start_date: now.toISOString() },
      training: { plan_id: 0, trainer_id: req.user?.trainer_id || null },
      test: true,
    };
    const out = await comms.dispatchEvent({
      evento,
      modulo,
      userId: req.user?.id || null,
      targetEmail: String(to),
      vars: {
        ...sampleVars,
      },
      preferChannels: ['email'],
    });
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(500).json({ error: 'Error enviando email de prueba' });
  }
};

// Super admin: ejecutar jobs diarios manualmente (para validación/E2E)
exports.runDailyJobs = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const { runDailyCommunicationJobs } = require('../jobs/communicationScheduler');
    const out = await runDailyCommunicationJobs();
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(500).json({ error: 'Error ejecutando jobs' });
  }
};

// Soporte WhatsApp del plan activo del usuario (wa.me)
exports.getMySupport = async (req, res) => {
  try {
    const AccountsDatabase = require('../models/AccountsDatabase');
    const { resolvePlanSupport } = require('../utils/whatsappSupport');
    const account = AccountsDatabase.getByUserId(req.user.id);
    if (!account) {
      return res.json({
        success: true,
        data: resolvePlanSupport(null),
      });
    }
    const plan = AccountsDatabase.getPlanByNombre(account.plan);
    return res.json({ success: true, data: resolvePlanSupport(plan) });
  } catch (e) {
    return res.status(500).json({ error: 'Error obteniendo soporte' });
  }
};

// Usuario autenticado: registrar clic WhatsApp (auditoría + log)
exports.whatsappClick = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { plan_nombre, program_id, kind, whatsapp, message } = req.body || {};
    await comms.dispatchEvent({
      evento: 'support.whatsapp.click',
      modulo: kind === 'training' ? 'training' : kind === 'food' ? 'food' : 'd28d',
      userId,
      targetEmail: req.user?.email || null,
      vars: {
        user: { id: userId, email: req.user?.email || null, nombre: req.user?.nombre || null },
        whatsapp: {
          plan_nombre: plan_nombre || null,
          program_id: program_id || null,
          kind: kind || null,
          number: whatsapp || null,
          message: message || null,
          clicked_at: new Date().toISOString(),
        },
      },
      preferChannels: ['whatsapp_link', 'in_app'],
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Error registrando click' });
  }
};

