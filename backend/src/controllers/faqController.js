const faqService = require('../services/faqService');
const platformAudit = require('../services/platformAuditService');
const { hasRole } = require('../utils/accessControl');

const ADMIN = ['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador'];

exports.list = async (req, res) => {
  try {
    const modulo = req.params.modulo;
    const categories = faqService.listCategories(modulo);
    const items = faqService.listItems({ modulo, categoryId: req.query.category_id, q: req.query.q });
    res.json({ success: true, data: { categories, items } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.search = async (req, res) => {
  try {
    const items = faqService.search(req.params.modulo, req.query.q || '');
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.createCategory = async (req, res) => {
  if (!hasRole(req.user, ADMIN)) return res.status(403).json({ error: 'Sin permiso' });
  try {
    const row = faqService.createCategory({ ...req.body, modulo: req.params.modulo });
    await platformAudit.log(req.user.id, req.params.modulo, 'faq.category.created', 'category', row.id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.createItem = async (req, res) => {
  if (!hasRole(req.user, ADMIN)) return res.status(403).json({ error: 'Sin permiso' });
  try {
    const row = faqService.createItem(req.body);
    await platformAudit.log(req.user.id, req.params.modulo, 'faq.item.created', 'item', row.id);
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateItem = async (req, res) => {
  if (!hasRole(req.user, ADMIN)) return res.status(403).json({ error: 'Sin permiso' });
  try {
    const row = faqService.updateItem(req.params.itemId, req.body);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    await platformAudit.log(req.user.id, req.params.modulo, 'faq.item.updated', 'item', row.id);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteItem = async (req, res) => {
  if (!hasRole(req.user, ADMIN)) return res.status(403).json({ error: 'Sin permiso' });
  try {
    const ok = faqService.deleteItem(req.params.itemId);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    await platformAudit.log(req.user.id, req.params.modulo, 'faq.item.deleted', 'item', req.params.itemId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.rate = async (req, res) => {
  try {
    const row = faqService.rateUseful(req.params.itemId);
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    await platformAudit.log(req.user?.id, req.params.modulo, 'faq.item.rated', 'item', row.id);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
