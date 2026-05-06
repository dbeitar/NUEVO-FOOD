const userDB = require('../models/UserDatabase');
const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const AccountsDatabase = require('../models/AccountsDatabase');
const FoodDatabase = require('../models/FoodDatabase');

function occupancyPercent(active, max) {
  if (!max || max <= 0) return null;
  return Math.min(100, Math.round((active / max) * 100));
}

const getOverview = (req, res) => {
  try {
    const isAuthorized = ['super_admin', 'admin_gimnasio', 'admin_food_plan', 'admin_training', 'admin_gym'].some(r => req.user?.roles?.includes(r) || req.user?.rol === r);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'No tienes permiso para ver este resumen' });
    }

    const users = userDB.getAll();
    const gyms = GymDatabase.getAll();
    const trainers = TrainersDatabase.getAll();
    const foods = FoodDatabase.getAll();
    const plans = AccountsDatabase.getPlanes();
    const activeSubscriptions = AccountsDatabase.getAll();

    const usersByRole = users.reduce((acc, u) => {
      const role = u.rol || 'sin_rol';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const plansUsage = plans.map((p) => ({
      nombre: p.nombre,
      usuariosActivos: p.usuarios_activos || 0,
      maxUsuarios: p.max_usuarios || 0,
      ocupacionPct: occupancyPercent(p.usuarios_activos || 0, p.max_usuarios || 0),
    }));

    return res.json({
      success: true,
      data: {
        counts: {
          users: users.length,
          gyms: gyms.length,
          trainers: trainers.length,
          foods: foods.length,
          plans: plans.length,
          activeSubscriptions: activeSubscriptions.length,
        },
        usersByRole,
        plansUsage,
      },
    });
  } catch (error) {
    console.error('Error generando overview admin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getOverview };
