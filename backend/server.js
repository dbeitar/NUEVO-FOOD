require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userDB = require('./src/models/UserDatabase');
const db = require('./src/config/dbClient');
const authRoutes = require('./src/routes/authRoutes');
const { adminResetPassword } = require('./src/controllers/authController');
const calculatorRoutes = require('./src/routes/calculatorRoutes');
const foodRoutes = require('./src/routes/foodRoutes');
const foodLogRoutes = require('./src/routes/foodLogRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const gymRoutes = require('./src/routes/gymRoutes');
const trainersRoutes = require('./src/routes/trainersRoutes');
const accountsRoutes = require('./src/routes/accountsRoutes');
const planRoutes = require('./src/routes/planRoutes');
const recipeRoutes = require('./src/routes/recipeRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const trainingRoutes = require('./src/routes/trainingRoutes');
const liveClassRoutes = require('./src/routes/liveClassRoutes');
const fitnessTestRoutes = require('./src/routes/fitnessTestRoutes');
const ecosystemRoutes = require('./src/routes/ecosystemRoutes');
const trainerMastersRoutes = require('./src/routes/trainerMastersRoutes');
const seedD28DData = require('./src/seedD28DData');
const authMiddleware = require('./src/middleware/auth');
const { hydrateAccess } = require('./src/utils/accessControl');

const app = express();
const PORT = process.env.PORT || 3001;
const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

async function syncDemoAndCoreAccounts() {
  try {
    const demoEmail = (process.env.DEMO_USER_EMAIL || 'demo+20260302@foodplan.local').trim();
    const coreEmails = (process.env.CORE_ACCOUNT_EMAILS || 'admin@foodplan.local,cliente@foodplan.local,cesar.gomez@cloudfarmers.app')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const demoPassword = process.env.DEMO_PASSWORD || 'Demo!234';
    const corePassword = process.env.CORE_PASSWORD || 'Admin!234';
    const demoHash = await bcryptjs.hash(demoPassword, 10);
    const coreHash = await bcryptjs.hash(corePassword, 10);
    if (USE_DB_AUTH) {
      for (const email of coreEmails) {
        try {
          await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [coreHash, email]);
        } catch { }
      }
      try {
        const r = await db.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
        const exists = (r.rows && r.rows.length > 0);
        if (exists) {
          await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [demoHash, demoEmail]);
        } else {
          await db.query('INSERT INTO users (nombre, email, clave_hash, rol) VALUES ($1, $2, $3, $4)', ['Demo Público', demoEmail, demoHash, 'usuario_final']);
        }
      } catch { }
    } else {
      for (const email of coreEmails) {
        const u = userDB.getByEmail(email);
        if (u) userDB.update(u.id, { clave_hash: coreHash });
      }
      const du = userDB.getByEmail(demoEmail);
      if (du) userDB.update(du.id, { clave_hash: demoHash });
      else userDB.create({ nombre: 'Demo Público', email: demoEmail, clave_hash: demoHash, rol: 'usuario_final' });
    }
  } catch { }
}

// En modo DEV usamos almacenamiento JSON persistente (UserDatabase)

// Middleware
app.use(express.json());
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5180',
  'http://[::1]:5173',
  'http://[::1]:5174',
  'http://[::1]:5175',
  'http://[::1]:5176',
  'http://[::1]:5177',
  'http://[::1]:5178',
  'http://[::1]:5180',
  'https://plan-de-alimentacion-acero.vercel.app',
  'https://food-plan-steel.vercel.app'
];
const envOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));
// Responder preflight se maneja con el middleware de CORS global
app.use(morgan('dev'));

// Configuración de Rate Limiting
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 solicitudes por windowMs
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo después de 15 minutos.'
  });
  app.use(apiLimiter);
} else {
  // En desarrollo, no limitar
  console.log('⚠️  Rate limit desactivado en desarrollo');
}

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.post('/api/test', (req, res) => {
  res.json({ received: req.body, method: req.method, url: req.url });
});

