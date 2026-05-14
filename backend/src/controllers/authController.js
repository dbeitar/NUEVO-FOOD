const db = require('../config/dbClient');
const userDB = require('../models/UserDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { hydrateAccess } = require('../utils/accessControl');

const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

// Registrar nuevo usuario
const registerUser = async (req, res) => {
  try {
    const {
      nombre,
      email,
      teléfono,
      fecha_nacimiento,
      peso,
      altura,
      objetivo,
      password,
      rol = 'usuario_final',
      medidas_biomecanicas,
      experiencia,
      metodo_entrenamiento
    } = req.body;

    // Validar datos requeridos
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // Verificar si el usuario ya existe
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userExists.rows && userExists.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Generar o usar contraseña proporcionada. Las temporales NUNCA se loggean
    // ni se devuelven; el usuario debe restablecerla por flujo de admin.
    const rawPassword = password && String(password).length >= 8
      ? String(password)
      : require('crypto').randomBytes(9).toString('base64url');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Insertar usuario en la base de datos
    const insertSql =
      `INSERT INTO users (nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, clave_hash, rol, medidas_biomecanicas, experiencia, metodo_entrenamiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, nombre, email, rol`;
    const result = await db.query(insertSql, [nombre, email, teléfono, fecha_nacimiento, peso, altura, objetivo, hashedPassword, rol, medidas_biomecanicas ? JSON.stringify(medidas_biomecanicas) : null, experiencia || 'principiante', metodo_entrenamiento || null]);

    let user;
    // Si es MySQL, no soporta RETURNING: consultar por insertId
    if (result && typeof result.insertId !== 'undefined') {
      const read = await db.query('SELECT id, nombre, email, rol FROM users WHERE id = $1', [result.insertId]);
      user = read.rows[0];
    } else {
      user = result.rows[0];
    }

    // TODO (futuro): enviar contraseña temporal por email (SendGrid).
    // Hoy NO se loggea ni se devuelve por seguridad; admin la restablece manualmente.

    res.status(201).json({
      message: password
        ? 'Usuario registrado exitosamente.'
        : 'Usuario registrado. El administrador debe asignar una contraseña inicial.',
      user,
    });
  } catch (error) {
    console.error('Error registrando usuario:', error);
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
    if (USE_DB_AUTH) {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows ? result.rows[0] : result[0];
    } else {
      user = userDB.getByEmail(email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    if (!user.clave_hash) {
      return res.status(401).json({ error: 'Cuenta sin contraseña asignada. Contacta al administrador.' });
    }

    const validPassword = await bcrypt.compare(password, user.clave_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generar JWT
    const access = hydrateAccess(user);
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, roles: access.roles, permissions: access.permissions, module_access: access.module_access, gym_id: user.gym_id || user.gymId || null, trainer_id: user.trainer_id || null },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

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
      },
    });
  } catch (error) {
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
      // Seleccionar solo los campos necesarios
      const access = hydrateAccess(user);
      user = {
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
      };
    }

    res.json(user);
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
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error reseteando contraseña:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registerUser, loginUser, getProfile, adminResetPassword };
