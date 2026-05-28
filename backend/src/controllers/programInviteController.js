const programInviteRepo = require('../db/repositories/programInviteRepository');
const { hasRole } = require('../utils/accessControl');

const requireSuperAdmin = (req, res) => {
  if (!hasRole(req.user, ['super_admin'])) {
    res.status(403).json({ error: 'Solo super admin puede gestionar códigos de programa' });
    return false;
  }
  return true;
};

exports.listInvites = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const programId = req.query.program_id ? String(req.query.program_id) : null;
    const data = await programInviteRepo.list({ programId });
    return res.json({ success: true, data });
  } catch (e) {
    console.error('listInvites:', e);
    return res.status(500).json({ error: 'Error listando códigos' });
  }
};

exports.createInvite = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const {
      code,
      program_id,
      label,
      suggested_plan_nombre,
      module_preset,
      active,
    } = req.body || {};
    if (!code || !program_id) {
      return res.status(400).json({ error: 'code y program_id son requeridos' });
    }
    const created = await programInviteRepo.create({
      code,
      program_id,
      label,
      suggested_plan_nombre,
      module_preset,
      active,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'El código ya existe' });
    }
    console.error('createInvite:', e);
    return res.status(500).json({ error: 'Error creando código' });
  }
};

exports.updateInvite = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const code = String(req.params.code || '').toUpperCase();
    const updated = await programInviteRepo.update(code, req.body || {});
    return res.json({ success: true, data: updated });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Código no encontrado' });
    console.error('updateInvite:', e);
    return res.status(500).json({ error: 'Error actualizando código' });
  }
};

exports.deleteInvite = async (req, res) => {
  try {
    if (!requireSuperAdmin(req, res)) return;
    const code = String(req.params.code || '').toUpperCase();
    await programInviteRepo.remove(code);
    return res.json({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Código no encontrado' });
    console.error('deleteInvite:', e);
    return res.status(500).json({ error: 'Error eliminando código' });
  }
};