// Herramientas de desarrollo (solo fuera de producción)
if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
  app.get('/api/dev/users', (req, res) => {
    const list = userDB.getAll().map(u => ({ id: u.id, email: u.email, rol: u.rol }));
    res.json({ data: list });
  });
  app.post('/api/dev/users/reset-passwords', async (req, res) => {
    try {
      const emails = req.body?.emails || [
        'admin@foodplan.local',
        'cliente@foodplan.local',
        'cesar.gomez@cloudfarmers.app'
      ];
      const password = req.body?.password || 'admin123';
      const hash = await bcryptjs.hash(password, 10);
      const updated = [];
      for (const email of emails) {
        const u = userDB.getByEmail(email);
        if (u) {
          userDB.update(u.id, { clave_hash: hash });
          updated.push({ id: u.id, email: u.email });
        }
      }
      res.json({ success: true, updated, password });
    } catch (e) {
      res.status(500).json({ error: 'Error reseteando contraseñas' });
    }
  });
  app.post('/api/dev/sync-demo', async (req, res) => {
    try {
      await syncDemoAndCoreAccounts();
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Error sincronizando cuentas demo' });
    }
  });
}

// Middleware para validar códigos de empleado (temporal)
app.use('/api/auth', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/register') {
    console.log('Auth middleware - path:', req.path, 'body:', req.body);
    // Validar que tenga código de empleado
    if (!req.body.codigo_empleado) {
      console.log('No codigo_empleado provided');
      return res.status(400).json({ error: 'Código de empleado requerido' });
    }
    // Por ahora, aceptar cualquier código de empleado
    if (req.body.codigo_empleado) {
      console.log('codigo_empleado valid, continuing');
      // Código válido, continuar
      next();
    } else {
      console.log('codigo_empleado invalid');
      return res.status(400).json({ error: 'Código de empleado no encontrado' });
    }
  } else {
    next();
  }
});

app.use('/auth', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/register') {
    if (!req.body.codigo_empleado) {
      return res.status(400).json({ error: 'Código de empleado requerido' });
    }
    if (req.body.codigo_empleado) {
      next();
    } else {
      return res.status(400).json({ error: 'Código de empleado no encontrado' });
    }
  } else {
    next();
  }
});

// Rutas de Autenticación
if (USE_DB_AUTH) {
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);
} else {
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { nombre, email, password, teléfono, telefono, fecha_nacimiento, peso, altura, objetivo, genero = null, rol = 'usuario_final', tiene_restricciones = false, restricciones_detalles = '', medidas_biomecanicas, experiencia, metodo_entrenamiento } = req.body;

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
        medidas_biomecanicas,
        experiencia,
        metodo_entrenamiento
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
  app.post('/auth/register', async (req, res) => {
    try {
      const { nombre, email, password, teléfono, telefono, fecha_nacimiento, peso, altura, objetivo, genero = null, rol = 'usuario_final', tiene_restricciones = false, restricciones_detalles = '', medidas_biomecanicas, experiencia, metodo_entrenamiento } = req.body;
      if (!nombre || !email || !password) {
        if (!nombre || !email) {
          return res.status(400).json({ error: 'Nombre y email son requeridos' });
        }
      }
      const validGeneros = ['masculino', 'femenino'];
      if (!genero || !validGeneros.includes(genero)) {
        return res.status(400).json({ error: 'El género es obligatorio y debe ser masculino o femenino' });
      }
      let finalPassword = password;
      if (!finalPassword || String(finalPassword).length < 6) {
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
        medidas_biomecanicas,
        experiencia,
        metodo_entrenamiento
      });
      const usedTemp = !password || String(password).length < 6;
      const message = usedTemp ? 'Usuario registrado exitosamente. Se generó una clave temporal.' : 'Usuario registrado exitosamente';
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

      const access = hydrateAccess(user);
      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol, roles: access.roles, permissions: access.permissions, module_access: access.module_access, gym_id: user.gym_id || user.gymId || null, trainer_id: user.trainer_id || null },
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
          roles: access.roles,
          permissions: access.permissions,
          module_access: access.module_access,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  app.post('/auth/login', async (req, res) => {
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
      const access = hydrateAccess(user);
      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol, roles: access.roles, permissions: access.permissions, module_access: access.module_access, gym_id: user.gym_id || user.gymId || null, trainer_id: user.trainer_id || null },
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
          roles: access.roles,
          permissions: access.permissions,
          module_access: access.module_access,
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

      const access = hydrateAccess(user);
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
        roles: access.roles,
        permissions: access.permissions,
        module_access: access.module_access,
        gym_id: user.gym_id || user.gymId || null,
        trainer_id: user.trainer_id || null,
      });
    } catch (error) {
      res.status(403).json({ error: 'Token inválido o expirado' });
    }
  });
  app.get('/auth/profile', (req, res) => {
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
      const access = hydrateAccess(user);
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
        roles: access.roles,
        permissions: access.permissions,
        module_access: access.module_access,
        gym_id: user.gym_id || user.gymId || null,
        trainer_id: user.trainer_id || null,
      });
    } catch (error) {
      res.status(403).json({ error: 'Token inválido o expirado' });
    }
  });
}

