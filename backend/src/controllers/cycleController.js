const CyclesDatabase = require('../models/CyclesDatabase');
const ProgramSettingsDatabase = require('../models/ProgramSettingsDatabase');
const { hasRole } = require('../utils/accessControl');

const MANAGE_ROLES = ['super_admin', 'admin_d28d'];

function canManage(user) {
  return hasRole(user, MANAGE_ROLES);
}

exports.getAllCycles = (req, res) => {
  try {
    res.json({ success: true, data: CyclesDatabase.getAll() });
  } catch {
    res.status(500).json({ error: 'Error obteniendo ciclos' });
  }
};

exports.getCycleById = (req, res) => {
  try {
    const cycle = CyclesDatabase.getById(req.params.id);
    if (!cycle) return res.status(404).json({ error: 'Ciclo no encontrado' });
    res.json({ success: true, data: cycle });
  } catch {
    res.status(500).json({ error: 'Error obteniendo ciclo' });
  }
};

exports.createCycle = (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ error: 'Solo administradores D28D pueden crear ciclos' });
    }
    const { name, startDate, label } = req.body || {};
    if (!startDate) {
      return res.status(400).json({ error: 'startDate es requerido (YYYY-MM-DD)' });
    }
    const result = CyclesDatabase.create({ name, startDate, label });
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json({ success: true, data: result.data });
  } catch {
    res.status(500).json({ error: 'Error creando ciclo' });
  }
};

exports.updateCycle = (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ error: 'Solo administradores D28D pueden modificar ciclos' });
    }
    const { name, startDate, label } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (startDate !== undefined) updates.startDate = startDate;
    if (label !== undefined) updates.label = label;
    const result = CyclesDatabase.update(req.params.id, updates);
    if (result.error) return res.status(result.status || 400).json({ error: result.error });
    res.json({ success: true, data: result.data });
  } catch {
    res.status(500).json({ error: 'Error actualizando ciclo' });
  }
};

exports.deleteCycle = (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ error: 'Solo administradores D28D pueden borrar ciclos' });
    }
    const id = Number(req.params.id);
    // No permitir borrar un ciclo si está referenciado como active_cycle_id
    // en algún programa. Forzamos al admin a reasignar primero.
    const programs = ProgramSettingsDatabase.getAll();
    const inUse = programs.find((p) => Number(p.active_cycle_id) === id);
    if (inUse) {
      return res.status(409).json({
        error: `No se puede borrar: el ciclo está activo en "${inUse.name}". Cambia el ciclo activo del programa primero.`,
      });
    }
    const result = CyclesDatabase.delete(id);
    if (result.error) return res.status(result.status || 404).json({ error: result.error });
    res.json({ success: true, data: result.data });
  } catch {
    res.status(500).json({ error: 'Error borrando ciclo' });
  }
};
