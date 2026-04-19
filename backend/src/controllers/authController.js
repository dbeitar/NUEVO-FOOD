const db = require('../config/dbClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    // Generar o usar contraseña proporcionada
    const rawPassword = password && String(password).length >= 6 ? String(password) : Math.random().toString(36).slice(-8);
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

    // TODO: Enviar contraseña por email (SendGrid)
    if (process.env.NODE_ENV !== 'production' && !password) {
      console.log(`Contraseña temporal para ${email}: ${rawPassword}`);
    }

    res.status(201).json({
      message: password ? 'Usuario registrado exitosamente.' : 'Usuario registrado exitosamente. Se envió una clave temporal al correo.',
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Búscar usuario por email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    const user = result.rows ? result.rows[0] : result[0];

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.clave_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
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
    const result = await db.query('SELECT id, nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, rol FROM users WHERE id = $1', [req.user.id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Admin: resetear contraseña de un usuario por email
const adminResetPassword = async (req, res) => {
  try {
    if (!req.user || req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email y nueva contraseña (≥6) son requeridos' });
    }
    const userQ = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!userQ.rows || userQ.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const upd = await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [hashed, email]);
    // Para MySQL, rows.affectedRows; para PG, upd.rowCount
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registerUser, loginUser, getProfile, adminResetPassword };
