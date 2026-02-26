require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userDB = require('./src/models/UserDatabase');
const authRoutes = require('./src/routes/authRoutes');
const calculatorRoutes = require('./src/routes/calculatorRoutes');
const foodRoutes = require('./src/routes/foodRoutes');
const foodLogRoutes = require('./src/routes/foodLogRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const gymRoutes = require('./src/routes/gymRoutes');
const trainersRoutes = require('./src/routes/trainersRoutes');
const accountsRoutes = require('./src/routes/accountsRoutes');
const planRoutes = require('./src/routes/planRoutes');
const recipeRoutes = require('./src/routes/recipeRoutes');
const authMiddleware = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

// En modo DEV usamos almacenamiento JSON persistente (UserDatabase)

// Middleware
app.use(express.json());
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5178,http://localhost:5180')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Rutas de Autenticación
if (USE_DB_AUTH) {
  app.use('/api/auth', authRoutes);
} else {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { nombre, email, password, teléfono, telefono, fecha_nacimiento, peso, altura, objetivo, genero = null, rol = 'usuario_final', tiene_restricciones = false, restricciones_detalles = '' } = req.body;

      if (!nombre || !email || !password) {
        // Alineado con cambios de la tarde: permitir contraseña temporal si no llega password
        if (!nombre || !email) {
          return res.status(400).json({ error: 'Nombre y email son requeridos' });
        }
      }
      // Validar género obligatorio en inscripción
      const validGeneros = ['masculino', 'femenino'];
      if (!genero || !validGeneros.includes(genero)) {
        return res.status(400).json({ error: 'El género es obligatorio y debe ser masculino o femenino' });
      }

      let finalPassword = password;
      if (!finalPassword || String(finalPassword).length < 6) {
        // Generar contraseña temporal de 8 caracteres
        finalPassword = Math.random().toString(36).slice(-8);
        console.log(`Contraseña temporal generada para ${email}: ${finalPassword}`);
      }

      if (userDB.getByEmail(email)) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      const hashedPassword = await bcryptjs.hash(finalPassword, 10);

      const created = userDB.create({
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
        rol,
      });

      // Si la contraseña fue temporal, informamos en el mensaje (el front no depende de este texto)
      const usedTemp = !password || String(password).length < 6;
      const message = usedTemp
        ? 'Usuario registrado exitosamente. Se generó una clave temporal.'
        : 'Usuario registrado exitosamente';
      res.status(201).json({ message, user: { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol } });
    } catch (error) {
      console.error('Error registrando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const user = userDB.getByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
      }

      const validPassword = await bcryptjs.compare(password, user.clave_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Email o contraseña incorrectos' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        process.env.JWT_SECRET || 'secret_key_dev',
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
  });

  app.get('/api/auth/profile', (req, res) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_dev');
      const user = userDB.getById(decoded.id);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono || null,
        fecha_nacimiento: user.fecha_nacimiento,
        peso: user.peso,
        altura: user.altura,
        objetivo: user.objetivo,
        genero: user.genero || null,
        tiene_restricciones: user.tiene_restricciones ?? false,
        restricciones_detalles: user.restricciones_detalles || '',
        rol: user.rol,
        gym_id: user.gym_id || user.gymId || null,
        trainer_id: user.trainer_id || null,
      });
    } catch (error) {
      res.status(403).json({ error: 'Token inválido o expirado' });
    }
  });
}

// Admin: Usuarios y Roles (modo memoria)
app.get('/api/admin/users', authMiddleware, (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para ver usuarios' });
    }
    const list = userDB.getAll().map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      gym_id: u.gym_id || u.gymId || null,
      trainer_id: u.trainer_id || null,
      planId: u.planId || null,
    }));
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ error: 'Error listando usuarios' });
  }
});

app.post('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para crear usuarios' });
    }
    const { nombre, email, password, rol = 'usuario_final', gym_id, trainer_id, planId, telefono, fecha_nacimiento, peso, altura, objetivo } = req.body || {};
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    if (userDB.getByEmail(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const pwd = password && String(password).length >= 6 ? password : Math.random().toString(36).slice(-8);
    const hashedPassword = await bcryptjs.hash(pwd, 10);
    const created = userDB.create({
      nombre,
      email,
      clave_hash: hashedPassword,
      rol,
      telefono: telefono || null,
      fecha_nacimiento: fecha_nacimiento || null,
      peso: peso ?? null,
      altura: altura ?? null,
      objetivo: objetivo || null,
      gym_id: gym_id ?? null,
      trainer_id: trainer_id ?? null,
      gymId: gym_id ?? null,
      planId: planId || null,
    });
    res.status(201).json({ success: true, data: { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol } });
  } catch (e) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.put('/api/admin/users/:id/role', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body || {};
    const allowedRoles = ['super_admin', 'admin_gimnasio', 'entrenador', 'usuario_final'];
    if (!allowedRoles.includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    // Permisos: solo super_admin puede asignar roles admin
    if (['super_admin', 'admin_gimnasio'].includes(rol) && req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede asignar roles administrativos' });
    }
    // Buscar usuario
    const target = userDB.getById(parseInt(id, 10));
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    userDB.update(target.id, { rol });
    const updated = userDB.getById(target.id);
    res.json({ success: true, data: { id: updated.id, nombre: updated.nombre, email: updated.email, rol: updated.rol } });
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando rol' });
  }
});

app.put('/api/admin/users/:id/assign', authMiddleware, (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para asignar' });
    }
    const { id } = req.params;
    const { gym_id = null, trainer_id = null, planId = undefined } = req.body || {};
    const user = userDB.getById(parseInt(id, 10));
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const updates = { gym_id, trainer_id, gymId: gym_id, ...(planId !== undefined ? { planId } : {}) };
    const updated = userDB.update(user.id, updates);
    res.json({ success: true, data: { id: updated.id, gym_id: updated.gym_id || updated.gymId || null, trainer_id: updated.trainer_id || null, planId: updated.planId || null } });
  } catch (e) {
    res.status(500).json({ error: 'Error asignando usuario' });
  }
});

app.put('/api/admin/users/:id/password', authMiddleware, async (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para cambiar contraseñas' });
    }
    const { id } = req.params;
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Contraseña mínima de 6 caracteres' });
    }
    const user = userDB.getById(parseInt(id, 10));
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const hash = await bcryptjs.hash(password, 10);
    userDB.update(user.id, { clave_hash: hash });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar' });
    }
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    if (req.user.id === targetId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    const ok = userDB.delete(targetId);
    if (!ok) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (e) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend Food Plan corriendo correctamente ✅' });
});

// Rutas de calculadora
app.use('/api/calculator', calculatorRoutes);

// Rutas de alimentos (CRUD + búsqueda por barcode)
app.use('/api/foods', foodRoutes);

// Rutas de food log (registro diario de alimentos consumidos)
app.use('/api/food-log', foodLogRoutes);

// Rutas de IA (sugerencias inteligentes de alimentos)
app.use('/api/ai', aiRoutes);

// Plan del Usuario
app.use('/api/plan', planRoutes);

// Recetas
app.use('/api/recipes', recipeRoutes);

// Rutas de Módulo 2: Maestros de Administración
app.use('/api/gyms', gymRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/accounts', accountsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    if (USE_DB_AUTH) {
      console.log('🔐 Autenticación usando Base de Datos (PostgreSQL) ');
    } else {
      console.log('🗂️  MODO DESARROLLO - Autenticación persistente en JSON (backend/data/users.json) ');
    }
  });
}

module.exports = app;
