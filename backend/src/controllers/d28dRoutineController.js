const routineService = require('../services/d28dRoutineService');
const {
  isCoachUser,
  getCoachTrainerId,
  coachCategoryStorageKey,
  coachCategoryDisplayName,
  isCoachCategoryStorageKey,
} = require('../utils/coachScope');
const {
  canListRoutines,
  canListRoutinesForLive,
  canManagePlatform,
  canManageCoachRoutines,
  canReadRoutine,
  canWriteRoutine,
  buildListFilter,
  defaultScopeForCreate,
  trainerIdForCreate,
  isPlatformRoutine,
  isD28dHost,
} = require('../utils/d28dRoutineAccess');

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

exports.listCategories = async (req, res) => {
  try {
    const coachTid = isCoachUser(req.user) && !canManagePlatform(req.user)
      ? getCoachTrainerId(req.user)
      : null;
    const raw = await routineService.listCategories();
    let data = raw;
    if (coachTid != null) {
      data = raw
        .map((c) => {
          const display = coachCategoryDisplayName(c.nombre, coachTid);
          if (display) return { ...c, nombre: display, coach_owned: true };
          return null;
        })
        .filter(Boolean);
    } else if (!canManagePlatform(req.user)) {
      data = raw.filter((c) => !isCoachCategoryStorageKey(c.nombre));
    }
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.upsertCategory = async (req, res) => {
  const coachTid = getCoachTrainerId(req.user);
  const coachOnly = isCoachUser(req.user) && !canManagePlatform(req.user);
  if (coachOnly) {
    if (coachTid == null) {
      return res.status(400).json({ success: false, message: 'Cuenta sin entrenador vinculado' });
    }
    if (!canManageCoachRoutines(req.user)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
  } else if (!canManagePlatform(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const body = { ...req.body };
    if (coachOnly) {
      const storageName = coachCategoryStorageKey(coachTid, body.nombre);
      if (!storageName) {
        return res.status(400).json({ success: false, message: 'Nombre de categoría requerido' });
      }
      body.nombre = storageName;
    }
    const data = await routineService.upsertCategory(body);
    const display = coachOnly ? coachCategoryDisplayName(data.nombre, coachTid) : data.nombre;
    return res.json({ success: true, data: { ...data, nombre: display || data.nombre } });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listForSchedule = async (req, res) => {
  if (!canListRoutinesForLive(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const data = await routineService.listForSchedule();
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listRoutines = async (req, res) => {
  if (!canListRoutines(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const filter = buildListFilter(req.user, req.query);
    const data = await routineService.listRoutines(req.query, filter);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.getRoutine = async (req, res) => {
  if (!canListRoutines(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const data = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!data) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    if (!canReadRoutine(req.user, data)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.getHistory = async (req, res) => {
  try {
    const data = await routineService.getHistory(req.params.rootId);
    const visible = data.filter((r) => canReadRoutine(req.user, r));
    if (!visible.length && !canManagePlatform(req.user)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    return res.json({ success: true, data: visible });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.createRoutine = async (req, res) => {
  if (!canManageCoachRoutines(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
  try {
    const body = { ...req.body, scope: req.body.scope || defaultScopeForCreate(req.user) };
    if (isPlatformRoutine({ scope: body.scope }) && !canManagePlatform(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo D28D puede crear plantillas de plataforma' });
    }
    const tid = trainerIdForCreate(req.user);
    if (isCoachUser(req.user) && tid == null) {
      return res.status(400).json({ success: false, message: 'Tu cuenta no tiene entrenador vinculado (trainer_id)' });
    }
    const data = await routineService.createRoutine(body, req.user.id, tid);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.updateRoutine = async (req, res) => {
  try {
    const current = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!current) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    if (!canWriteRoutine(req.user, current)) {
      return res.status(403).json({ success: false, message: 'Sin permiso para editar esta rutina' });
    }
    const body = { ...req.body };
    if (isPlatformRoutine(current) && body.scope && body.scope !== 'd28d_platform' && !canManagePlatform(req.user)) {
      return res.status(403).json({ success: false, message: 'No puedes cambiar el ámbito de una plantilla D28D' });
    }
    const newVersion = req.body.new_version === true || req.query.new_version === 'true';
    const data = await routineService.updateRoutine(req.params.id, body, {
      newVersion,
      userId: req.user.id,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.duplicateRoutine = async (req, res) => {
  try {
    const current = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!current) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    if (!canWriteRoutine(req.user, current)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    const data = await routineService.duplicateRoutine(req.params.id, req.user.id);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.copyToCoach = async (req, res) => {
  if (!canManagePlatform(req.user)) {
    return res.status(403).json({ success: false, message: 'Solo administración D28D puede copiar plantillas' });
  }
  try {
    const source = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!source) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    if (!isPlatformRoutine(source)) {
      return res.status(400).json({ success: false, message: 'Solo se pueden copiar plantillas D28D de plataforma' });
    }
    if (!canReadRoutine(req.user, source)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    const data = await routineService.duplicateRoutine(req.params.id, req.user.id, {
      scope: 'coach_wl',
      nombre: `${source.nombre} (mi copia)`,
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.archiveRoutine = async (req, res) => {
  try {
    const current = await routineService.getRoutine(req.params.id, { allowAnyVersion: true });
    if (!current) return res.status(404).json({ success: false, message: 'Rutina no encontrada' });
    if (!canWriteRoutine(req.user, current)) {
      return res.status(403).json({ success: false, message: 'Sin permiso' });
    }
    const data = await routineService.archiveRoutine(req.params.id);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.importBundled = async (req, res) => {
  if (!canManagePlatform(req.user)) return res.status(403).json({ success: false, message: 'Sin permiso' });
  try {
    const data = await routineService.importBundled(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.addHostNote = async (req, res) => {
  if (!isD28dHost(req.user) && !canManagePlatform(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
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
  if (!isD28dHost(req.user) && !canManagePlatform(req.user)) {
    return res.status(403).json({ success: false, message: 'Sin permiso' });
  }
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
