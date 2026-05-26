const { useRelationalStorage } = require('../utils/storageMode');
const { hasRole } = require('../utils/accessControl');
const JsonStore = require('../utils/JsonStore');

const DEFAULT_LINKS = [
  { module_code: 'food', label: 'Pago Plan Alimentación', payment_url: '', active: false, sort_order: 1 },
  { module_code: 'training', label: 'Pago Entrenamiento', payment_url: '', active: false, sort_order: 2 },
  { module_code: 'd28d', label: 'Pago D28D', payment_url: '', active: false, sort_order: 3 },
  { module_code: 'gym', label: 'Pago Gimnasio', payment_url: '', active: false, sort_order: 4 },
];

let store;
function getStore() {
  if (!store) store = new JsonStore('payment_links.json', DEFAULT_LINKS);
  return store;
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
            sortOrder: d.sort_order,
          },
          update: {},
        });
      }
      return listAll();
    }
    return rows.map((r) => ({
      id: r.id,
      module_code: r.moduleCode,
      label: r.label,
      payment_url: r.paymentUrl,
      active: r.active,
      sort_order: r.sortOrder,
    }));
  }
  const all = getStore().getAll() || [];
  return all.length ? all : DEFAULT_LINKS;
}

exports.getPublicLinks = async (_req, res) => {
  try {
    const all = await listAll();
    const data = all.filter((l) => l.active && String(l.payment_url || '').trim());
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
    const { module_code, label, payment_url, active = true, sort_order = 0 } = req.body || {};
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
          sortOrder: Number(sort_order) || 0,
        },
        update: {
          label: label || null,
          paymentUrl: String(payment_url || ''),
          active: Boolean(active),
          sortOrder: Number(sort_order) || 0,
        },
      });
      return res.json({
        success: true,
        data: {
          id: row.id,
          module_code: row.moduleCode,
          label: row.label,
          payment_url: row.paymentUrl,
          active: row.active,
          sort_order: row.sortOrder,
        },
      });
    }
    const all = getStore().getAll() || [];
    const idx = all.findIndex((l) => l.module_code === module_code);
    const row = {
      id: idx >= 0 ? all[idx].id : (all.length ? Math.max(...all.map((x) => x.id || 0)) + 1 : 1),
      module_code,
      label,
      payment_url: String(payment_url || ''),
      active: Boolean(active),
      sort_order: Number(sort_order) || 0,
    };
    if (idx >= 0) all[idx] = row;
    else all.push(row);
    getStore().setAll(all);
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(500).json({ error: 'Error guardando enlace' });
  }
};
