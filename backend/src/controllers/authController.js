const db = require('../config/dbClient');
const userDB = require('../models/UserDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { hydrateAccess } = require('../utils/accessControl');
const { enrichUserAccess } = require('../utils/userAccessEnrichment');
const licenseService = require('../services/licenseService');
const userRepo = require('../db/repositories/userRepository');
const { auditAuth } = require('../services/authAudit');
const { useRelationalStorage } = require('../utils/storageMode');
const { getCoachTrainerId } = require('../utils/coachScope');

const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true' || useRelationalStorage();

function signAccessToken(user, access) {
  const trainer_id = getCoachTrainerId(user) ?? user.trainer_id ?? user.trainerId ?? null;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      rol: user.rol,
      roles: access.roles,
      permissions: access.permissions,
      module_access: access.module_access,
      gym_id: user.gym_id || user.gymId || null,
      trainer_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

// Registrar nuevo usuario
const registerUser = async (req, res) => {
  try {
    const {
      nombre,
      email,
      password,
      teléfono,
      telefono,
      fecha_nacimiento,
      peso,
      altura,
      objetivo,
      genero = null,
      rol = 'usuario_final',
      tiene_restricciones = false,
      restricciones_detalles = '',
      medidas_biomecanicas,
      experiencia,
      metodo_entrenamiento,
      module_access,
      gym_id,
      trainer_id,
      invite_code,
    } = req.body || {};

    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    let finalPassword = password;
    let usedTemp = false;
    if (!finalPassword || String(finalPassword).length < 8) {
      finalPassword = require('crypto').randomBytes(9).toString('base64url');
      usedTemp = true;
    }

    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const { resolveInviteCodeAsync } = require('../utils/inviteResolver');
    const resolvedInvite = invite_code ? await resolveInviteCodeAsync(invite_code) : null;
    const inviteData = resolvedInvite?.ok ? resolvedInvite.data : null;

    const finalModuleAccess = module_access && typeof module_access === 'object'
      ? module_access
      : (inviteData?.module_access || {});

    const { hydrateAccess, normalizeRoles } = require('../utils/accessControl');
    const roles = normalizeRoles({ rol: 'usuario_final', roles: ['usuario_final'] });
    const access = hydrateAccess({ rol: 'usuario_final', roles, module_access: finalModuleAccess });

    const created = await userRepo.createLegacy({
      nombre,
      email,
      telefono: teléfono || telefono || null,
      fecha_nacimiento,
      peso,
      altura,
      objetivo,
      genero,
      tiene_restricciones: Boolean(tiene_restricciones),
      restricciones_detalles: restricciones_detalles || '',
      clave_hash: hashedPassword,
      rol: 'usuario_final',
      roles: access.roles,
      permissions: access.permissions,
      gym_id: gym_id ?? inviteData?.gym_id ?? null,
      trainer_id: trainer_id ?? inviteData?.trainer_id ?? null,
      module_access: finalModuleAccess,
      medidas_biomecanicas,
      experiencia,
      metodo_entrenamiento,
    });

    await licenseService.applyInviteModules(created.id, finalModuleAccess, 'register');

    const foodProvisioning = require('../services/foodProvisioningService');
    const trainingProvisioning = require('../services/trainingProvisioningService');
    foodProvisioning.provisionFoodUser({
      userId: created.id,
      email: created.email,
      nombre: created.nombre,
      password: finalPassword,
      moduleAccess: finalModuleAccess,
      telefono: teléfono || telefono,
      peso,
      altura,
      genero,
      source: 'register',
    }).catch((e) => console.warn('[register] food provision:', e.message));

    trainingProvisioning.provisionTrainingUser({
      userId: created.id,
      moduleAccess: finalModuleAccess,
      source: 'register',
    }).catch((e) => console.warn('[register] training provision:', e.message));

    try {
      const comms = require('../services/communicationCenterService');
      const mod = finalModuleAccess?.training
        ? 'training'
        : (finalModuleAccess?.food_plan || finalModuleAccess?.nutrition)
          ? 'food'
          : 'd28d';
      await comms.dispatchEvent({
        evento: 'user.registered',
        modulo: mod,
        userId: created.id,
        targetEmail: created.email,
        vars: {
          user: { id: created.id, nombre: created.nombre, email: created.email, rol },
          module_access: finalModuleAccess,
          gym_id: gym_id ?? inviteData?.gym_id ?? null,
          trainer_id: trainer_id ?? inviteData?.trainer_id ?? null,
        },
      });
    } catch (e) {
      console.warn('comm.user.registered:', e.message);
    }

    res.status(201).json({
      message: usedTemp
        ? 'Usuario registrado. Se generó una clave temporal; pídela al administrador o usa "Olvidé mi contraseña".'
        : 'Usuario registrado exitosamente.',
      user: { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol },
    });
  } catch (error) {
    console.error('Error registrando usuario:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Login de usuario
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    let user;
    if (useRelationalStorage()) {
      user = await userRepo.findByEmail(email);
    } else if (USE_DB_AUTH) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows ? result.rows[0] : result[0];
    } else {
      user = userDB.getByEmail(email);
    }

    if (!user) {
      auditAuth(null, 'auth.failed', 'Login fallido — usuario no existe', { email }, 'warn');
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    if (!user.clave_hash) {
      auditAuth(user.id, 'auth.failed', 'Login fallido — sin contraseña', { email }, 'warn');
      return res.status(401).json({ error: 'Cuenta sin contraseña asignada. Contacta al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.clave_hash);
    if (!validPassword) {
      auditAuth(user.id, 'auth.failed', 'Login fallido — contraseña incorrecta', { email }, 'warn');
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const access = await enrichUserAccess(user);
    const token = signAccessToken(user, access);
    auditAuth(user.id, 'auth.login', 'Login exitoso', { email: user.email, roles: access.roles });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        roles: access.roles,
        permissions: access.permissions,
        module_access: access.module_access,
        licenses: access.licenses || [],
        gym_id: user.gym_id || user.gymId || null,
        trainer_id: getCoachTrainerId(user) ?? user.trainer_id ?? null,
      },
    });
  } catch (error) {
    const { auditAuth } = require('../services/authAudit');
    auditAuth(null, 'auth.failed', 'Error interno en login', { email: req.body?.email }, 'error');
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    let user;

    if (USE_DB_AUTH) {
      const result = await db.query('SELECT id, nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, rol FROM users WHERE id = $1', [req.user.id]);
      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      user = result.rows[0];
    } else {
      user = userDB.getById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
    }

    const access = await enrichUserAccess(user);
    res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono,
      fecha_nacimiento: user.fecha_nacimiento,
      peso: user.peso,
      altura: user.altura,
      objetivo: user.objetivo,
      rol: user.rol,
      roles: access.roles,
      permissions: access.permissions,
      module_access: access.module_access,
      licenses: access.licenses || [],
      gym_id: user.gym_id || user.gymId || null,
      trainer_id: getCoachTrainerId(user) ?? user.trainer_id ?? null,
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Admin: resetear contraseña de un usuario por email
const adminResetPassword = async (req, res) => {
  try {
    const role = req.user?.rol;
    if (!['super_admin', 'admin_gimnasio', 'admin_marca'].includes(role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const { email, password } = req.body || {};
    if (!email || !password || String(password).length < 8) {
      return res.status(400).json({ error: 'Email y nueva contraseña (>=8) son requeridos' });
    }
    const userQ = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userQ.rows || userQ.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [hashed, email]);
    const uid = userQ.rows[0].id;
    auditAuth(req.user?.id, 'auth.password_change', 'Contraseña restablecida por admin', {
      target_user_id: uid,
      target_email: email,
    });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error reseteando contraseña:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const refreshSession = async (req, res) => {
  try {
    const user = useRelationalStorage()
      ? await userRepo.findById(req.user.id)
      : userDB.getById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const access = await enrichUserAccess(user);
    const token = signAccessToken(user, access);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        roles: access.roles,
        permissions: access.permissions,
        module_access: access.module_access,
        licenses: access.licenses || [],
        gym_id: user.gym_id || user.gymId || null,
        trainer_id: user.trainer_id || null,
      },
    });
  } catch (e) {
    console.error('refreshSession:', e.message);
    res.status(500).json({ error: 'Error renovando sesión' });
  }
};

const logoutUser = (req, res) => {
  auditAuth(req.user?.id, 'auth.logout', 'Logout', {});
  res.json({ success: true, message: 'Sesión cerrada' });
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  adminResetPassword,
  refreshSession,
  logoutUser,
};
