const { getPrisma } = require('../../lib/prisma');

function planToLegacy(row) {
  return {
    nombre: row.nombre,
    program_id: row.programId,
    kind: row.kind,
    descripcion: row.descripcion,
    precio_mensual: row.precioMensual,
    precio_mensual_usd: row.precioMensualUsd,
    features: row.features || [],
    max_usuarios: row.maxUsuarios,
    usuarios_activos: row.usuariosActivos,
    module_access: row.moduleAccess || {},
    is_couple: !!row.isCouple,
    included_seats: row.includedSeats || 1,
    cycle_ids: Array.isArray(row.allowedCycles)
      ? row.allowedCycles.map((c) => c.cycleId).filter((n) => Number.isFinite(Number(n))).map((n) => Number(n))
      : [],
    activo: row.activo !== false,
    visible: row.visible !== false,
    sort_order: row.sortOrder ?? 0,
    cycles_count: row.cyclesCount ?? null,
    support_whatsapp: row.supportWhatsapp ?? null,
    support_name: row.supportName ?? null,
    support_message: row.supportMessage ?? null,
    support_activo: row.supportActivo !== false,
  };
}

function accountToLegacy(row) {
  return {
    id: row.id,
    user_id: row.userId,
    plan: row.planNombre,
    primary_account_id: row.primaryAccountId ?? null,
    couple_invite_code: row.coupleInviteCode ?? null,
    couple_invite_used_by_user_id: row.coupleInviteUsedByUserId ?? null,
    gym_id: row.gymId,
    trainer_id: row.trainerId,
    cycle_id: row.cycleId ?? null,
    fecha_inicio: row.fechaInicio,
    fecha_vencimiento: row.fechaVencimiento,
    estado: row.estado,
    sesiones_restantes: row.sesionesRestantes,
    sesiones_totales: row.sesionesTotales,
    precio_mensual: row.precioMensual,
    metodoPago: row.metodoPago,
    activo: row.activo,
  };
}

async function loadState() {
  const prisma = getPrisma();
  const planes = (await prisma.subscriptionPlan.findMany({
    include: { allowedCycles: true },
  })).map(planToLegacy);
  const accounts = (await prisma.userAccount.findMany()).map(accountToLegacy);
  const nextId = accounts.length ? Math.max(...accounts.map((a) => a.id)) + 1 : 1;
  return { planes, accounts, nextId };
}

async function upsertPlan(plan) {
  const prisma = getPrisma();
  const cycles = Array.isArray(plan.cycle_ids)
    ? plan.cycle_ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
    : [];

  await prisma.subscriptionPlan.upsert({
    where: { nombre: plan.nombre },
    create: {
      nombre: plan.nombre,
      programId: plan.program_id || 'virtual_d28d',
      kind: plan.kind || 'd28d',
      descripcion: plan.descripcion,
      precioMensual: plan.precio_mensual || 0,
      precioMensualUsd: plan.precio_mensual_usd || 0,
      features: plan.features || [],
      maxUsuarios: plan.max_usuarios || 0,
      usuariosActivos: plan.usuarios_activos || 0,
      moduleAccess: plan.module_access || {},
      isCouple: !!plan.is_couple,
      includedSeats: Number(plan.included_seats) || 1,
      activo: plan.activo !== false,
      visible: plan.visible !== false,
      sortOrder: Number(plan.sort_order) || 0,
      cyclesCount: plan.cycles_count != null ? Number(plan.cycles_count) : null,
      supportWhatsapp: plan.support_whatsapp || null,
      supportName: plan.support_name || null,
      supportMessage: plan.support_message || null,
      supportActivo: plan.support_activo !== false,
    },
    update: {
      programId: plan.program_id || 'virtual_d28d',
      kind: plan.kind || 'd28d',
      descripcion: plan.descripcion,
      precioMensual: plan.precio_mensual,
      precioMensualUsd: plan.precio_mensual_usd,
      features: plan.features,
      maxUsuarios: plan.max_usuarios,
      usuariosActivos: plan.usuarios_activos,
      moduleAccess: plan.module_access,
      isCouple: !!plan.is_couple,
      includedSeats: Number(plan.included_seats) || 1,
      activo: plan.activo !== false,
      visible: plan.visible !== false,
      sortOrder: Number(plan.sort_order) ?? undefined,
      cyclesCount: plan.cycles_count != null ? Number(plan.cycles_count) : undefined,
      supportWhatsapp: plan.support_whatsapp ?? undefined,
      supportName: plan.support_name ?? undefined,
      supportMessage: plan.support_message ?? undefined,
      supportActivo: plan.support_activo ?? undefined,
    },
  });

  // Sincronizar ciclos permitidos (solo si se envía explícitamente)
  if (Array.isArray(plan.cycle_ids)) {
    await prisma.subscriptionPlanCycle.deleteMany({ where: { planNombre: plan.nombre } });
    if (cycles.length) {
      await prisma.subscriptionPlanCycle.createMany({
        data: cycles.map((cycleId) => ({ planNombre: plan.nombre, cycleId })),
        skipDuplicates: true,
      });
    }
  }
}

