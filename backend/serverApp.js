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
const cycleRoutes = require('./src/routes/cycleRoutes');
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
  : (IS_PROD ? [] : [
    'http://localhost:5175', 'http://127.0.0.1:5175',
    'http://localhost:5174', 'http://127.0.0.1:5174',
  ]);
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

const { useDbAuth, usePgStorage } = require('./src/utils/storageMode');
const USE_DB_AUTH = useDbAuth();
const USE_PG_STORAGE = usePgStorage();
const ENABLE_DEV_ROUTES = !IS_PROD && String(process.env.ENABLE_DEV_ROUTES || '').toLowerCase() === 'true';
const SEED_DEMO = String(process.env.SEED_DEMO || '').toLowerCase() === 'true';

// Matriz de cuentas piloto. Cada entrada se sincroniza al arrancar
// cuando SEED_DEMO=true (crea o actualiza la contraseña). El email
// `demo` (público) usa DEMO_PASSWORD; el resto, CORE_PASSWORD.
const PILOT_ACCOUNTS = [
  { email: 'admin@foodplan.local',           nombre: 'Super Admin',         rol: 'super_admin',     bucket: 'core' },
  { email: 'admin.d28d@foodplan.local',      nombre: 'Admin D28D',          rol: 'admin_d28d',      bucket: 'core' },
  { email: 'admin.food@foodplan.local',      nombre: 'Admin Plan Alim.',    rol: 'admin_food_plan', bucket: 'core' },
  { email: 'admin.entrenador@foodplan.local',nombre: 'Admin Entrenadores',  rol: 'admin_training',  bucket: 'core' },
  { email: 'gym.demo@foodplan.local',        nombre: 'Admin Gym Demo',      rol: 'admin_gimnasio',  bucket: 'core' },
  { email: 'coach.demo@foodplan.local',      nombre: 'Coach Demo',          rol: 'entrenador',      bucket: 'core' },
  { email: 'usuario.demo@foodplan.local',    nombre: 'Usuario Demo',        rol: 'usuario_final',   bucket: 'core' },
  { email: 'demo+20260302@foodplan.local',   nombre: 'Demo Público',        rol: 'usuario_final',   bucket: 'demo' },
];

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
    // Cuentas extra opcionales heredadas de CORE_ACCOUNT_EMAILS.
    const extraCore = (process.env.CORE_ACCOUNT_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((e) => !PILOT_ACCOUNTS.some((a) => a.email === e))
      .map((e) => ({ email: e, nombre: e, rol: 'super_admin', bucket: 'core' }));

    const all = [...PILOT_ACCOUNTS, ...extraCore];
    const demoHash = await bcryptjs.hash(demoPassword, 10);
    const coreHash = await bcryptjs.hash(corePassword, 10);

    let created = 0, updated = 0;
    if (USE_DB_AUTH) {
      for (const acc of all) {
        const hash = acc.bucket === 'demo' ? demoHash : coreHash;
        try {
          const r = await db.query('SELECT id FROM users WHERE email = $1', [acc.email]);
          if (r.rows && r.rows.length > 0) {
            await db.query('UPDATE users SET clave_hash = $1, rol = $2 WHERE email = $3', [hash, acc.rol, acc.email]);
            updated++;
          } else {
            await db.query('INSERT INTO users (nombre, email, clave_hash, rol) VALUES ($1, $2, $3, $4)', [acc.nombre, acc.email, hash, acc.rol]);
            created++;
          }
        } catch { /* noop */ }
      }
    } else {
      for (const acc of all) {
        const hash = acc.bucket === 'demo' ? demoHash : coreHash;
        const existing = userDB.getByEmail(acc.email);
        if (existing) {
          userDB.update(existing.id, { clave_hash: hash, rol: acc.rol, roles: [acc.rol] });
          updated++;
        } else {
          userDB.create({ nombre: acc.nombre, email: acc.email, clave_hash: hash, rol: acc.rol, roles: [acc.rol] });
          created++;
        }
      }
    }
    console.log(`[SEED_DEMO] Cuentas piloto sincronizadas: ${created} creadas, ${updated} actualizadas.`);
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

const { resolveInviteCode } = require('./src/utils/inviteResolver');

// Público: validar código de entrenador / gimnasio / D28D en registro
app.post('/api/auth/resolve-invite', (req, res) => {
  try {
    const result = resolveInviteCode(req.body?.code);
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (e) {
    console.error('resolve-invite:', e.message);
    return res.status(500).json({ error: 'Error validando código' });
  }
});

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
        gym_id, trainer_id, module_access, invite_code,
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
      const resolvedInvite = invite_code ? resolveInviteCode(invite_code) : null;
      const inviteData = resolvedInvite?.ok ? resolvedInvite.data : null;

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
        rol: 'usuario_final',
        roles: ['usuario_final'],
        gym_id: gym_id ?? inviteData?.gym_id ?? null,
        trainer_id: trainer_id ?? inviteData?.trainer_id ?? null,
        gymId: gym_id ?? inviteData?.gym_id ?? null,
        module_access: module_access && typeof module_access === 'object'
          ? module_access
          : (inviteData?.module_access || {}),
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

// Admin: reset de contraseña en modo JSON.
// En modo Postgres, este endpoint lo expone `authRoutes.js` con el handler
// `authController.adminResetPassword`. Aquí se registra solo cuando `USE_DB_AUTH`
// es false para evitar dos handlers shadow-eando la misma ruta.
if (!USE_DB_AUTH) {
  app.post('/api/auth/admin/reset-password', authMiddleware, async (req, res) => {
    try {
      const { hasRole } = require('./src/utils/accessControl');
      if (!hasRole(req.user, ['super_admin', 'admin_gimnasio', 'admin_marca'])) {
        return res.status(403).json({ error: 'Acceso denegado' });
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
      console.error('Error reset-password (modo JSON):', e);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
}

// Admin: Usuarios y Roles (modo memoria)
const { hasRole: hasUserRole } = require('./src/utils/accessControl');

// Helpers admin/users: limitan visibilidad / acción al gym del JWT cuando el
// llamante no es super_admin.
const tokenGymId = (user) => {
  const raw = user?.gym_id ?? user?.gymId ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const ADMIN_ROLES_ASSIGNABLE_ONLY_BY_SUPER = [
  'super_admin', 'admin_marca', 'admin_gimnasio', 'admin_d28d',
  'admin_food_plan', 'admin_food', 'admin_training', 'admin_entrenador', 'admin_gym',
];
const ALLOWED_ROLES_FOR_ADMIN = [
  ...ADMIN_ROLES_ASSIGNABLE_ONLY_BY_SUPER,
  'entrenador', 'nutricionista', 'usuario_final',
];

// "Operadores de plataforma": ven y editan usuarios de toda la
// plataforma (no de un gym puntual). Cada uno es responsable de su
// módulo. Ninguno puede escalar a roles administrativos.
//   - super_admin: full control.
//   - admin_d28d: opera D28D + gimnasios marca blanca.
//   - admin_food / admin_food_plan: opera el módulo de alimentación.
//   - admin_training / admin_entrenador: opera el módulo de
//     entrenamiento.
const PLATFORM_ADMIN_ROLES = [
  'super_admin', 'admin_d28d',
  'admin_food', 'admin_food_plan',
  'admin_training', 'admin_entrenador',
];
// Roles que pueden listar / crear / editar usuarios.
const USER_MGMT_ROLES = [
  ...PLATFORM_ADMIN_ROLES,
  'admin_gimnasio', 'admin_marca',
];

app.get('/api/admin/users', authMiddleware, (req, res) => {
  try {
    if (!hasUserRole(req.user, USER_MGMT_ROLES)) {
      return res.status(403).json({ error: 'No tienes permiso para ver usuarios' });
    }
    const ownGym = tokenGymId(req.user);
    // super_admin / admin_d28d / admin_food(plan) / admin_training(entrenador)
    // operan sobre toda la plataforma. El resto (admin_gimnasio, admin_marca)
    // está limitado a su gym.
    const isPlatformAdmin = hasUserRole(req.user, PLATFORM_ADMIN_ROLES);
    let users = userDB.getAll();
    if (!isPlatformAdmin && ownGym) {
      users = users.filter((u) => {
        const g = u.gym_id ?? u.gymId ?? null;
        return g !== null && Number(g) === ownGym;
      });
    }
    const list = users.map(u => ({
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
    if (!hasUserRole(req.user, USER_MGMT_ROLES)) {
      return res.status(403).json({ error: 'No tienes permiso para crear usuarios' });
    }
    const { nombre, email, password, rol = 'usuario_final', roles, permissions, module_access, gym_id, trainer_id, planId, telefono, fecha_nacimiento, peso, altura, objetivo } = req.body || {};
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    if (userDB.getByEmail(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const nextRoles = Array.isArray(roles) && roles.length ? roles : [rol];
    if (!nextRoles.every((r) => ALLOWED_ROLES_FOR_ADMIN.includes(r))) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    const isSuper = hasUserRole(req.user, ['super_admin']);
    const isPlatformAdmin = hasUserRole(req.user, PLATFORM_ADMIN_ROLES);
    // Solo super_admin puede crear usuarios con roles administrativos.
    // admin_d28d / admin_food(plan) / admin_training(entrenador) pueden
    // crear usuarios no-administrativos en cualquier gym.
    if (!isSuper && nextRoles.some((r) => ADMIN_ROLES_ASSIGNABLE_ONLY_BY_SUPER.includes(r))) {
      return res.status(403).json({ error: 'Solo super_admin puede crear administradores' });
    }
    // Resolución de gym_id:
    // - operadores de plataforma: usan el gym_id del body (incluso null).
    // - admin_gimnasio/admin_marca: fuerza el gym propio del JWT.
    const ownGym = tokenGymId(req.user);
    let finalGymId;
    if (isPlatformAdmin) {
      finalGymId = gym_id ?? null;
    } else {
      if (!ownGym) {
        return res.status(403).json({ error: 'Tu usuario no tiene gimnasio asignado para crear usuarios' });
      }
      finalGymId = ownGym;
    }

    const pwd = password && String(password).length >= 6 ? password : Math.random().toString(36).slice(-8);
    const hashedPassword = await bcryptjs.hash(pwd, 10);
    const created = userDB.create({
      nombre,
      email,
      clave_hash: hashedPassword,
      rol,
      roles: nextRoles,
      permissions: Array.isArray(permissions) ? permissions : [],
      module_access: module_access || {},
      telefono: telefono || null,
      fecha_nacimiento: fecha_nacimiento || null,
      peso: peso ?? null,
      altura: altura ?? null,
      objetivo: objetivo || null,
      gym_id: finalGymId,
      trainer_id: trainer_id ?? null,
      gymId: finalGymId,
      planId: planId || null,
    });
    res.status(201).json({ success: true, data: { id: created.id, nombre: created.nombre, email: created.email, rol: created.rol } });
  } catch (e) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

app.put('/api/admin/users/:id/role', authMiddleware, (req, res) => {
  try {
    if (!hasUserRole(req.user, USER_MGMT_ROLES)) {
      return res.status(403).json({ error: 'No tienes permiso para cambiar roles' });
    }
    const { id } = req.params;
    const { rol, roles, permissions, module_access } = req.body || {};
    const nextRoles = Array.isArray(roles) && roles.length ? roles : [rol];
    if (!nextRoles.every((role) => ALLOWED_ROLES_FOR_ADMIN.includes(role))) {
      return res.status(400).json({ error: 'Rol no válido' });
    }
    const isSuper = hasUserRole(req.user, ['super_admin']);
    const isPlatformAdmin = hasUserRole(req.user, PLATFORM_ADMIN_ROLES);
    if (!isSuper && nextRoles.some((role) => ADMIN_ROLES_ASSIGNABLE_ONLY_BY_SUPER.includes(role))) {
      return res.status(403).json({ error: 'Solo super_admin puede asignar roles administrativos' });
    }
    const target = userDB.getById(parseInt(id, 10));
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // Tenant: admin gym solo puede tocar usuarios de su mismo gym.
    // Los operadores de plataforma pueden tocar cualquier usuario, pero
    // NUNCA escalar a roles administrativos (validado arriba).
    if (!isPlatformAdmin) {
      const ownGym = tokenGymId(req.user);
      const targetGym = Number(target.gym_id ?? target.gymId ?? 0);
      if (!ownGym || ownGym !== targetGym) {
        return res.status(403).json({ error: 'No puedes modificar usuarios de otro gimnasio' });
      }
    }
    userDB.update(target.id, { rol: rol || nextRoles[0], roles: nextRoles, permissions: Array.isArray(permissions) ? permissions : target.permissions, module_access: module_access || target.module_access || {} });
    const updated = userDB.getById(target.id);
    res.json({ success: true, data: { id: updated.id, nombre: updated.nombre, email: updated.email, rol: updated.rol, roles: updated.roles, permissions: updated.permissions, module_access: updated.module_access } });
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando rol' });
  }
});

// Guard tenant para acciones admin sobre /users/:id.
// - operadores de plataforma (super_admin, admin_d28d, admin_food[_plan],
//   admin_training[/entrenador]): sin restricción.
// - admin_gimnasio / admin_marca: solo usuarios de su gym y sin escalar
//   gym destino.
const enforceTenantOnUserUpdate = (req, target) => {
  if (hasUserRole(req.user, PLATFORM_ADMIN_ROLES)) return { ok: true, gym: null };
  const ownGym = tokenGymId(req.user);
  const targetGym = Number(target.gym_id ?? target.gymId ?? 0);
  if (!ownGym || ownGym !== targetGym) {
    return { ok: false, status: 403, error: 'No puedes modificar usuarios de otro gimnasio' };
  }
  return { ok: true, gym: ownGym };
};

app.put('/api/admin/users/:id/assign', authMiddleware, (req, res) => {
  try {
    if (!hasUserRole(req.user, USER_MGMT_ROLES)) {
      return res.status(403).json({ error: 'No tienes permiso para asignar' });
    }
    const { id } = req.params;
    const { gym_id = null, trainer_id = null, planId = undefined } = req.body || {};
    const user = userDB.getById(parseInt(id, 10));
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const guard = enforceTenantOnUserUpdate(req, user);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
    const isPlatformAdmin = hasUserRole(req.user, PLATFORM_ADMIN_ROLES);
    // admin_gimnasio / admin_marca NO pueden mover el usuario a otro gym.
    // Los operadores de plataforma sí pueden reasignar gimnasio.
    const finalGymId = isPlatformAdmin ? gym_id : (guard.gym ?? user.gym_id ?? null);
    const updates = { gym_id: finalGymId, trainer_id, gymId: finalGymId, ...(planId !== undefined ? { planId } : {}) };
    const updated = userDB.update(user.id, updates);
    res.json({ success: true, data: { id: updated.id, gym_id: updated.gym_id || updated.gymId || null, trainer_id: updated.trainer_id || null, planId: updated.planId || null } });
  } catch (e) {
    res.status(500).json({ error: 'Error asignando usuario' });
  }
});

app.put('/api/admin/users/:id/password', authMiddleware, async (req, res) => {
  try {
    if (!hasUserRole(req.user, USER_MGMT_ROLES)) {
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
    const guard = enforceTenantOnUserUpdate(req, user);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
    const hash = await bcryptjs.hash(password, 10);
    userDB.update(user.id, { clave_hash: hash });
    res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (e) {
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, (req, res) => {
  try {
    // Eliminación restringida (no todos los operadores de plataforma
    // pueden borrar usuarios; admin_food/admin_training NO eliminan).
    if (!hasUserRole(req.user, ['super_admin', 'admin_d28d', 'admin_gimnasio', 'admin_marca'])) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar' });
    }
    const { id } = req.params;
    const targetId = parseInt(id, 10);
    if (req.user.id === targetId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    const target = userDB.getById(targetId);
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const guard = enforceTenantOnUserUpdate(req, target);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });
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
app.use('/api/cycles', cycleRoutes);

// Manejo de errores final (incluye CORS rechazado)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err && /CORS/.test(String(err.message))) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Seed/sync controlados por env.
// El seed D28D solo corre cuando SEED_DEMO=true (por defecto: false en piloto/prod).
syncDemoAndCoreAccounts();
const shouldSeedDemo = String(process.env.SEED_DEMO || '').toLowerCase() === 'true'
  || (NODE_ENV === 'development' && process.env.SEED_DEMO === undefined);
if (shouldSeedDemo) {
  try {
    const seeded = seedD28DData();
    console.log(`[D28D] Datos demo listos (gym ${seeded.gym_id})`);
  } catch (error) {
    console.error('Error preparando datos demo D28D:', error.message);
  }
} else {
  console.log('[D28D] Seed demo deshabilitado (SEED_DEMO!=true).');
}

const server = app.listen(PORT, () => {
  console.log(`[server] Escuchando en http://localhost:${PORT} (env=${NODE_ENV})`);
  console.log(`[server] CORS allow: ${corsAllowList.join(', ') || '(ninguno; bloqueado)'}`);
  if (ENABLE_DEV_ROUTES) console.log('[server] /api/dev/* habilitados');
  if (USE_PG_STORAGE) {
    console.log('[server] Persistencia: PostgreSQL (json_collections) — dominio completo');
  } else {
    console.log(`[server] Persistencia: archivos JSON${USE_DB_AUTH ? ' + auth parcial en PG' : ''}`);
    if (USE_DB_AUTH) {
      console.warn(
        '[CONFIG] USE_DB_AUTH=true sin USE_PG_STORAGE: solo login en PG. Ver docs/PRODUCCION_HOY.md',
      );
    }
  }
});

if (USE_PG_STORAGE) {
  const pgCollectionCache = require('./src/utils/pgCollectionCache');
  const shutdown = async (signal) => {
    console.log(`[server] ${signal}: guardando colecciones en PostgreSQL…`);
    try {
      await pgCollectionCache.flushAll();
    } catch (e) {
      console.error('[server] Error en flush PG:', e.message);
    }
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
