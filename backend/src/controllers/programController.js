const ProgramSettingsDatabase = require('../models/ProgramSettingsDatabase');
const { hasRole } = require('../utils/accessControl');

exports.getAllPrograms = (req, res) => {
  try {
    const programs = ProgramSettingsDatabase.getAll();
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo programas' });
  }
};

exports.getProgramById = (req, res) => {
  try {
    const program = ProgramSettingsDatabase.getById(req.params.id);
    if (!program) return res.status(404).json({ error: 'Programa no encontrado' });
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo programa' });
  }
};

exports.updateProgram = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      return res.status(403).json({ error: 'Solo administradores D28D pueden modificar programas' });
    }
    const updated = ProgramSettingsDatabase.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Programa no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando programa' });
  }
};
