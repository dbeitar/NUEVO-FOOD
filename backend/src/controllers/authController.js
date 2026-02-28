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
      gym_id,
      trainer_id,
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

    // Generar contraseña segura o usar la proporcionada
    const passwordToHash = req.body.password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    // Sanitize inputs (convert empty strings to null)
    const sanitizedFecha = fecha_nacimiento === '' ? null : fecha_nacimiento;
    const sanitizedPeso = peso === '' ? null : peso;
    const sanitizedAltura = altura === '' ? null : altura;
    const sanitizedGym = gym_id === '' || gym_id === 'null' ? null : gym_id;
    const sanitizedTrainer = trainer_id === '' || trainer_id === 'null' ? null : trainer_id;

    // Insertar usuario en la base de datos
    const result = await pool.query(
      `INSERT INTO users (nombre, email, telefono, fecha_nacimiento, peso, altura, objetivo, clave_hash, rol, id_gimnasio, id_entrenador)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, nombre, email, rol`,
      [nombre, email, teléfono, sanitizedFecha, sanitizedPeso, sanitizedAltura, objetivo, hashedPassword, rol, sanitizedGym, sanitizedTrainer]
    );

    const user = result.rows[0];

    // AUTO-ASSIGN A DEFAULT PLAN (requested by user to ensure functionality)
    try {
      const defaultPlan = await pool.query('SELECT id FROM plans LIMIT 1');
      if (defaultPlan.rows.length > 0) {
        const planId = defaultPlan.rows[0].id;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 days

        await pool.query(
          `INSERT INTO meal_plans (
            id_plan, id_usuario, fecha_inicio, fecha_fin, 
            calorias_diarias, proteinas, carbohidratos, grasas, 
            configuracion_calculadora
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            planId, 
            user.id, 
            startDate, 
            endDate,
            2000, // Default calories
            150,  // Default protein
            200,  // Default carbs
            65,   // Default fat
            JSON.stringify({ distribution: 'balanced', meals: 3 })
          ]
        );
        console.log(`Auto-assigned plan ${planId} to user ${user.id}`);
      }
    } catch (assignError) {
      console.warn('Error auto-assigning plan:', assignError);
      // Don't fail registration if plan assignment fails
    }

    // TODO: Enviar contraseña por email (SendGrid)
    if (!req.body.password) {
      console.log(`Contraseña temporal para ${email}: ${passwordToHash}`);
    }

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
