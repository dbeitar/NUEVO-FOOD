require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./src/routes/authRoutes');
const calculatorRoutes = require('./src/routes/calculatorRoutes');
const foodRoutes = require('./src/routes/foodRoutes');
const foodLogRoutes = require('./src/routes/foodLogRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const gymRoutes = require('./src/routes/gymRoutes');
const trainersRoutes = require('./src/routes/trainersRoutes');
const accountsRoutes = require('./src/routes/accountsRoutes');
const planRoutes = require('./src/routes/planRoutes');
const authMiddleware = require('./src/middleware/auth');
const paymentsRoutes = require('./src/routes/paymentsRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

// Datos temporales en memoria (mientras no tenemos BD)
const users = [];

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));

// Seed de desarrollo: super admin por defecto
if (!USE_DB_AUTH && process.env.DEV_SEED_ADMIN !== 'false') {
  const exists = users.find(u => u.email === 'admin@foodplan.local');
  if (!exists) {
    const hash = bcryptjs.hashSync('admin123', 10);
    users.push({
      id: 1,
      nombre: 'Super Admin',
      email: 'admin@foodplan.local',
      clave_hash: hash,
      rol: 'super_admin',
      gym_id: null,
      trainer_id: null,
    });
    console.log('⚙️  Usuario seed creado: admin@foodplan.local / admin123 (super_admin)');
  }
}

// Rutas de Autenticación
if (USE_DB_AUTH) {
  app.use('/api/auth', authRoutes);
} else {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { nombre, email, password, teléfono, fecha_nacimiento, peso, altura, objetivo, rol = 'usuario_final', gym_id = null, trainer_id = null } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      const hashedPassword = await bcryptjs.hash(password, 10);

      const newUser = {
        id: users.length + 1,
        nombre,
        email,
        telefono: teléfono,
        fecha_nacimiento,
        peso,
        altura,
        objetivo,
        clave_hash: hashedPassword,
        rol,
        gym_id,
        trainer_id,
      };

      users.push(newUser);

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: { id: newUser.id, nombre, email, rol },
      });
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

      const user = users.find(u => u.email === email);

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
      const user = users.find(u => u.id === decoded.id);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

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
      });
    } catch (error) {
      res.status(403).json({ error: 'Token inválido o expirado' });
    }
  });
}

app.get('/api/admin/users', authMiddleware, (req, res) => {
  try {
    if (!req.user || !['super_admin', 'admin_gimnasio'].includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para ver usuarios' });
    }
    const list = users.map(u => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, gym_id: u.gym_id || null, trainer_id: u.trainer_id || null }));
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
    const { nombre, email, password, rol = 'usuario_final', gym_id = null, trainer_id = null } = req.body || {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    if (['super_admin', 'admin_gimnasio'].includes(rol) && req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede crear usuarios administradores' });
    }
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      nombre,
      email,
      clave_hash: hashedPassword,
      rol,
      gym_id,
      trainer_id,
    };
    users.push(newUser);
    res.status(201).json({ success: true, data: { id: newUser.id, nombre, email, rol, gym_id, trainer_id } });
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
    if (['super_admin', 'admin_gimnasio'].includes(rol) && req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede asignar roles administrativos' });
    }
    const idx = users.findIndex(u => u.id === parseInt(id, 10));
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    users[idx].rol = rol;
    res.json({ success: true, data: { id: users[idx].id, nombre: users[idx].nombre, email: users[idx].email, rol: users[idx].rol } });
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
    const { gym_id = null, trainer_id = null } = req.body || {};
    const idx = users.findIndex(u => u.id === parseInt(id, 10));
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    users[idx].gym_id = gym_id || null;
    users[idx].trainer_id = trainer_id || null;
    res.json({ success: true, data: { id: users[idx].id, gym_id: users[idx].gym_id, trainer_id: users[idx].trainer_id } });
  } catch (e) {
    res.status(500).json({ error: 'Error asignando usuario' });
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

// Rutas de Módulo 2: Maestros de Administración
app.use('/api/gyms', gymRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/payments', paymentsRoutes);

app.post('/api/dev/make-me-super', authMiddleware, (req, res) => {
  try {
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    users[idx].rol = 'super_admin';
    res.json({ success: true, rol: users[idx].rol });
  } catch (e) {
    res.status(500).json({ error: 'Error elevando permisos' });
  }
});
// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  if (USE_DB_AUTH) {
    console.log('🔐 Autenticación usando Base de Datos (PostgreSQL)');
  } else {
    console.log('⚠️  MODO DESARROLLO - Autenticación en memoria (se pierden al reiniciar)');
  }
});
