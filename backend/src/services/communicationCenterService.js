const { getPrisma } = require('../lib/prisma');
const logger = require('../utils/logger');
const NotificationDatabase = require('../models/NotificationDatabase');
const { sendMail, getProvider } = require('./shellMailService');

function normalizeChannel(value) {
  const c = String(value || '').toLowerCase();
  if (['in_app', 'inapp', 'internal', 'notificacion', 'notification'].includes(c)) return 'in_app';
  if (['email', 'correo', 'mail'].includes(c)) return 'email';
  if (['whatsapp', 'whatsapp_link', 'wa', 'wa_me'].includes(c)) return 'whatsapp_link';
  return c || 'in_app';
}

function normalizeModule(value) {
  const m = String(value || '').toLowerCase();
  if (['d28d', 'food', 'training', 'platform'].includes(m)) return m;
  return 'd28d';
}

function auditComm(userId, event, message, meta = {}, level = 'info') {
  logger.log(level, message, {
    user_id: userId || null,
    event,
    ...meta,
  });
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.').map((p) => p.trim()).filter(Boolean);
  let cur = obj;
  for (const k of parts) {
    if (cur && typeof cur === 'object' && k in cur) cur = cur[k];
    else return undefined;
  }
  return cur;
}

function renderVars(input, vars = {}) {
  const raw = String(input || '');
  // {{a.b}} simple interpolation. No helpers. Sin lógica.
  return raw.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key) => {
    const v = getByPath(vars, key);
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
}

async function listTemplates({ evento = null, modulo = null, canal = null, activo = null } = {}) {
  const prisma = getPrisma();
  const where = {};
  if (evento) where.evento = String(evento);
  if (modulo) where.modulo = normalizeModule(modulo);
  if (canal) where.canal = normalizeChannel(canal);
  if (activo !== null && activo !== undefined) where.activo = !!activo;
  return prisma.communicationTemplate.findMany({ where, orderBy: [{ orden: 'asc' }, { id: 'asc' }] });
}

async function getTemplateById(id) {
  return getPrisma().communicationTemplate.findUnique({ where: { id: Number(id) } });
}

async function createTemplate(payload) {
  const prisma = getPrisma();
  const data = {
    nombre: String(payload?.nombre || '').trim(),
    evento: String(payload?.evento || '').trim(),
    modulo: normalizeModule(payload?.modulo),
    canal: normalizeChannel(payload?.canal),
    asunto: payload?.asunto != null ? String(payload.asunto) : null,
    contenido: String(payload?.contenido || ''),
    activo: payload?.activo !== false,
    editable: payload?.editable !== false,
    orden: Number(payload?.orden) || 0,
  };
  if (!data.nombre || !data.evento || !data.contenido) return { error: 'nombre, evento y contenido son requeridos' };
  const created = await prisma.communicationTemplate.create({ data });
  return { data: created };
}

async function updateTemplate(id, payload) {
  const prisma = getPrisma();
  const existing = await prisma.communicationTemplate.findUnique({ where: { id: Number(id) } });
  if (!existing) return { error: 'Plantilla no encontrada', status: 404 };
  if (existing.editable === false) return { error: 'Plantilla no editable', status: 409 };
  const data = {};
  if (payload?.nombre !== undefined) data.nombre = String(payload.nombre || '').trim();
  if (payload?.evento !== undefined) data.evento = String(payload.evento || '').trim();
  if (payload?.modulo !== undefined) data.modulo = normalizeModule(payload.modulo);
  if (payload?.canal !== undefined) data.canal = normalizeChannel(payload.canal);
  if (payload?.asunto !== undefined) data.asunto = payload.asunto != null ? String(payload.asunto) : null;
  if (payload?.contenido !== undefined) data.contenido = String(payload.contenido || '');
  if (payload?.activo !== undefined) data.activo = payload.activo !== false;
  if (payload?.orden !== undefined) data.orden = Number(payload.orden) || 0;
  const updated = await prisma.communicationTemplate.update({ where: { id: Number(id) }, data });
  return { data: updated };
}

async function deleteTemplate(id) {
  const prisma = getPrisma();
  const existing = await prisma.communicationTemplate.findUnique({ where: { id: Number(id) } });
  if (!existing) return { error: 'Plantilla no encontrada', status: 404 };
  if (existing.editable === false) return { error: 'Plantilla no eliminable', status: 409 };
  await prisma.communicationTemplate.delete({ where: { id: Number(id) } });
  return { ok: true };
}

async function logEvent({
  evento,
  modulo,
  canal,
  estado = 'ok',
  user_id = null,
  target = null,
  template_id = null,
  payload = {},
  error = null,
  message = null,
  clicked_at = null,
} = {}) {
  const prisma = getPrisma();
  const row = await prisma.communicationEventLog.create({
    data: {
      evento: String(evento || '').trim() || 'unknown',
      modulo: normalizeModule(modulo),
      canal: normalizeChannel(canal),
      estado: String(estado || 'ok').toLowerCase(),
      userId: user_id ? Number(user_id) : null,
      target: target != null ? String(target) : null,
      templateId: template_id ? Number(template_id) : null,
      payload: payload && typeof payload === 'object' ? payload : {},
      error: error != null ? String(error) : null,
      message: message != null ? String(message) : null,
      clickedAt: clicked_at ? new Date(clicked_at) : null,
    },
  });

  auditComm(user_id, 'comm.event', `Communication event ${row.evento} (${row.canal})`, {
    comm_evento: row.evento,
    comm_modulo: row.modulo,
    comm_canal: row.canal,
    comm_estado: row.estado,
    comm_id: row.id,
  });
  return row;
}

