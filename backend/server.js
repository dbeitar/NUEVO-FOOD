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
const programRoutes = require('./src/routes/programRoutes');
const seedD28DData = require('./src/seedD28DData');
const authMiddleware = require('./src/middleware/auth');
const { hydrateAccess } = require('./src/utils/accessControl');

const tracingMiddleware = require('./src/middleware/tracing');
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = String(process.env.NODE_ENV || 'development').toLowerCase();
const IS_PROD = NODE_ENV === 'production';

// === Validación de configuración crítica al arrancar =========================
// El servidor se niega a arrancar si JWT_SECRET no está definido o es débil.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || String(JWT_SECRET).trim().length < 32) {
  console.error('[CONFIG] JWT_SECRET no definido o demasiado corto (>=32 chars). Aborto arranque.');
  console.error('[CONFIG] Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

// === CORS (lista blanca configurable) ========================================
const corsOriginEnv = (process.env.CORS_ORIGIN || '').trim();
const corsAllowList = corsOriginEnv
  ? corsOriginEnv.split(',').map((s) => s.trim()).filter(Boolean)
  : (IS_PROD ? [] : ['http://localhost:5175', 'http://127.0.0.1:5175']);
if (IS_PROD && corsAllowList.length === 0) {
  console.error('[CONFIG] CORS_ORIGIN obligatorio en producción. Aborto arranque.');
  process.exit(1);
}

const corsOptions = {
  origin: (origin, cb) => {
    // Permitir requests sin origin (curl, healthchecks, mismo origen)
    if (!origin) return cb(null, true);
    if (corsAllowList.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin no permitido por CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id', 'X-Requested-With'],
};

app.use(cors(corsOptions));

app.use(tracingMiddleware);
app.use(express.json());

// Logger HTTP (silencioso en test; combinado en prod; dev en desarrollo)
if (NODE_ENV !== 'test') {
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));
}

const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';
const ENABLE_DEV_ROUTES = !IS_PROD && String(process.env.ENABLE_DEV_ROUTES || '').toLowerCase() === 'true';
const SEED_DEMO = String(process.env.SEED_DEMO || '').toLowerCase() === 'true';

async function syncDemoAndCoreAccounts() {
  // Opt-in. Sin SEED_DEMO=true este bloque no toca usuarios.
  if (!SEED_DEMO) return;
  // Exigir contraseñas explícitas: nunca usar fallbacks como 'Admin!234'.
  const demoPassword = (process.env.DEMO_PASSWORD || '').trim();
  const corePassword = (process.env.CORE_PASSWORD || '').trim();
  if (!demoPassword || !corePassword || demoPassword.length < 8 || corePassword.length < 8) {
    console.warn('[SEED_DEMO] DEMO_PASSWORD y CORE_PASSWORD requeridas (>=8 chars). Sync abortado.');
    return;
  }
  try {
    const demoEmail = (process.env.DEMO_USER_EMAIL || 'demo+20260302@foodplan.local').trim();
    const coreEmails = (process.env.CORE_ACCOUNT_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const demoHash = await bcryptjs.hash(demoPassword, 10);
    const coreHash = await bcryptjs.hash(corePassword, 10);
    if (USE_DB_AUTH) {
      for (const email of coreEmails) {
        try {
          await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [coreHash, email]);
        } catch { /* noop */ }
      }
      try {
        const r = await db.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
        const exists = r.rows && r.rows.length > 0;
        if (exists) {
          await db.query('UPDATE users SET clave_hash = $1 WHERE email = $2', [demoHash, demoEmail]);
        } else {
          await db.query('INSERT INTO users (nombre, email, clave_hash, rol) VALUES ($1, $2, $3, $4)', ['Demo Público', demoEmail, demoHash, 'usuario_final']);
        }
      } catch { /* noop */ }
    } else {
      for (const email of coreEmails) {
        const u = userDB.getByEmail(email);
        if (u) userDB.update(u.id, { clave_hash: coreHash });
      }
      const du = userDB.getByEmail(demoEmail);
      if (du) userDB.update(du.id, { clave_hash: demoHash });
      else userDB.create({ nombre: 'Demo Público', email: demoEmail, clave_hash: demoHash, rol: 'usuario_final' });
    }
    console.log('[SEED_DEMO] Sincronización completada.');
  } catch (e) {
    console.error('[SEED_DEMO] Error:', e.message);
  }
}

// Rate limiting global en producción
if (IS_PROD) {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(apiLimiter);
}

// Rate limit reforzado para auth en cualquier entorno
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Health checks (públicos, mínimos)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Endpoints de desarrollo: SOLO si NODE_ENV != production Y ENABLE_DEV_ROUTES=true.
// Sin password por defecto. Sin echo de body.
if (ENABLE_DEV_ROUTES) {
  console.log('[DEV] Endpoints /api/dev/* habilitados (no usar en producción)');
  app.get('/api/dev/users', (_req, res) => {
    const list = userDB.getAll().map((u) => ({ id: u.id, email: u.email, rol: u.rol }));
    res.json({ data: list });
  });
  app.post('/api/dev/users/reset-passwords', async (req, res) => {
    try {
      const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];
      const password = String(req.body?.password || '').trim();
      if (emails.length === 0) {
        return res.status(400).json({ error: 'Lista de emails requerida' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password requerida y >= 8 chars' });
      }
      const hash = await bcryptjs.hash(password, 10);
      const updated = [];
      for (const email of emails) {
        const u = userDB.getByEmail(email);
        if (u) {
          userDB.update(u.id, { clave_hash: hash });
          updated.push({ id: u.id, email: u.email });
        }
      }
      res.json({ success: true, updated });
    } catch (e) {
      res.status(500).json({ error: 'Error reseteando contraseñas' });
    }
  });
  app.post('/api/dev/sync-demo', async (_req, res) => {
    try {
      await syncDemoAndCoreAccounts();
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Error sincronizando cuentas demo' });
    }
  });
}

// Aplicar rate limit reforzado a todo /api/auth/*
app.use('/api/auth', authLimiter);

// Rutas de Autenticación
if (USE_DB_AUTH) {
  app.use('/api/auth', authRoutes);
} else {
  // ---------- Auth (modo JSON local) ----------
  // Helpers internos
  const buildAuthToken = (user) => {
    const access = hydrateAccess(user);
    return {
      access,
      token: jwt.sign(
        {
          id: user.id,
          email: user.email,
          rol: user.rol,
          roles: access.roles,
          permissions: access.permissions,
          module_access: access.module_access,
          gym_id: user.gym_id || user.gymId || null,
          trainer_id: user.trainer_id || null,
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      ),
    };
  };

  const profileShape = (user) => {
    const access = hydrateAccess(user);
    return {
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
    };
  };

  app.post('/api/auth/register', async (req, res) => {
    try {
      const {
        nombre, email, password,
        teléfono, telefono,
        fecha_nacimiento, peso, altura, objetivo,
        genero = null, rol = 'usuario_final',
        tiene_restricciones = false, restricciones_detalles = '',
        medidas_biomecanicas, experiencia, metodo_entrenamiento,
      } = req.body || {};

      if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
      }
      const validGeneros = ['masculino', 'femenino'];
      if (!genero || !validGeneros.includes(genero)) {
        return res.status(400).json({ error: 'El género es obligatorio y debe ser masculino o femenino' });
      }

      let finalPassword = password;
      let usedTemp = false;
      if (!finalPassword || String(finalPassword).length < 8) {
        // Contraseña temporal: NO se loggea, NO se devuelve. El usuario debe
        // cambiarla por flujo "olvidé mi contraseña" o por admin.
        finalPassword = require('crypto').randomBytes(9).toString('base64url');
        usedTemp = true;
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
        metodo_entrenamiento,
      });

      const message = usedTemp
        ? 'Usuario registrado. Se generó una clave temporal; pídela al administrador o usa "Olvidé mi contraseña".'
        : 'Usuario registrado exitosamente';
      res.status(201).json({
        message,
        user: { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol },
      });
    } catch (error) {
      console.error('Error registrando usuario:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
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
      const { access, token } = buildAuthToken(user);
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
      console.error('Error en login:', error.message);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/api/auth/profile', (req, res) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = userDB.getById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(profileShape(user));
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
app.use('/api/programs', programRoutes);

// Manejo de errores final (incluye CORS rechazado)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && /CORS/.test(String(err.message))) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Seed/sync controlados por env
syncDemoAndCoreAccounts();
try {
  const seeded = seedD28DData();
  console.log(`[D28D] Datos demo listos (gym ${seeded.gym_id})`);
} catch (error) {
  console.error('Error preparando datos demo D28D:', error.message);
}

app.listen(PORT, () => {
  console.log(`[server] Escuchando en http://localhost:${PORT} (env=${NODE_ENV})`);
  console.log(`[server] CORS allow: ${corsAllowList.join(', ') || '(ninguno; bloqueado)'}`);
  if (ENABLE_DEV_ROUTES) console.log('[server] /api/dev/* habilitados');
  console.log(`[server] Auth backend: ${USE_DB_AUTH ? 'DB' : 'JSON'}`);
});
