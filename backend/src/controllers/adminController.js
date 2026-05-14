const userDB = require('../models/UserDatabase');
const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const AccountsDatabase = require('../models/AccountsDatabase');
const FoodDatabase = require('../models/FoodDatabase');
const db = require('../config/dbClient');

function occupancyPercent(active, max) {
  if (!max || max <= 0) return null;
  return Math.min(100, Math.round((active / max) * 100));
}

const adminController = {
  getOverview: (req, res) => {
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
  },

  getAuditLogs: async (req, res) => {
    try {
      const isSuperAdmin = req.user?.roles?.includes('super_admin') || req.user?.rol === 'super_admin';
      if (!isSuperAdmin) {
        return res.status(403).json({ error: 'Acceso exclusivo para Super Admin' });
      }

      const parsePositive = (raw, fallback, max) => {
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n) || n <= 0) return fallback;
        if (max && n > max) return max;
        return n;
      };

      const { level, traceId, event, from, to } = req.query;
      const limit = parsePositive(req.query.limit, 50, 500);
      const page = parsePositive(req.query.page, 1, 10000);
      const offset = (page - 1) * limit;

      const whereParts = ['1=1'];
      const params = [];

      if (level) {
        params.push(String(level).toUpperCase());
        whereParts.push(`level = $${params.length}`);
      }
      if (traceId) {
        params.push(String(traceId));
        whereParts.push(`trace_id = $${params.length}`);
      }
      if (event) {
        params.push(String(event));
        whereParts.push(`event = $${params.length}`);
      }
      if (from) {
        params.push(String(from));
        whereParts.push(`created_at >= $${params.length}`);
      }
      if (to) {
        params.push(String(to));
        whereParts.push(`created_at <= $${params.length}`);
      }

      const whereSql = whereParts.join(' AND ');
      const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM audit_logs WHERE ${whereSql}`, params);
      const total = countResult.rows?.[0]?.total ?? 0;

      params.push(limit);
      const limitIdx = params.length;
      params.push(offset);
      const offsetIdx = params.length;

      const result = await db.query(
        `SELECT * FROM audit_logs WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (error) {
      console.error('Error obteniendo audit logs:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  }
};

module.exports = adminController;
