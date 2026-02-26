const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
      rol = 'usuario_final',
    } = req.body;

    // Validar datos requeridos
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // Verificar si el usuario ya existe
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Generar contraseña segura
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Insertar usuario en la base de datos
    const result = await pool.query(
      `INSERT INTO users (nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, clave_hash, rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nombre, email, rol`,
      [nombre, email, teléfono, fecha_nacimiento, peso, altura, objetivo, hashedPassword, rol]
    );

    const user = result.rows[0];

    // TODO: Enviar contraseña por email (SendGrid)
    console.log(`Contraseña temporal para ${email}: ${tempPassword}`);

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Se envió una clave temporal al correo.',
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
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.clave_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generar JWT
    const secret = process.env.JWT_SECRET || 'secret_key_dev_fallback';
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
    const result = await pool.query(
      'SELECT id, nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, rol FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registerUser, loginUser, getProfile };
