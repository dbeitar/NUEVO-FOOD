const { useRelationalStorage } = require('../utils/storageMode');
const { hasRole } = require('../utils/accessControl');
const JsonStore = require('../utils/JsonStore');
const { WOMPI_DEFAULT } = require('../services/paymentNotifyService');

const DEFAULT_LINKS = [
  { module_code: 'food', label: 'Pago Plan Alimentación', payment_url: WOMPI_DEFAULT, active: true, in_person_enabled: true, in_person_label: 'Pago en sede', online_label: 'Pago en línea (Wompi)', sort_order: 1 },
  { module_code: 'training', label: 'Pago Entrenamiento', payment_url: WOMPI_DEFAULT, active: true, in_person_enabled: true, in_person_label: 'Pago en sede', online_label: 'Pago en línea (Wompi)', sort_order: 2 },
  { module_code: 'd28d', label: 'Pago D28D', payment_url: WOMPI_DEFAULT, active: true, in_person_enabled: true, in_person_label: 'Pago en sede', online_label: 'Pago en línea (Wompi)', sort_order: 3 },
  { module_code: 'gym', label: 'Pago Gimnasio', payment_url: WOMPI_DEFAULT, active: true, in_person_enabled: true, in_person_label: 'Pago en sede', online_label: 'Pago en línea (Wompi)', sort_order: 4 },
];

let store;
function getStore() {
  if (!store) store = new JsonStore('payment_links.json', DEFAULT_LINKS);
  return store;
}

function mapRow(r) {
  return {
    id: r.id,
    module_code: r.module_code || r.moduleCode,
    label: r.label,
    payment_url: r.payment_url || r.paymentUrl || '',
    active: r.active !== false,
    in_person_enabled: r.in_person_enabled ?? r.inPersonEnabled ?? true,
    in_person_label: r.in_person_label || r.inPersonLabel || 'Pago en sede',
    online_label: r.online_label || r.onlineLabel || 'Pago en línea (Wompi)',
    sort_order: r.sort_order ?? r.sortOrder ?? 0,
  };
}

async function listAll() {
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const rows = await getPrisma().paymentLink.findMany({ orderBy: { sortOrder: 'asc' } });
    if (rows.length === 0) {
      const prisma = getPrisma();
      for (const d of DEFAULT_LINKS) {
        await prisma.paymentLink.upsert({
          where: { moduleCode: d.module_code },
          create: {
            moduleCode: d.module_code,
            label: d.label,
            paymentUrl: d.payment_url,
            active: d.active,
            inPersonEnabled: d.in_person_enabled,
            inPersonLabel: d.in_person_label,
            onlineLabel: d.online_label,
            sortOrder: d.sort_order,
          },
          update: {},
        });
      }
      return listAll();
    }
    return rows.map((r) => mapRow({
      id: r.id,
      moduleCode: r.moduleCode,
      label: r.label,
      paymentUrl: r.paymentUrl,
      active: r.active,
      inPersonEnabled: r.inPersonEnabled,
      inPersonLabel: r.inPersonLabel,
      onlineLabel: r.onlineLabel,
      sortOrder: r.sortOrder,
    }));
  }
  const all = getStore().getAll() || [];
  return (all.length ? all : DEFAULT_LINKS).map(mapRow);
}

async function getModuleMethods(moduleCode) {
  const all = await listAll();
  const row = all.find((l) => l.module_code === moduleCode);
  if (!row || !row.active) {
    return {
      module_code: moduleCode,
      methods: [],
    };
  }
  const methods = [];
  const url = String(row.payment_url || '').trim();
  if (url) {
    methods.push({
      id: 'wompi_online',
      label: row.online_label || 'Pago en línea (Wompi)',
      url,
    });
  }
  if (row.in_person_enabled) {
    methods.push({
      id: 'pago_sede',
      label: row.in_person_label || 'Pago en sede',
      url: null,
    });
  }
  return { module_code: moduleCode, methods };
}

exports.getPublicLinks = async (req, res) => {
  try {
    const moduleCode = req.query.module;
    if (moduleCode) {
      const data = await getModuleMethods(String(moduleCode));
      return res.json({ success: true, data });
    }
    const all = await listAll();
    const data = all.filter((l) => l.active).flatMap((l) => {
      const m = [];
      if (String(l.payment_url || '').trim()) {
        m.push({ module_code: l.module_code, method: 'wompi_online', label: l.online_label, url: l.payment_url });
      }
      if (l.in_person_enabled) {
        m.push({ module_code: l.module_code, method: 'pago_sede', label: l.in_person_label, url: null });
      }
      return m;
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'Error listando enlaces' });
  }
};

exports.getAdminLinks = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    const data = await listAll();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'Error listando enlaces' });
  }
};

exports.upsertLink = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super_admin' });
    }
    const {
      module_code,
      label,
      payment_url,
      active = true,
      sort_order = 0,
      in_person_enabled = true,
      in_person_label = 'Pago en sede',
      online_label = 'Pago en línea (Wompi)',
    } = req.body || {};
    if (!module_code) return res.status(400).json({ error: 'module_code requerido' });
    if (useRelationalStorage()) {
      const { getPrisma } = require('../lib/prisma');
      const row = await getPrisma().paymentLink.upsert({
        where: { moduleCode: String(module_code) },
        create: {
          moduleCode: String(module_code),
          label: label || null,
          paymentUrl: String(payment_url || ''),
          active: Boolean(active),
          inPersonEnabled: Boolean(in_person_enabled),
          inPersonLabel: in_person_label,
          onlineLabel: online_label,
          sortOrder: Number(sort_order) || 0,
        },
        update: {
          label: label || null,
          paymentUrl: String(payment_url || ''),
          active: Boolean(active),
          inPersonEnabled: Boolean(in_person_enabled),
          inPersonLabel: in_person_label,
          onlineLabel: online_label,
          sortOrder: Number(sort_order) || 0,
        },
      });
      return res.json({ success: true, data: mapRow(row) });
    }
    const all = getStore().getAll() || [];
    const idx = all.findIndex((l) => l.module_code === module_code);
    const row = {
      id: idx >= 0 ? all[idx].id : (all.length ? Math.max(...all.map((x) => x.id || 0)) + 1 : 1),
      module_code,
      label,
      payment_url: String(payment_url || ''),
      active: Boolean(active),
      in_person_enabled: Boolean(in_person_enabled),
      in_person_label,
      online_label,
      sort_order: Number(sort_order) || 0,
    };
    if (idx >= 0) all[idx] = row;
    else all.push(row);
    getStore().setAll(all);
    return res.json({ success: true, data: mapRow(row) });
  } catch (e) {
    return res.status(500).json({ error: 'Error guardando enlace' });
  }
};

exports.getModuleMethods = getModuleMethods;
