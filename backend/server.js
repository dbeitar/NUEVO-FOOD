require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Controllers
const adminController = require('./src/controllers/adminController');

// Routes
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

// Middleware
const authMiddleware = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware Setup
app.use(express.json());
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://traero9ngtqm.vercel.app,http://localhost:5173,http://localhost:5178,http://localhost:5180')
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

// Rutas de Autenticación (Siempre SQL)
app.use('/api/auth', authRoutes);

// Admin: Usuarios y Roles (PostgreSQL)
app.get('/api/admin/users', authMiddleware, adminController.getAllUsers);
app.post('/api/admin/users', authMiddleware, adminController.createUser);
app.put('/api/admin/users/:id/role', authMiddleware, adminController.updateUserRole);
app.put('/api/admin/users/:id/assign', authMiddleware, adminController.assignUser);
app.put('/api/admin/users/:id/password', authMiddleware, adminController.updateUserPassword);
app.delete('/api/admin/users/:id', authMiddleware, adminController.deleteUser);

const pool = require('./src/config/database');

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ 
      status: 'Backend Food Plan corriendo correctamente ✅ (SQL Mode)',
      db_connection: 'OK',
      timestamp: result.rows[0].now,
      env_check: {
        DB_HOST: process.env.DB_HOST ? 'Set' : 'Missing',
        DB_USER: process.env.DB_USER ? 'Set' : 'Missing',
        DB_NAME: process.env.DB_NAME ? 'Set' : 'Missing',
      }
    });
  } catch (err) {
    console.error('Health Check DB Error:', err);
    res.status(500).json({ 
      status: 'Error en conexión a Base de Datos ❌',
      error: err.message,
      env_check: {
        DB_HOST: process.env.DB_HOST ? 'Set' : 'Missing',
        DB_USER: process.env.DB_USER ? 'Set' : 'Missing',
        DB_NAME: process.env.DB_NAME ? 'Set' : 'Missing',
        DB_PORT: process.env.DB_PORT ? 'Set' : 'Missing',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'Set' : 'Missing'
      }
    });
  }
});

// Rutas de la aplicación
app.use('/api/calculator', calculatorRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/food-log', foodLogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/recipes', recipeRoutes);
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
    console.log('🔐 Autenticación usando Base de Datos (PostgreSQL)');
  });
}

module.exports = app;
