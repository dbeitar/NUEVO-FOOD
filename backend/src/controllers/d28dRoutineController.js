const routineService = require('../services/d28dRoutineService');

const PLATFORM_ROLES = ['super_admin', 'admin_d28d'];
const HOST_ROLES = [...PLATFORM_ROLES, 'entrenador_d28d'];

function hasRole(user, roles) {
  const list = Array.isArray(user?.roles) ? user.roles : [];
  if (list.length) return roles.some((r) => list.includes(r));
  return roles.includes(user?.rol);
}

function canManage(user) {
  return hasRole(user, PLATFORM_ROLES);
}

function canViewHost(user) {
  return hasRole(user, HOST_ROLES);
}

function sendError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({ success: false, message: err.message || 'Error interno' });
}

exports.getMeta = async (_req, res) => {
  try {
    return res.json({ success: true, data: routineService.meta() });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listCategories = async (_req, res) => {
  try {
    const data = await routineService.listCategories();
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.upsertCategory = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.upsertCategory(req.body);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listRoutines = async (req, res) => {
  if (!canViewHost(req.user) && !canManage(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const data = await routineService.listRoutines(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.getRoutine = async (req, res) => {
  if (!canViewHost(req.user) && !canManage(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const data = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!data) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.getHistory = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.getHistory(req.params.rootId);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.createRoutine = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.createRoutine(req.body, req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.updateRoutine = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const newVersion = req.body.new_version === true || req.query.new_version === 'true';
    const data = await routineService.updateRoutine(req.params.id, req.body, {
      newVersion,
      userId: req.user.id,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.duplicateRoutine = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.duplicateRoutine(req.params.id, req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.archiveRoutine = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.archiveRoutine(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.importBundled = async (req, res) => {
  if (!canManage(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.importBundled(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.addHostNote = async (req, res) => {
  if (!canViewHost(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.addHostNote({
      routineId: req.body.routine_id,
      liveClassId: req.body.live_class_id,
      userId: req.user.id,
      texto: req.body.texto,
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listHostNotes = async (req, res) => {
  if (!canViewHost(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.listHostNotes({
      routineId: req.query.routine_id,
      liveClassId: req.query.live_class_id,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};
