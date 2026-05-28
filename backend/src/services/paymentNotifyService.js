const NotificationDatabase = require('../models/NotificationDatabase');
const userRepo = require('../db/repositories/userRepository');
const { useRelationalStorage } = require('../utils/storageMode');
const { hasRole } = require('../utils/accessControl');

const WOMPI_DEFAULT = 'https://checkout.wompi.co/l/test_VPOS_Y0ivU1';

const MODULE_LABELS = {
  food: 'FOOD_PLAN',
  training: 'Entrenamiento',
  d28d: 'D28D',
  gym: 'Gimnasio',
};

async function findAdminRecipients({ gymId, trainerId } = {}) {
  const ids = new Set();
  if (useRelationalStorage()) {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    const admins = await prisma.user.findMany({
      where: { activo: true },
      select: { id: true, roles: true, gymId: true, trainerId: true },
    });
    for (const u of admins) {
      let roles = u.roles;
      if (typeof roles === 'string') {
        try { roles = JSON.parse(roles); } catch { roles = []; }
      }
      if (!Array.isArray(roles)) roles = [];
      if (roles.some((r) => ['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador'].includes(r))) {
        ids.add(u.id);
        continue;
      }
      if (trainerId && Number(u.id) === Number(trainerId)) ids.add(u.id);
      if (gymId && Number(u.gymId) === Number(gymId) && roles.some((r) => ['admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista'].includes(r))) {
        ids.add(u.id);
      }
    }
    return [...ids];
  }
  const userDB = require('../models/UserDatabase');
  const all = userDB.getAll() || [];
  for (const u of all) {
    const roles = Array.isArray(u.roles) ? u.roles : [u.rol].filter(Boolean);
    if (roles.some((r) => ['super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador'].includes(r))) {
      ids.add(u.id);
    } else if (trainerId && Number(u.id) === Number(trainerId)) {
      ids.add(u.id);
    } else if (gymId && Number(u.gym_id) === Number(gymId) && roles.some((r) => ['admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista'].includes(r))) {
      ids.add(u.id);
    }
  }
  return [...ids];
}

async function notifyPaymentPending({
  payerUserId,
  accountId,
  moduleCode = 'd28d',
  method = 'pago_sede',
  planName = '',
  amount = 0,
  gymId = null,
  trainerId = null,
}) {
  let payerName = `Usuario #${payerUserId}`;
  try {
    const u = useRelationalStorage()
      ? await userRepo.findById(payerUserId)
      : require('../models/UserDatabase').getById(payerUserId);
    if (u?.nombre) payerName = u.nombre;
  } catch { /* ignore */ }

  const modLabel = MODULE_LABELS[moduleCode] || moduleCode;
  const methodLabel = method === 'wompi_online' ? 'Pago en línea (Wompi)' : 'Pago en sede';
  const msg = `${payerName} eligió ${methodLabel} para ${modLabel}${planName ? ` · plan ${planName}` : ''}${amount ? ` · $${Number(amount).toLocaleString()}` : ''}. Revisa vigencias y confirma el pago.`;

  const recipients = await findAdminRecipients({ gymId, trainerId });
  const rows = [];
  for (const adminId of recipients) {
    rows.push(NotificationDatabase.create({
      user_id: adminId,
      tipo: 'pago_pendiente',
      mensaje: msg,
      meta: {
        payer_user_id: payerUserId,
        account_id: accountId,
        module_code: moduleCode,
        metodo_pago: method,
        plan: planName,
      },
    }));
  }
  return { notified: rows.length, recipients };
}

function mapPaymentState(metodoPago) {
  if (metodoPago === 'wompi_online') return 'pendiente_pago_online';
  if (metodoPago === 'pago_sede') return 'pendiente_sede';
  return 'activo';
}

function shouldDeferActivation(metodoPago) {
  return metodoPago === 'wompi_online' || metodoPago === 'pago_sede';
}

module.exports = {
  WOMPI_DEFAULT,
  MODULE_LABELS,
  notifyPaymentPending,
  mapPaymentState,
  shouldDeferActivation,
};
