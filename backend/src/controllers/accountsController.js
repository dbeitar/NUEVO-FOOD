const AccountsDatabase = require('../models/AccountsDatabase');
const { hasRole } = require('../utils/accessControl');
const paymentNotify = require('../services/paymentNotifyService');
const paymentLinkController = require('./paymentLinkController');
const licenseService = require('../services/licenseService');
const userRepo = require('../db/repositories/userRepository');
const crypto = require('crypto');
const { isPlanAtCapacity } = require('../utils/planCapacity');

function canManageCommercialPlan(user, planKind = 'd28d') {
  if (hasRole(user, ['super_admin'])) return true;
  if (hasRole(user, ['admin_d28d']) && String(planKind) === 'd28d') return true;
  return false;
}

function computeServiceStatus(validUntil, estado) {
  if (estado && ['vencido', 'cancelado'].includes(String(estado).toLowerCase())) return 'vencido';
  if (!validUntil) return 'activo';
  const end = new Date(validUntil);
  const now = new Date();
  const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'vencido';
  if (days <= 14) return 'por_vencer';
  return 'activo';
}

const tokenGymId = (user) => {
  if (!user) return null;
  const raw = user.gym_id ?? user.gymId ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

// Obtener todas las cuentas (solo super_admin)
const getAllAccounts = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super admin puede ver todas las cuentas' });
    }

    const accounts = AccountsDatabase.getAll();
    res.json(accounts);
  } catch (error) {
    console.error('Error obteniendo cuentas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener cuenta del usuario autenticado
const getMyAccount = (req, res) => {
  try {
    const account = AccountsDatabase.getByUserId(req.user.id);
    if (!account) {
      return res.json({ hasAccount: false, account: null, plan_support: null });
    }
    const planData = AccountsDatabase.getPlanByNombre(account.plan);
    const { resolvePlanSupport } = require('../utils/whatsappSupport');
    const plan_support = resolvePlanSupport(planData);
    res.json({ hasAccount: true, account, plan_support });
  } catch (error) {
    console.error('Error obteniendo mi cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener cuentas por gimnasio (admin_gimnasio)
const getAccountsByGym = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_gimnasio', 'admin_marca'])) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const requestedGym = Number(req.params.gymId);
    if (!Number.isFinite(requestedGym)) {
      return res.status(400).json({ error: 'gymId inválido' });
    }

    // Admin de gimnasio solo puede consultar SU gimnasio.
    if (!hasRole(req.user, ['super_admin'])) {
      const ownGym = tokenGymId(req.user);
      if (ownGym && ownGym !== requestedGym) {
        return res.status(403).json({ error: 'No puedes consultar cuentas de otro gimnasio' });
      }
    }

    const accounts = AccountsDatabase.getByGymId(requestedGym);
    res.json(accounts);
  } catch (error) {
    console.error('Error obteniendo cuentas del gimnasio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener planes disponibles
const getPlans = (req, res) => {
  try {
    const programId = req.query.program_id ? String(req.query.program_id) : null;
    const kind = req.query.kind ? String(req.query.kind) : null;
    const visibleOnly = String(req.query.visible || '') === 'true';
    let planes = AccountsDatabase.getPlanes();
    if (kind) planes = planes.filter((p) => String(p.kind || 'd28d') === kind);
    if (programId) planes = planes.filter((p) => String(p.program_id || '') === programId);
    if (visibleOnly) {
      planes = planes.filter((p) => p.visible !== false && p.activo !== false);
    }
    planes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    res.json(planes);
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo plan (super_admin o admin_d28d para planes D28D)
const createPlan = async (req, res) => {
  try {
    const planKind = req.body?.kind || 'd28d';
    if (!canManageCommercialPlan(req.user, planKind)) {
      return res.status(403).json({ error: 'Sin permiso para crear este plan' });
    }
    if (planKind === 'training') {
      const existingTraining = AccountsDatabase.getPlanes().filter((p) => String(p.kind) === 'training');
      if (existingTraining.length >= 1) {
        return res.status(409).json({ error: 'Solo puede existir un plan comercial de Entrenadores' });
      }
    }
    if (planKind === 'food') {
      const existingFood = AccountsDatabase.getPlanes().filter((p) => String(p.kind) === 'food');
      if (existingFood.length >= 1) {
        return res.status(409).json({ error: 'Solo puede existir un plan comercial de FOOD_PLAN' });
      }
    }
    const {
      nombre,
      descripcion,
      program_id,
      precio_mensual,
      precio_mensual_usd,
      max_usuarios,
      features,
      module_access,
      is_couple,
      included_seats,
      cycle_ids,
      activo,
      visible,
      sort_order,
      cycles_count,
      support_whatsapp,
      support_name,
      support_message,
      support_activo,
    } = req.body || {};
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre del plan es requerido' });
    }
    const { DEFAULT_SUPPORT_PHONE, defaultMessageForPlan } = require('../utils/whatsappSupport');
    const created = await AccountsDatabase.addPlan({
      nombre,
      descripcion,
      program_id,
      kind: planKind,
      precio_mensual,
      precio_mensual_usd,
      max_usuarios,
      features,
      module_access,
      is_couple,
      included_seats,
      cycle_ids,
      activo: activo !== false,
      visible: visible !== false,
      sort_order: Number(sort_order) || 0,
      cycles_count: cycles_count != null ? Number(cycles_count) : null,
      support_whatsapp: support_whatsapp || DEFAULT_SUPPORT_PHONE,
      support_name: support_name || 'Soporte D28D',
      support_message: support_message || defaultMessageForPlan({ kind: planKind, program_id }),
      support_activo: support_activo !== false,
    });
    if (!created) {
      return res.status(409).json({ error: 'Plan ya existe o datos inválidos' });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar plan (super_admin o admin_d28d para planes D28D)
const updatePlan = async (req, res) => {
  try {
    const { nombre } = req.params;
    const existing = AccountsDatabase.getPlanByNombre(nombre);
    if (!existing) return res.status(404).json({ error: 'Plan no encontrado' });
    const planKind = req.body?.kind || existing.kind || 'd28d';
    if (!canManageCommercialPlan(req.user, planKind)) {
      return res.status(403).json({ error: 'Sin permiso para actualizar este plan' });
    }
    const updated = await AccountsDatabase.updatePlan(nombre, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Plan no encontrado o nombre duplicado' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error actualizando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar plan (super_admin o admin_d28d para planes D28D)
const deletePlan = async (req, res) => {
  try {
    const { nombre } = req.params;
    const existing = AccountsDatabase.getPlanByNombre(nombre);
    if (!existing) return res.status(404).json({ error: 'Plan no encontrado' });
    if (!canManageCommercialPlan(req.user, existing.kind || 'd28d')) {
      return res.status(403).json({ error: 'Sin permiso para eliminar este plan' });
    }
    const ok = await AccountsDatabase.deletePlan(nombre);
    if (!ok) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Duplicar plan comercial
const duplicatePlan = async (req, res) => {
  try {
    const { nombre } = req.params;
    const source = AccountsDatabase.getPlanByNombre(nombre);
    if (!source) return res.status(404).json({ error: 'Plan no encontrado' });
    if (!canManageCommercialPlan(req.user, source.kind || 'd28d')) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const newName = String(req.body?.nombre || `${source.nombre} (copia)`).trim();
    if (AccountsDatabase.getPlanByNombre(newName)) {
      return res.status(409).json({ error: 'Ya existe un plan con ese nombre' });
    }
    const { DEFAULT_SUPPORT_PHONE, defaultMessageForPlan } = require('../utils/whatsappSupport');
    const created = await AccountsDatabase.addPlan({
      ...source,
      nombre: newName,
      usuarios_activos: 0,
      support_whatsapp: source.support_whatsapp || DEFAULT_SUPPORT_PHONE,
      support_message: source.support_message || defaultMessageForPlan(source),
    });
    if (!created) return res.status(409).json({ error: 'No se pudo duplicar el plan' });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error duplicando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Reordenar planes (array { nombre, sort_order })
const reorderPlans = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'items requerido' });
    if (!canManageCommercialPlan(req.user, 'd28d')) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    for (const item of items) {
      const plan = AccountsDatabase.getPlanByNombre(item.nombre);
      if (!plan) continue;
      await AccountsDatabase.updatePlan(item.nombre, { sort_order: Number(item.sort_order) || 0 });
    }
    res.json({ success: true, plans: AccountsDatabase.getPlanes() });
  } catch (error) {
    console.error('Error reordenando planes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Servicios activos del usuario (multi-licencia)
const getMyServices = async (req, res) => {
  try {
    const ProgramSettingsDatabase = require('../models/ProgramSettingsDatabase');
    const licenses = await licenseService.listForUser(req.user.id);
    const account = AccountsDatabase.getByUserId(req.user.id);
    const programs = ProgramSettingsDatabase.getAll();
    const { resolvePlanSupport } = require('../utils/whatsappSupport');
    const moduleAccess = await licenseService.resolveModuleAccess(
      req.user.id,
      req.user?.module_access || {},
    );
    const services = [];
    const covered = new Set();

    if (account) {
      const planData = AccountsDatabase.getPlanByNombre(account.plan);
      const svc = planData?.kind === 'food' ? 'food' : planData?.kind === 'training' ? 'training' : 'd28d';
      const program = programs.find((p) => p.id === planData?.program_id);
      services.push({
        service: svc,
        label: svc === 'food' ? 'FOOD' : svc === 'training' ? 'TRAINING' : 'D28D',
        plan: account.plan,
        program_id: planData?.program_id || null,
        program_name: program?.name || null,
        valid_from: account.fecha_inicio,
        valid_until: account.fecha_vencimiento,
        status: computeServiceStatus(account.fecha_vencimiento, account.estado),
        plan_support: resolvePlanSupport(planData),
        couple_invite_code: account.couple_invite_code || null,
      });
      covered.add(svc);
    }

    const licenseToService = {
      d28d: 'd28d',
      live_classes: 'd28d',
      food_plan: 'food',
      nutrition: 'food',
      training: 'training',
    };
    for (const lic of licenses) {
      const svc = licenseToService[lic.module_code];
      if (!svc || covered.has(svc)) continue;
      if (!lic.active) continue;
      const programId = moduleAccess?.d28d_program || null;
      const program = programId ? programs.find((p) => p.id === programId) : null;
      services.push({
        service: svc,
        label: svc === 'food' ? 'FOOD' : svc === 'training' ? 'TRAINING' : 'D28D',
        plan: null,
        program_id: programId,
        program_name: program?.name || null,
        valid_from: lic.valid_from,
        valid_until: lic.valid_until,
        status: computeServiceStatus(lic.valid_until, lic.active ? 'activo' : 'vencido'),
        plan_support: resolvePlanSupport(null),
        couple_invite_code: null,
      });
      covered.add(svc);
    }

    res.json({ services, module_access: moduleAccess });
  } catch (error) {
    console.error('Error obteniendo servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nueva suscripción
const createAccount = async (req, res) => {
  try {
    const {
      plan,
      gym_id: bodyGymId,
      trainer_id: bodyTrainerId,
      cycle_id: bodyCycleId,
      currency: bodyCurrency,
    } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan es requerido' });
    }

    const planData = AccountsDatabase.getPlanByNombre(plan);
    if (!planData) {
      return res.status(400).json({ error: 'Plan no válido' });
    }
    if (isPlanAtCapacity(planData)) {
      return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
    }
    if (planData.activo === false || planData.visible === false) {
      return res.status(400).json({ error: 'Este plan no está disponible para contratación' });
    }

    const existingAccount = AccountsDatabase.getByUserId(req.user.id);
    if (existingAccount) {
      return res.status(409).json({ error: 'Ya tienes una suscripción activa' });
    }

    // Reglas de tenant:
    // - usuario_final / coach NO pueden elegir gym/trainer arbitrarios; quedan
    //   amarrados al gym del JWT (o null si no tienen gym asignado).
    // - super_admin sí puede asignar manualmente cualquier gym/trainer.
    const jwtGymId = tokenGymId(req.user);
    const jwtTrainerId = req.user?.trainer_id || null;
    let finalGymId = jwtGymId;
    let finalTrainerId = jwtTrainerId;
    if (hasRole(req.user, ['super_admin'])) {
      const parsedGym = (bodyGymId === '' || bodyGymId === null || bodyGymId === undefined)
        ? null
        : Number(bodyGymId);
      finalGymId = Number.isFinite(parsedGym) ? parsedGym : null;
      finalTrainerId = bodyTrainerId || null;
    }

    const metodoPago = req.body.metodoPago || 'pago_sede';
    const defer = paymentNotify.shouldDeferActivation(metodoPago);
    const moduleCode = req.body.module_code || 'd28d';
    const parsedCycleId = (bodyCycleId === '' || bodyCycleId === null || bodyCycleId === undefined)
      ? null
      : Number(bodyCycleId);
    const cycle_id = Number.isFinite(parsedCycleId) ? parsedCycleId : null;
    const allowedCycles = Array.isArray(planData.cycle_ids) ? planData.cycle_ids : [];
    if (cycle_id && allowedCycles.length && !allowedCycles.includes(cycle_id)) {
      return res.status(400).json({ error: 'El ciclo seleccionado no está permitido para este plan' });
    }
    if (String(planData.kind || 'd28d') === 'd28d' && allowedCycles.length && !cycle_id) {
      return res.status(400).json({ error: 'Debes seleccionar un ciclo D28D para este plan' });
    }

    const currency = String(bodyCurrency || 'COP').toUpperCase() === 'USD' ? 'USD' : 'COP';
    const chargedAmount = currency === 'USD' && planData.precio_mensual_usd > 0
      ? planData.precio_mensual_usd
      : planData.precio_mensual;

    const newAccount = await AccountsDatabase.create({
      user_id: req.user.id,
      plan,
      gym_id: finalGymId,
      trainer_id: finalTrainerId,
      cycle_id,
      estado: defer ? paymentNotify.mapPaymentState(metodoPago) : 'activo',
      sesiones_restantes: plan === 'premium' ? 24 : plan === 'elite' ? 48 : 0,
      sesiones_totales: plan === 'premium' ? 24 : plan === 'elite' ? 48 : 0,
      precio_mensual: chargedAmount,
      fecha_vencimiento: defer
        ? new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000)
        : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
      metodoPago,
    });

    // Plan de pareja: generar código adicional de un solo uso
    if (!defer && planData?.is_couple) {
      const raw = crypto.randomBytes(9).toString('base64url').toUpperCase();
      const code = `PAREJA-${raw}`.slice(0, 32);
      const withCode = await AccountsDatabase.update(newAccount.id, { couple_invite_code: code });
      if (withCode) newAccount.couple_invite_code = withCode.couple_invite_code || code;
    }

    await AccountsDatabase.incPlanUsers(plan);

    if (!defer) {
      const mergedAccess = {
        ...(req.user?.module_access || {}),
        ...(planData.module_access || {}),
      };
      if (String(planData.kind || 'd28d') === 'd28d' && planData.program_id) {
        mergedAccess.d28d_program = planData.program_id;
      }
      await userRepo.patchLegacy(req.user.id, { module_access: mergedAccess });
      await licenseService.applyInviteModules(req.user.id, mergedAccess, 'plan_purchase');
    }

    let payment_url = null;
    if (metodoPago === 'wompi_online') {
      const methods = await paymentLinkController.getModuleMethods(moduleCode);
      const wompi = methods.methods?.find((m) => m.id === 'wompi_online');
      payment_url = wompi?.url || paymentNotify.WOMPI_DEFAULT;
    }

    if (defer) {
      await paymentNotify.notifyPaymentPending({
        payerUserId: req.user.id,
        accountId: newAccount.id,
        moduleCode,
        method: metodoPago,
        planName: plan,
        amount: planData.precio_mensual,
        gymId: finalGymId,
        trainerId: finalTrainerId,
      });
    }

    res.status(201).json({
      message: defer
        ? 'Solicitud registrada. Un administrador confirmará tu pago o completa el pago en línea.'
        : 'Suscripción creada exitosamente',
      account: newAccount,
      payment_url,
      metodo_pago: metodoPago,
      pending: defer,
    });
  } catch (error) {
    console.error('Error creando suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Redimir invitación de pareja: crea cuenta vinculada al titular
const redeemCoupleInvite = async (req, res) => {
  try {
    const couple_code = String(req.body?.couple_code || '').trim().toUpperCase();
    if (!couple_code) return res.status(400).json({ error: 'couple_code requerido' });

    // Buscar cuenta titular por código
    const all = AccountsDatabase.getAll() || [];
    const primary = all.find((a) => String(a.couple_invite_code || '').toUpperCase() === couple_code);
    if (!primary) return res.status(404).json({ error: 'Código no válido o expirado' });
    if (primary.couple_invite_used_by_user_id) return res.status(409).json({ error: 'Este código ya fue usado' });
    if (primary.user_id === req.user.id) return res.status(400).json({ error: 'No puedes usar tu propio código' });

    // Si el titular no está activo/vigente, no permitir
    const until = primary.fecha_vencimiento ? new Date(primary.fecha_vencimiento) : null;
    if (primary.estado !== 'activo' || (until && until.getTime() < Date.now())) {
      return res.status(409).json({ error: 'El plan del titular no está vigente' });
    }

    const existing = AccountsDatabase.getByUserId(req.user.id);
    if (existing) return res.status(409).json({ error: 'Ya tienes una suscripción activa' });

    const planData = AccountsDatabase.getPlanByNombre(primary.plan);
    if (!planData) return res.status(500).json({ error: 'Plan del titular no encontrado' });

    // Crear cuenta para invitado (vinculada)
    const created = await AccountsDatabase.create({
      user_id: req.user.id,
      plan: primary.plan,
      primary_account_id: primary.id,
      gym_id: primary.gym_id ?? null,
      trainer_id: primary.trainer_id ?? null,
      cycle_id: primary.cycle_id ?? null,
      estado: 'activo',
      sesiones_restantes: primary.sesiones_restantes ?? 0,
      sesiones_totales: primary.sesiones_totales ?? 0,
      precio_mensual: primary.precio_mensual ?? planData.precio_mensual ?? 0,
      fecha_vencimiento: primary.fecha_vencimiento ?? null,
      metodoPago: 'pareja',
      couple_invite_code: null,
    });

    await AccountsDatabase.update(primary.id, {
      couple_invite_used_by_user_id: req.user.id,
    });

    // Sincronizar licencias del invitado según module_access del plan
    const actor = await userRepo.findById(req.user.id);
    const merged = { ...(actor?.module_access || {}), ...(planData.module_access || {}) };
    await licenseService.applyInviteModules(req.user.id, merged, 'couple_invite');

    return res.status(201).json({ success: true, data: { account: created } });
  } catch (e) {
    console.error('redeemCoupleInvite:', e);
    return res.status(500).json({ error: 'Error redimiendo código de pareja' });
  }
};

// Actualizar suscripción
const updateAccount = async (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_gimnasio', 'admin_marca'])) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }

    const accountId = Number(req.params.id);
    if (!Number.isFinite(accountId)) {
      return res.status(400).json({ error: 'id inválido' });
    }
    const account = AccountsDatabase.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    // Admin gym solo puede modificar cuentas de SU gym.
    if (!hasRole(req.user, ['super_admin'])) {
      const ownGym = tokenGymId(req.user);
      if (ownGym && Number(account.gym_id) !== ownGym) {
        return res.status(403).json({ error: 'No puedes modificar cuentas de otro gimnasio' });
      }
    }

    // No permitimos saltar de gym o de usuario desde este endpoint si no eres super_admin.
    const updates = { ...req.body };
    if (!hasRole(req.user, ['super_admin'])) {
      delete updates.gym_id;
      delete updates.user_id;
    }

    const updatedAccount = await AccountsDatabase.update(accountId, updates);

    if (!updatedAccount) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    res.json({ message: 'Cuenta actualizada exitosamente', account: updatedAccount });
  } catch (error) {
    console.error('Error actualizando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cancelar suscripción
const cancelAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que sea el dueño o admin
    const account = AccountsDatabase.getById(parseInt(id));
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    if (req.user.id !== account.user_id && !hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cuenta' });
    }

    const cancelled = await AccountsDatabase.delete(parseInt(id));

    if (!cancelled) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    await AccountsDatabase.decPlanUsers(account.plan);

    res.json({ message: 'Suscripción cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Renovar plan
const renewPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPlan } = req.body;

    if (!newPlan) {
      return res.status(400).json({ error: 'Nuevo plan es requerido' });
    }

    // Verificar que sea el dueño o admin
    const account = AccountsDatabase.getById(parseInt(id));
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    if (req.user.id !== account.user_id && !hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'No tienes permiso para renovar esta cuenta' });
    }

    const planData = AccountsDatabase.getPlanByNombre(newPlan);
    if (!planData) {
      return res.status(400).json({ error: 'Plan no válido' });
    }
    if (newPlan !== account.plan && isPlanAtCapacity(planData)) {
      return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
    }

    const prevPlan = account.plan;
    const renewedAccount = AccountsDatabase.renovarPlan(parseInt(id), newPlan);

    if (!renewedAccount) {
      return res.status(400).json({ error: 'No se pudo renovar el plan' });
    }

    if (newPlan !== prevPlan) {
      await AccountsDatabase.decPlanUsers(prevPlan);
      await AccountsDatabase.incPlanUsers(newPlan);
    }

    res.json({ message: 'Plan renovado exitosamente', account: renewedAccount });
  } catch (error) {
    console.error('Error renovando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener cuentas próximas a vencer
const getExpiringAccounts = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador', 'admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista'])) {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    let expiring = AccountsDatabase.getExpiringSoon();
    if (!hasRole(req.user, ['super_admin', 'admin_d28d'])) {
      const gymId = req.user.gym_id;
      const trainerId = req.user.trainer_id || req.user.id;
      if (hasRole(req.user, ['admin_gimnasio', 'admin_marca']) && gymId) {
        expiring = expiring.filter((a) => Number(a.gym_id) === Number(gymId));
      } else {
        expiring = expiring.filter((a) => Number(a.trainer_id) === Number(trainerId));
      }
    }
    res.json(expiring);
  } catch (error) {
    console.error('Error obteniendo cuentas próximas a vencer:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Usar sesión (decrementar sesiones restantes)
const useSession = async (req, res) => {
  try {
    const accountId = Number(req.params.id);
    if (!Number.isFinite(accountId)) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const account = AccountsDatabase.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    // Solo el dueño o super_admin puede consumir una sesión.
    if (req.user.id !== account.user_id && !hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'No puedes consumir sesiones de otra cuenta' });
    }

    if (account.sesiones_restantes <= 0) {
      return res.status(400).json({ error: 'No tienes sesiones disponibles' });
    }

    const updated = await AccountsDatabase.update(accountId, {
      sesiones_restantes: account.sesiones_restantes - 1,
    });

    res.json({
      message: 'Sesión registrada exitosamente',
      account: updated,
    });
  } catch (error) {
    console.error('Error usando sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllAccounts,
  getMyAccount,
  getMyServices,
  getAccountsByGym,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  duplicatePlan,
  reorderPlans,
  createAccount,
  redeemCoupleInvite,
  updateAccount,
  cancelAccount,
  renewPlan,
  getExpiringAccounts,
  useSession,
};