async function listLogs({ modulo = null, canal = null, evento = null, user_id = null, limit = 100, offset = 0 } = {}) {
  const prisma = getPrisma();
  const where = {};
  if (modulo) where.modulo = normalizeModule(modulo);
  if (canal) where.canal = normalizeChannel(canal);
  if (evento) where.evento = String(evento);
  if (user_id) where.userId = Number(user_id);
  const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const skip = Math.max(Number(offset) || 0, 0);
  const [total, data] = await Promise.all([
    prisma.communicationEventLog.count({ where }),
    prisma.communicationEventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { template: true },
    }),
  ]);
  return { total, data, limit: take, offset: skip };
}

async function deliverInAppNotification({ userId, title, body, meta = {}, tipo = 'comms' }) {
  // Persistencia existente: NotificationDatabase (no depende de Food).
  const created = NotificationDatabase.create({
    user_id: Number(userId),
    tipo,
    mensaje: String(body || title || ''),
    meta: meta && typeof meta === 'object' ? meta : {},
  });
  return created;
}

async function dispatchEvent({
  evento,
  modulo,
  userId = null,
  targetEmail = null,
  vars = {},
  preferChannels = null,
} = {}) {
  const prisma = getPrisma();
  const ev = String(evento || '').trim();
  const mod = normalizeModule(modulo);
  if (!ev) throw new Error('evento requerido');

  const templates = await prisma.communicationTemplate.findMany({
    where: {
      evento: ev,
      modulo: mod,
      activo: true,
      ...(preferChannels && Array.isArray(preferChannels) && preferChannels.length
        ? { canal: { in: preferChannels.map(normalizeChannel) } }
        : {}),
    },
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
  });

  const outcomes = [];
  for (const tpl of templates) {
    const canal = normalizeChannel(tpl.canal);
    const subject = tpl.asunto != null ? renderVars(tpl.asunto, vars) : '';
    const content = renderVars(tpl.contenido, vars);

    try {
      if (canal === 'in_app') {
        if (!userId) throw new Error('userId requerido para in_app');
        await deliverInAppNotification({
          userId,
          title: subject || ev,
          body: content,
          meta: { evento: ev, modulo: mod, template_id: tpl.id },
          tipo: 'comms',
        });
        const row = await logEvent({
          evento: ev,
          modulo: mod,
          canal,
          estado: 'ok',
          user_id: userId,
          target: targetEmail || null,
          template_id: tpl.id,
          payload: { subject, content_preview: String(content || '').slice(0, 400), mail_provider: null },
          message: 'Notificación in-app enviada',
        });
        outcomes.push({ canal, ok: true, log_id: row.id, template_id: tpl.id });
        continue;
      }

      if (canal === 'email') {
        if (!targetEmail) throw new Error('targetEmail requerido para email');
        const send = await sendMail({
          to: targetEmail,
          subject: subject || ev,
          html: content,
          text: content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000),
        });
        const row = await logEvent({
          evento: ev,
          modulo: mod,
          canal,
          estado: 'ok',
          user_id: userId,
          target: targetEmail,
          template_id: tpl.id,
          payload: {
            subject,
            mail_provider: send.provider,
            mail_message_id: send.messageId || null,
            mail_preview_url: send?.raw?.previewUrl || null,
          },
          message: 'Email enviado',
        });
        outcomes.push({ canal, ok: true, provider: send.provider, message_id: send.messageId, log_id: row.id, template_id: tpl.id });
        continue;
      }

      if (canal === 'whatsapp_link') {
        const row = await logEvent({
          evento: ev,
          modulo: mod,
          canal,
          estado: 'ok',
          user_id: userId,
          target: targetEmail || null,
          template_id: tpl.id,
          payload: { content_preview: String(content || '').slice(0, 200), note: 'whatsapp_link no envía API; solo auditoría' },
          message: 'Plantilla whatsapp_link registrada (sin envío)',
        });
        outcomes.push({ canal, ok: true, log_id: row.id, template_id: tpl.id });
        continue;
      }

      // Canal desconocido: auditar error pero no detener los demás.
      const row = await logEvent({
        evento: ev,
        modulo: mod,
        canal,
        estado: 'error',
        user_id: userId,
        target: targetEmail || null,
        template_id: tpl.id,
        error: `Canal no soportado: ${canal}`,
        payload: { subject },
        message: 'Canal no soportado',
      });
      outcomes.push({ canal, ok: false, log_id: row.id, template_id: tpl.id, error: 'Canal no soportado' });
    } catch (e) {
      const row = await logEvent({
        evento: ev,
        modulo: mod,
        canal,
        estado: 'error',
        user_id: userId,
        target: targetEmail || null,
        template_id: tpl.id,
        error: e.message,
        payload: { subject, mail_provider: canal === 'email' ? getProvider() : null },
        message: 'Error despachando comunicación',
      });
      outcomes.push({ canal, ok: false, log_id: row.id, template_id: tpl.id, error: e.message });
    }
  }

  // Si no hay plantillas, igual se deja rastro: evita “silencio” operativo.
  if (!templates.length) {
    const row = await logEvent({
      evento: ev,
      modulo: mod,
      canal: 'in_app',
      estado: 'error',
      user_id: userId,
      target: targetEmail || null,
      error: 'No hay plantillas activas para este evento',
      payload: { mail_provider: getProvider() },
      message: 'Sin plantilla',
    });
    outcomes.push({ canal: 'in_app', ok: false, log_id: row.id, error: 'Sin plantilla' });
  }

  return { ok: outcomes.every((o) => o.ok), outcomes, template_count: templates.length };
}

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  logEvent,
  listLogs,
  deliverInAppNotification,
  dispatchEvent,
  normalizeChannel,
  normalizeModule,
  renderVars,
};

