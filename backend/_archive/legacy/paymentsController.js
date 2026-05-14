const db = require('../config/dbClient');
const AccountsDatabase = require('../models/AccountsDatabase');
const PaymentsDatabase = require('../models/PaymentsDatabase');
const logger = require('../utils/logger');

const USE_DB_AUTH = String(process.env.USE_DB_AUTH).toLowerCase() === 'true';

const sessionsForPlan = (planName) => {
  if (planName === 'premium') return { sesiones_restantes: 24, sesiones_totales: 24 };
  if (planName === 'vip') return { sesiones_restantes: 48, sesiones_totales: 48 };
  return { sesiones_restantes: 0, sesiones_totales: 0 };
};

const paymentsController = {
  createCheckout: async (req, res) => {
    try {
      const { plan, gym_id = null, trainer_id = null } = req.body || {};
      const traceId = req.traceId;
      if (!plan) return res.status(400).json({ error: 'plan es requerido' });

      if (USE_DB_AUTH) {
        // Lógica SQL
        const planRes = await db.query('SELECT * FROM subscription_plans WHERE nombre = $1 AND activo = true', [plan]);
        const planData = planRes.rows[0];
        if (!planData) return res.status(400).json({ error: 'Plan no válido' });

        if (planData.max_usuarios > 0 && planData.usuarios_activos >= planData.max_usuarios) {
          return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
        }

        const paymentRes = await db.query(
          `INSERT INTO payments (user_id, plan_nombre, amount_cents, currency, gym_id, trainer_id, status, trace_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7) RETURNING id, amount_cents, currency, status, trace_id`,
          [req.user.id, plan, planData.precio_mensual, 'COP', gym_id, trainer_id, traceId]
        );
        const payment = paymentRes.rows[0];

        logger.info(`Checkout creado: ${plan}`, { 
          user_id: req.user.id, 
          event: 'checkout_created', 
          trace_id: traceId,
          plan 
        });

        return res.status(201).json({
          ...payment,
          simulate_pay_url: `/api/payments/${payment.id}/confirm`,
        });
      } else {
        // Lógica JSON Legacy
        const planData = AccountsDatabase.getPlanByNombre(plan);
        if (!planData) return res.status(400).json({ error: 'Plan no válido' });
        const payment = PaymentsDatabase.create({
          user_id: req.user.id,
          plan,
          amount_cents: planData.precio_mensual,
          currency: 'COP',
          gym_id,
          trainer_id,
        });
        return res.status(201).json({
          id: payment.id,
          amount_cents: payment.amount_cents,
          currency: payment.currency,
          status: payment.status,
          simulate_pay_url: `/api/payments/${payment.id}/confirm`,
        });
      }
    } catch (e) {
      console.error('Error creando checkout:', e);
      res.status(500).json({ error: 'Error interno al crear checkout' });
    }
  },

  confirm: async (req, res) => {
    let tx = null;
    const traceId = req.traceId;
    try {
      const { id } = req.params;

      if (USE_DB_AUTH) {
        tx = await db.getTransaction();

        // 1. Obtener y bloquear el pago
        const payRes = await tx.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
        const payment = payRes.rows[0];

        if (!payment) {
          await tx.rollback();
          return res.status(404).json({ error: 'Pago no encontrado' });
        }
        
        logger.info(`Confirmando pago: ${id}`, { 
          user_id: req.user.id, 
          event: 'payment_confirm_start', 
          trace_id: traceId,
          payment_id: id 
        });

        if (payment.user_id !== req.user.id) {
          await tx.rollback();
          return res.status(403).json({ error: 'No autorizado' });
        }
        if (payment.status !== 'pendiente') {
          await tx.rollback();
          return res.status(400).json({ error: 'Pago ya procesado' });
        }

        // 2. Incrementar usuarios activos atómicamente
        const updatePlanRes = await tx.query(
          `UPDATE subscription_plans 
           SET usuarios_activos = usuarios_activos + 1 
           WHERE nombre = $1 AND (max_usuarios = 0 OR usuarios_activos < max_usuarios)
           RETURNING *`,
          [payment.plan_nombre]
        );

        if (updatePlanRes.rows.length === 0) {
          await tx.rollback();
          return res.status(409).json({ error: 'Sin cupos' });
        }
        const planData = updatePlanRes.rows[0];

        // 3. Actualizar estado del pago
        await tx.query('UPDATE payments SET status = \'pagado\', updated_at = NOW() WHERE id = $1', [id]);

        // 4. Crear/Renovar suscripción
        const subRes = await tx.query('SELECT * FROM user_subscriptions WHERE user_id = $1 AND activo = true', [req.user.id]);
        const existingSub = subRes.rows[0];
        
        const ses = sessionsForPlan(payment.plan_nombre);
        const fechaVenc = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);

        if (!existingSub) {
          await tx.query(
            `INSERT INTO user_subscriptions (user_id, plan_nombre, gym_id, trainer_id, estado, sesiones_restantes, sesiones_totales, precio_mensual, fecha_vencimiento, metodo_pago)
             VALUES ($1, $2, $3, $4, 'activo', $5, $6, $7, $8, 'simulado')`,
            [req.user.id, payment.plan_nombre, payment.gym_id, payment.trainer_id, ses.sesiones_restantes, ses.sesiones_totales, planData.precio_mensual, fechaVenc]
          );
        } else {
          if (existingSub.plan_nombre !== payment.plan_nombre) {
            await tx.query('UPDATE subscription_plans SET usuarios_activos = GREATEST(0, usuarios_activos - 1) WHERE nombre = $1', [existingSub.plan_nombre]);
          }
          await tx.query(
            `UPDATE user_subscriptions SET plan_nombre = $1, precio_mensual = $2, fecha_inicio = NOW(), fecha_vencimiento = $3, estado = 'activo'
             WHERE id = $4`,
            [payment.plan_nombre, planData.precio_mensual, fechaVenc, existingSub.id]
          );
        }

        await tx.commit();
        
        logger.info(`Suscripción activada con éxito`, { 
          user_id: req.user.id, 
          event: 'subscription_activated', 
          trace_id: traceId,
          plan: payment.plan_nombre 
        });

        res.json({ message: 'Pago confirmado', trace_id: traceId });

      } else {
        // Legacy
        res.json({ message: 'Modo JSON no soporta Tracing avanzado' });
      }
    } catch (e) {
      if (tx) await tx.rollback();
      logger.error('Error en confirmación de pago', { 
        error: e.message, 
        trace_id: traceId, 
        user_id: req.user.id 
      });
      res.status(500).json({ error: 'Error interno' });
    }
  },

  myPayments: async (req, res) => {
    try {
      if (USE_DB_AUTH) {
        const items = await db.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(items.rows);
      } else {
        const items = PaymentsDatabase.getByUserId(req.user.id);
        res.json(items);
      }
    } catch (e) {
      res.status(500).json({ error: 'Error obteniendo pagos' });
    }
  },
};

module.exports = paymentsController;
