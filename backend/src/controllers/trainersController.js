const TrainersDatabase = require('../models/TrainersDatabase');
const {
  isSuperAdmin,
  isGymAdmin,
  getUserGymId,
  filterByGym,
  canAccessEntity,
} = require('../utils/tenantScope');
const {
  assertInviteCodeAvailable,
  suggestTrainerInviteCode,
} = require('../utils/inviteCodeUtils');

const TRAINER_MANAGE_ROLES = ['super_admin', 'admin_gimnasio', 'admin_marca', 'admin_gym'];
const isTrainerManager = (user) => Boolean(user) && TRAINER_MANAGE_ROLES.includes(user.rol);

const getAllTrainers = (req, res) => {
  try {
    const all = TrainersDatabase.getAll();
    res.json(filterByGym(all, req.user));
  } catch (error) {
    console.error('Error obteniendo entrenadores:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getTrainerById = (req, res) => {
  try {
    const trainer = TrainersDatabase.getById(parseInt(req.params.id, 10));
    if (!trainer) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!canAccessEntity(req.user, trainer)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    res.json(trainer);
  } catch (error) {
    console.error('Error obteniendo entrenador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getTrainersByGym = (req, res) => {
  try {
    const requestedGymId = parseInt(req.params.gymId, 10);
    if (!isSuperAdmin(req.user)) {
      const myGym = getUserGymId(req.user);
      if (myGym == null || String(myGym) !== String(requestedGymId)) {
        return res.status(403).json({ error: 'Acceso denegado al gimnasio solicitado' });
      }
    }
    const trainers = TrainersDatabase.getByGymId(requestedGymId);
    res.json(trainers);
  } catch (error) {
    console.error('Error obteniendo entrenadores del gimnasio:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const searchBySpecialty = (req, res) => {
  try {
    const { specialty } = req.query;
    if (!specialty) return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    const trainers = TrainersDatabase.searchBySpecialty(specialty);
    res.json(filterByGym(trainers, req.user));
  } catch (error) {
    console.error('Error buscando entrenadores:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const searchTrainers = (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
    const trainers = TrainersDatabase.search(q);
    res.json(filterByGym(trainers, req.user));
  } catch (error) {
    console.error('Error buscando entrenadores:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createTrainer = (req, res) => {
  try {
    if (!isTrainerManager(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    const {
      nombre, email, teléfono, telefono, especialidad, certificaciones, experiencia_años,
      gym_id, horario_disponible, tarifa_sesion, capacidad_usuarios, invite_code,
    } = req.body || {};
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    // Forzar gym_id al del admin (salvo super_admin que puede elegir cualquiera).
    const finalGymId = isSuperAdmin(req.user) ? (gym_id ?? null) : getUserGymId(req.user);
    if (finalGymId == null) {
      return res.status(400).json({ error: 'No es posible determinar el gym destino' });
    }

    let inviteCodeValue = null;
    if (invite_code) {
      const check = assertInviteCodeAvailable({
        code: invite_code,
        excludeGymId: null,
        excludeTrainerId: null,
      });
      if (!check.ok) return res.status(409).json({ error: check.error });
      inviteCodeValue = check.code;
    }

    let newTrainer = TrainersDatabase.create({
      nombre,
      email,
      telefono: telefono || teléfono || null,
      especialidad,
      certificaciones: certificaciones || [],
      experiencia_años: experiencia_años || 0,
      gym_id: finalGymId,
      horario_disponible,
      tarifa_sesion: tarifa_sesion || 0,
      capacidad_usuarios: capacidad_usuarios ?? 50,
      invite_code: inviteCodeValue,
    });

    if (!newTrainer.invite_code) {
      const suggested = suggestTrainerInviteCode(newTrainer.id, newTrainer.nombre);
      const check = assertInviteCodeAvailable({
        code: suggested,
        excludeGymId: null,
        excludeTrainerId: newTrainer.id,
      });
      const finalCode = check.ok ? check.code : `${suggested}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      newTrainer = TrainersDatabase.update(newTrainer.id, { invite_code: finalCode }) || newTrainer;
    }

    res.status(201).json({ message: 'Entrenador creado exitosamente', trainer: newTrainer });
  } catch (error) {
    console.error('Error creando entrenador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateTrainer = (req, res) => {
  try {
    if (!isTrainerManager(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    const trainer = TrainersDatabase.getById(parseInt(req.params.id, 10));
    if (!trainer) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!canAccessEntity(req.user, trainer)) {
      return res.status(403).json({ error: 'No puedes modificar este entrenador' });
    }
    // No permitir mover trainer a otro gym salvo super_admin.
    const updates = { ...(req.body || {}) };
    if (!isSuperAdmin(req.user) && updates.gym_id !== undefined) {
      delete updates.gym_id;
    }
    if (updates.invite_code !== undefined) {
      const check = assertInviteCodeAvailable({
        code: updates.invite_code,
        excludeGymId: null,
        excludeTrainerId: parseInt(req.params.id, 10),
      });
      if (!check.ok) return res.status(409).json({ error: check.error });
      updates.invite_code = check.code;
    }
    const updatedTrainer = TrainersDatabase.update(parseInt(req.params.id, 10), updates);
    res.json({ message: 'Entrenador actualizado exitosamente', trainer: updatedTrainer });
  } catch (error) {
    console.error('Error actualizando entrenador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteTrainer = (req, res) => {
  try {
    if (!isTrainerManager(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    const trainer = TrainersDatabase.getById(parseInt(req.params.id, 10));
    if (!trainer) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!canAccessEntity(req.user, trainer)) {
      return res.status(403).json({ error: 'No puedes eliminar este entrenador' });
    }
    const deleted = TrainersDatabase.delete(parseInt(req.params.id, 10));
    if (!deleted) return res.status(404).json({ error: 'Entrenador no encontrado' });
    res.json({ message: 'Entrenador eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando entrenador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const BRANDING_FIELDS = [
  'logo_url', 'brand_name', 'brand_slug', 'white_label_enabled',
  'welcome_message', 'support_whatsapp', 'primary_color', 'secondary_color',
  'favicon_url', 'cover_url', 'social_links', 'custom_domain',
];

const canEditTrainerBranding = (req, trainer) => {
  if (!req.user || !trainer) return false;
  if (isSuperAdmin(req.user) || isTrainerManager(req.user)) return true;
  const tid = req.user.trainer_id ?? req.user.trainerId;
  return tid != null && String(tid) === String(trainer.id);
};

const getTrainerBranding = (req, res) => {
  try {
    const trainer = TrainersDatabase.getById(parseInt(req.params.id, 10));
    if (!trainer) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!canEditTrainerBranding(req, trainer) && !canAccessEntity(req.user, trainer)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    res.json({
      id: trainer.id,
      nombre: trainer.nombre,
      logo_url: trainer.logo_url || null,
      brand_name: trainer.brand_name || null,
      brand_slug: trainer.brand_slug || null,
      white_label_enabled: trainer.white_label_enabled === true,
      welcome_message: trainer.welcome_message || null,
      support_whatsapp: trainer.support_whatsapp || null,
      primary_color: trainer.primary_color || null,
      secondary_color: trainer.secondary_color || null,
      favicon_url: trainer.favicon_url || null,
      cover_url: trainer.cover_url || null,
      social_links: trainer.social_links || {},
      custom_domain: trainer.custom_domain || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo branding' });
  }
};

const updateTrainerBranding = (req, res) => {
  try {
    const trainer = TrainersDatabase.getById(parseInt(req.params.id, 10));
    if (!trainer) return res.status(404).json({ error: 'Entrenador no encontrado' });
    if (!canEditTrainerBranding(req, trainer)) {
      return res.status(403).json({ error: 'No puedes editar este branding' });
    }
    const updates = {};
    for (const key of BRANDING_FIELDS) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }
    const updated = TrainersDatabase.update(trainer.id, updates);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando branding' });
  }
};

module.exports = {
  getAllTrainers,
  getTrainerById,
  getTrainersByGym,
  searchBySpecialty,
  searchTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainerBranding,
  updateTrainerBranding,
};
