const AccountsDatabase = require('../models/AccountsDatabase');
const { hasRole } = require('../utils/accessControl');

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
      return res.status(404).json({ error: 'No tienes una suscripción activa' });
    }
    
    res.json(account);
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
    const planes = AccountsDatabase.getPlanes();
    res.json(planes);
  } catch (error) {
    console.error('Error obteniendo planes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nuevo plan (solo super_admin)
const createPlan = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super admin puede crear planes' });
    }
    const { nombre, descripcion, precio_mensual, features } = req.body || {};
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre del plan es requerido' });
    }
    const created = AccountsDatabase.addPlan({ nombre, descripcion, precio_mensual, features });
    if (!created) {
      return res.status(409).json({ error: 'Plan ya existe o datos inválidos' });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar plan (solo super_admin)
const updatePlan = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super admin puede actualizar planes' });
    }
    const { nombre } = req.params;
    const updated = AccountsDatabase.updatePlan(nombre, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Plan no encontrado o nombre duplicado' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error actualizando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar plan (solo super_admin)
const deletePlan = (req, res) => {
  try {
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super admin puede eliminar planes' });
    }
    const { nombre } = req.params;
    const ok = AccountsDatabase.deletePlan(nombre);
    if (!ok) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear nueva suscripción
const createAccount = (req, res) => {
  try {
    const { plan, gym_id: bodyGymId, trainer_id: bodyTrainerId } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan es requerido' });
    }

    const planData = AccountsDatabase.getPlanByNombre(plan);
    if (!planData) {
      return res.status(400).json({ error: 'Plan no válido' });
    }
    if (typeof planData.max_usuarios === 'number') {
      if (planData.usuarios_activos >= planData.max_usuarios) {
        return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
      }
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

    const newAccount = AccountsDatabase.create({
      user_id: req.user.id,
      plan,
      gym_id: finalGymId,
      trainer_id: finalTrainerId,
      estado: 'activo',
      sesiones_restantes: plan === 'premium' ? 24 : plan === 'elite' ? 48 : 0,
      sesiones_totales: plan === 'premium' ? 24 : plan === 'elite' ? 48 : 0,
      precio_mensual: planData.precio_mensual,
      fecha_vencimiento: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
      metodoPago: req.body.metodoPago || 'pendiente',
    });

    AccountsDatabase.incPlanUsers(plan);

    res.status(201).json({ 
      message: 'Suscripción creada exitosamente', 
      account: newAccount 
    });
  } catch (error) {
    console.error('Error creando suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar suscripción
const updateAccount = (req, res) => {
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

    const updatedAccount = AccountsDatabase.update(accountId, updates);

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
const cancelAccount = (req, res) => {
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

    const cancelled = AccountsDatabase.delete(parseInt(id));

    if (!cancelled) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    AccountsDatabase.decPlanUsers(account.plan);

    res.json({ message: 'Suscripción cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Renovar plan
const renewPlan = (req, res) => {
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
    if (typeof planData.max_usuarios === 'number') {
      if (planData.usuarios_activos >= planData.max_usuarios && newPlan !== account.plan) {
        return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
      }
    }

    const prevPlan = account.plan;
    const renewedAccount = AccountsDatabase.renovarPlan(parseInt(id), newPlan);

    if (!renewedAccount) {
      return res.status(400).json({ error: 'No se pudo renovar el plan' });
    }

    if (newPlan !== prevPlan) {
      AccountsDatabase.decPlanUsers(prevPlan);
      AccountsDatabase.incPlanUsers(newPlan);
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
    if (!hasRole(req.user, ['super_admin'])) {
      return res.status(403).json({ error: 'Solo super admin puede ver esta información' });
    }

    const expiring = AccountsDatabase.getExpiringSoon();
    res.json(expiring);
  } catch (error) {
    console.error('Error obteniendo cuentas próximas a vencer:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Usar sesión (decrementar sesiones restantes)
const useSession = (req, res) => {
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

    const updated = AccountsDatabase.update(accountId, {
      sesiones_restantes: account.sesiones_restantes - 1,
    });

    res.json({ 
      message: 'Sesión registrada exitosamente', 
      account: updated 
    });
  } catch (error) {
    console.error('Error usando sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAllAccounts,
  getMyAccount,
  getAccountsByGym,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  createAccount,
  updateAccount,
  cancelAccount,
  renewPlan,
  getExpiringAccounts,
  useSession,
};
