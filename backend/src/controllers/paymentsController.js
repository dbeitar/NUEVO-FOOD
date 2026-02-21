const AccountsDatabase = require('../models/AccountsDatabase');
const PaymentsDatabase = require('../models/PaymentsDatabase');

const sessionsForPlan = (planName) => {
  if (planName === 'premium') return { sesiones_restantes: 24, sesiones_totales: 24 };
  if (planName === 'vip') return { sesiones_restantes: 48, sesiones_totales: 48 };
  return { sesiones_restantes: 0, sesiones_totales: 0 };
};

const paymentsController = {
  createCheckout: (req, res) => {
    try {
      const { plan, gym_id = null, trainer_id = null } = req.body || {};
      if (!plan) {
        return res.status(400).json({ error: 'plan es requerido' });
      }
      const planData = AccountsDatabase.getPlanByNombre(plan);
      if (!planData) {
        return res.status(400).json({ error: 'Plan no válido' });
      }
      if (typeof planData.max_users === 'number' && planData.max_users > 0) {
        if (planData.usuarios_activos >= planData.max_users) {
          return res.status(409).json({ error: 'Capacidad del plan alcanzada' });
        }
      }
      const amount_cents = planData.precio_mensual; // usamos COP como entero
      const payment = PaymentsDatabase.create({
        user_id: req.user.id,
        plan,
        amount_cents,
        currency: 'COP',
        gym_id,
        trainer_id,
      });
      res.status(201).json({
        id: payment.id,
        amount_cents: payment.amount_cents,
        currency: payment.currency,
        status: payment.status,
        simulate_pay_url: `/api/payments/${payment.id}/confirm`,
      });
    } catch (e) {
      console.error('Error creando checkout:', e);
      res.status(500).json({ error: 'Error interno al crear checkout' });
    }
  },

  confirm: (req, res) => {
    try {
      const { id } = req.params;
      const payment = PaymentsDatabase.getById(parseInt(id, 10));
      if (!payment) {
        return res.status(404).json({ error: 'Pago no encontrado' });
      }
      if (payment.user_id !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado para confirmar este pago' });
      }
      if (payment.status !== 'pendiente') {
        return res.status(400).json({ error: 'Pago ya procesado' });
      }
      PaymentsDatabase.updateStatus(payment.id, 'pagado');

      const planData = AccountsDatabase.getPlanByNombre(payment.plan);
      if (!planData) {
        return res.status(400).json({ error: 'Plan no válido' });
      }

      const existingAccount = AccountsDatabase.getByUserId(req.user.id);
      let account;
      if (!existingAccount) {
        const ses = sessionsForPlan(payment.plan);
        account = AccountsDatabase.create({
          user_id: req.user.id,
          plan: payment.plan,
          gym_id: payment.gym_id,
          trainer_id: payment.trainer_id,
          estado: 'activo',
          ...ses,
          precio_mensual: planData.precio_mensual,
          fecha_vencimiento: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
          metodoPago: 'simulado',
        });
        AccountsDatabase.incPlanUsers(payment.plan);
      } else {
        const prevPlan = existingAccount.plan;
        account = AccountsDatabase.renovarPlan(existingAccount.id, payment.plan);
        if (payment.plan !== prevPlan) {
          AccountsDatabase.decPlanUsers(prevPlan);
          AccountsDatabase.incPlanUsers(payment.plan);
        }
      }

      res.json({ message: 'Pago confirmado y suscripción activa', account });
    } catch (e) {
      console.error('Error confirmando pago:', e);
      res.status(500).json({ error: 'Error interno al confirmar pago' });
    }
  },

  myPayments: (req, res) => {
    try {
      const items = PaymentsDatabase.getByUserId(req.user.id);
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: 'Error obteniendo pagos' });
    }
  },
};

module.exports = paymentsController;