async function createAccount(acc) {
  const row = await getPrisma().userAccount.create({
    data: {
      userId: acc.user_id,
      planNombre: acc.plan,
      primaryAccountId: acc.primary_account_id || null,
      coupleInviteCode: acc.couple_invite_code || null,
      coupleInviteUsedByUserId: acc.couple_invite_used_by_user_id ?? null,
      gymId: acc.gym_id ?? null,
      trainerId: acc.trainer_id ?? null,
      cycleId: acc.cycle_id || null,
      fechaInicio: acc.fecha_inicio ? new Date(acc.fecha_inicio) : undefined,
      fechaVencimiento: acc.fecha_vencimiento ? new Date(acc.fecha_vencimiento) : null,
      precioMensual: acc.precio_mensual || 0,
      metodoPago: acc.metodoPago,
      sesionesRestantes: acc.sesiones_restantes || 0,
      sesionesTotales: acc.sesiones_totales || 0,
      estado: acc.estado || 'activo',
      activo: acc.activo !== false,
    },
  });
  return accountToLegacy(row);
}

async function updateAccount(id, updates) {
  const data = {};
  if (updates.plan !== undefined) data.planNombre = updates.plan;
  if (updates.primary_account_id !== undefined) data.primaryAccountId = updates.primary_account_id;
  if (updates.couple_invite_code !== undefined) data.coupleInviteCode = updates.couple_invite_code;
  if (updates.couple_invite_used_by_user_id !== undefined) {
    data.coupleInviteUsedByUserId = updates.couple_invite_used_by_user_id;
  }
  if (updates.gym_id !== undefined) data.gymId = updates.gym_id;
  if (updates.trainer_id !== undefined) data.trainerId = updates.trainer_id;
  if (updates.cycle_id !== undefined) data.cycleId = updates.cycle_id;
  if (updates.fecha_vencimiento !== undefined) {
    data.fechaVencimiento = updates.fecha_vencimiento ? new Date(updates.fecha_vencimiento) : null;
  }
  if (updates.estado !== undefined) data.estado = updates.estado;
  if (updates.sesiones_restantes !== undefined) data.sesionesRestantes = updates.sesiones_restantes;
  if (updates.sesiones_totales !== undefined) data.sesionesTotales = updates.sesiones_totales;
  if (updates.precio_mensual !== undefined) data.precioMensual = updates.precio_mensual;
  if (updates.metodoPago !== undefined) data.metodoPago = updates.metodoPago;
  if (updates.activo !== undefined) data.activo = !!updates.activo;
  const row = await getPrisma().userAccount.update({
    where: { id: Number(id) },
    data,
  });
  return accountToLegacy(row);
}

async function softDeleteAccount(id) {
  await getPrisma().userAccount.update({
    where: { id: Number(id) },
    data: { activo: false },
  });
  return true;
}

async function deletePlan(nombre) {
  await getPrisma().subscriptionPlan.delete({ where: { nombre } });
  return true;
}

async function adjustPlanUsers(nombre, delta) {
  const plan = await getPrisma().subscriptionPlan.findUnique({ where: { nombre } });
  if (!plan) return false;
  const next = Math.max(0, (plan.usuariosActivos || 0) + delta);
  await getPrisma().subscriptionPlan.update({
    where: { nombre },
    data: { usuariosActivos: next },
  });
  return true;
}

module.exports = {
  loadState,
  upsertPlan,
  createAccount,
  updateAccount,
  softDeleteAccount,
  deletePlan,
  adjustPlanUsers,
  planToLegacy,
  accountToLegacy,
};