// Admin: reset de contraseña universal (funciona en ambos modos)
app.post('/api/auth/admin/reset-password', authMiddleware, async (req, res) => {
  try {
    const role = req.user?.rol;
    if (!['admin', 'super_admin', 'admin_gimnasio'].includes(role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    if (USE_DB_AUTH) {
      return adminResetPassword(req, res);
    }
    const { email, password } = req.body || {};
    if (!email || !password || String(password).length < 6) {
      return res.status(400).json({ error: 'Email y nueva contraseña (≥6) son requeridos' });
    }
    const target = userDB.getByEmail(email);
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const hash = await bcryptjs.hash(password, 10);
    userDB.update(target.id, { clave_hash: hash });
    return res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (e) {
    console.error('Error universal reset-password:', e);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});
app.post('/auth/admin/reset-password', authMiddleware, async (req, res) => {
  // Alias sin prefijo /api
  return app._router.handle({ ...req, url: '/api/auth/admin/reset-password', method: 'POST' }, res, () => { });
});

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
      roles: u.roles || [u.rol].filter(Boolean),
      permissions: u.permissions || [],
      module_access: u.module_access || {},
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
    const { nombre, email, password, rol = 'usuario_final', roles, permissions, module_access, gym_id, trainer_id, planId, telefono, fecha_nacimiento, peso, altura, objetivo } = req.body || {};
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
      roles: Array.isArray(roles) && roles.length ? roles : [rol],
      permissions: Array.isArray(permissions) ? permissions : [],
      module_access: module_access || {},
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
    const { rol, roles, permissions, module_access } = req.body || {};
    const allowedRoles = ['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'admin_food_plan', 'admin_training', 'admin_gym', 'entrenador', 'nutricionista', 'usuario_final'];
    const nextRoles = Array.isArray(roles) && roles.length ? roles : [rol];
    if (!nextRoles.every((role) => allowedRoles.includes(role))) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    // Permisos: solo super_admin puede asignar roles admin
    if (nextRoles.some((role) => ['super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d', 'admin_food_plan', 'admin_training', 'admin_gym'].includes(role)) && req.user.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo super_admin puede asignar roles administrativos' });
    }
    // Buscar usuario
    const target = userDB.getById(parseInt(id, 10));
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    userDB.update(target.id, { rol: rol || nextRoles[0], roles: nextRoles, permissions: Array.isArray(permissions) ? permissions : target.permissions, module_access: module_access || target.module_access || {} });
    const updated = userDB.getById(target.id);
    res.json({ success: true, data: { id: updated.id, nombre: updated.nombre, email: updated.email, rol: updated.rol, roles: updated.roles, permissions: updated.permissions, module_access: updated.module_access } });
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
app.use('/api/admin', adminRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/live-classes', liveClassRoutes);
app.use('/api/fitness-tests', fitnessTestRoutes);
app.use('/api/ecosystem', ecosystemRoutes);
app.use('/api/trainer-masters', trainerMastersRoutes);

app.use('/calculator', calculatorRoutes);
app.use('/foods', foodRoutes);
app.use('/food-log', foodLogRoutes);
app.use('/ai', aiRoutes);
app.use('/plan', planRoutes);
app.use('/recipes', recipeRoutes);
app.use('/gyms', gymRoutes);
app.use('/trainers', trainersRoutes);
app.use('/accounts', accountsRoutes);
app.use('/admin', adminRoutes);
app.use('/training', trainingRoutes);
app.use('/live-classes', liveClassRoutes);
app.use('/fitness-tests', fitnessTestRoutes);
app.use('/ecosystem', ecosystemRoutes);
app.use('/trainer-masters', trainerMastersRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

syncDemoAndCoreAccounts();
try {
  const seeded = seedD28DData();
  console.log(`🏷️  Datos demo D28D listos (gym ${seeded.gym_id})`);
} catch (error) {
  console.error('Error preparando datos demo D28D:', error);
}
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  if (USE_DB_AUTH) {
    console.log('🔐 Autenticación usando Base de Datos (PostgreSQL) ');
  } else {
    console.log('🗂️  MODO DESARROLLO - Autenticación persistente en JSON (backend/data/users.json) ');
  }
});
