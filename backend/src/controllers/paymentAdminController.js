const AccountsDatabase = require('../models/AccountsDatabase');
const NotificationDatabase = require('../models/NotificationDatabase');
const licenseService = require('../services/licenseService');
const userRepo = require('../db/repositories/userRepository');
const { hasRole } = require('../utils/accessControl');
const { useRelationalStorage } = require('../utils/storageMode');
const { MODULE_LABELS } = require('../services/paymentNotifyService');

const PENDING_STATES = ['pendiente_sede', 'pendiente_pago_online', 'pendiente'];

function canManagePayments(user) {
  return hasRole(user, [
    'super_admin', 'admin_d28d', 'admin_training', 'admin_entrenador',
    'admin_gimnasio', 'admin_marca', 'entrenador', 'nutricionista',
  ]);
}

function scopeFilter(user, accounts) {
  if (hasRole(user, ['super_admin', 'admin_d28d'])) return accounts;
  const gymId = user.gym_id ?? user.gymId;
  const trainerId = user.trainer_id ?? user.trainerId ?? user.id;
  if (hasRole(user, ['admin_gimnasio', 'admin_marca']) && gymId) {
    return accounts.filter((a) => Number(a.gym_id) === Number(gymId));
  }
  if (hasRole(user, ['entrenador', 'nutricionista', 'admin_training', 'admin_entrenador'])) {
    return accounts.filter((a) => Number(a.trainer_id) === Number(trainerId));
  }
  return [];
}

async function enrichAccounts(accounts) {
  const out = [];
  for (const a of accounts) {
    let user = null;
    try {
      user = useRelationalStorage()
        ? await userRepo.findById(a.user_id)
        : require('../models/UserDatabase').getById(a.user_id);
    } catch { /* ignore */ }
    out.push({
      ...a,
      usuario_nombre: user?.nombre || `Usuario #${a.user_id}`,
      usuario_email: user?.email || '',
    });
  }
  return out;
}

exports.getOverview = async (req, res) => {
  try {
    if (!canManagePayments(req.user)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const moduleFilter = req.query.module || null;
    let accounts = AccountsDatabase.getAll() || [];
    accounts = scopeFilter(req.user, accounts);

    const pending = accounts.filter((a) => PENDING_STATES.includes(String(a.estado || '').toLowerCase()));
    const expiring = AccountsDatabase.getExpiringSoon().filter((a) => scopeFilter(req.user, [a]).length);

    const enrichedAll = await enrichAccounts(accounts);
    const nameByUser = Object.fromEntries(enrichedAll.map((a) => [a.user_id, a.usuario_nombre]));
    const licenseRows = [];
    const seenUsers = new Set(enrichedAll.map((a) => a.user_id));
    for (const uid of seenUsers) {
      const licenses = await licenseService.listForUser(uid, { includeInactive: true });
      for (const lic of licenses) {
        if (moduleFilter && lic.module_code !== moduleFilter) continue;
        const until = lic.valid_until ? new Date(lic.valid_until) : null;
        const daysLeft = until ? Math.ceil((until - Date.now()) / (86400000)) : null;
        licenseRows.push({
          user_id: uid,
          usuario_nombre: nameByUser[uid] || `Usuario #${uid}`,
          module_code: lic.module_code,
          active: lic.active,
          valid_until: lic.valid_until,
          days_left: daysLeft,
          source: lic.source,
        });
      }
    }

    const paymentNotifications = NotificationDatabase.getByUserId(req.user.id)
      .filter((n) => n.tipo === 'pago_pendiente')
      .slice(0, 30);

    return res.json({
      success: true,
      data: {
        pending: await enrichAccounts(pending),
        expiring: await enrichAccounts(expiring),
        licenses: licenseRows.filter((l) => l.days_left === null || l.days_left <= 14),
        notifications: paymentNotifications,
        modules: Object.keys(MODULE_LABELS),
      },
    });
  } catch (e) {
    console.error('paymentAdmin overview:', e);
    return res.status(500).json({ error: 'Error cargando vigencias de pago' });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    if (!canManagePayments(req.user)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const accountId = Number(req.params.accountId);
    const { days = 30, module_code = 'd28d' } = req.body || {};
    const account = AccountsDatabase.getById(accountId);
    if (!account) return res.status(404).json({ error: 'Cuenta no encontrada' });
    if (!scopeFilter(req.user, [account]).length) {
      return res.status(403).json({ error: 'Sin permiso sobre esta cuenta' });
    }

    const until = new Date();
    until.setDate(until.getDate() + Number(days) || 30);
    const updated = AccountsDatabase.update(accountId, {
      estado: 'activo',
      fecha_vencimiento: until,
      metodoPago: req.body?.metodo_pago || account.metodoPago || 'confirmado_admin',
    });

    const meta = {};
    meta[module_code] = { valid_until: until.toISOString() };
    const user = await userRepo.findById(account.user_id);
    const access = await licenseService.resolveModuleAccess(account.user_id, user?.module_access || {});
    await licenseService.syncFromModuleAccess(account.user_id, access, 'payment_confirm', meta);

    NotificationDatabase.create({
      user_id: account.user_id,
      tipo: 'pago_confirmado',
      mensaje: `Tu pago fue confirmado. Vigencia hasta ${until.toLocaleDateString()}.`,
      meta: { account_id: accountId, module_code, valid_until: until.toISOString() },
    });

    return res.json({ success: true, data: { account: updated } });
  } catch (e) {
    return res.status(500).json({ error: 'Error confirmando pago' });
  }
};

exports.extendVigencia = async (req, res) => {
  try {
    if (!canManagePayments(req.user)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const userId = Number(req.params.userId);
    const { module_code, days = 30 } = req.body || {};
    if (!module_code) return res.status(400).json({ error: 'module_code requerido' });

    const until = new Date();
    until.setDate(until.getDate() + Number(days) || 30);
    const user = await userRepo.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const access = await licenseService.resolveModuleAccess(userId, user.module_access || {});
    const meta = { [module_code]: { valid_until: until.toISOString() } };
    const licenses = await licenseService.syncFromModuleAccess(userId, access, 'admin_extend', meta);

    const account = AccountsDatabase.getByUserId(userId);
    if (account) {
      AccountsDatabase.update(account.id, {
        fecha_vencimiento: until,
        estado: 'activo',
      });
    }

    NotificationDatabase.create({
      user_id: userId,
      tipo: 'vigencia_extendida',
      mensaje: `Tu acceso a ${MODULE_LABELS[module_code] || module_code} fue extendido hasta ${until.toLocaleDateString()}.`,
      meta: { module_code, valid_until: until.toISOString() },
    });

    return res.json({ success: true, data: { licenses, valid_until: until.toISOString() } });
  } catch (e) {
    return res.status(500).json({ error: 'Error extendiendo vigencia' });
  }
};
