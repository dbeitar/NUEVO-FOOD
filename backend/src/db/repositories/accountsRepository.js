const { getPrisma } = require('../../lib/prisma');

function planToLegacy(row) {
  return {
    nombre: row.nombre,
    program_id: row.programId,
    descripcion: row.descripcion,
    precio_mensual: row.precioMensual,
    features: row.features || [],
    max_usuarios: row.maxUsuarios,
    usuarios_activos: row.usuariosActivos,
  };
}

function accountToLegacy(row) {
  return {
    id: row.id,
    user_id: row.userId,
    plan: row.planNombre,
    gym_id: row.gymId,
    trainer_id: row.trainerId,
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
  const planes = (await prisma.subscriptionPlan.findMany()).map(planToLegacy);
  const accounts = (await prisma.userAccount.findMany()).map(accountToLegacy);
  const nextId = accounts.length ? Math.max(...accounts.map((a) => a.id)) + 1 : 1;
  return { planes, accounts, nextId };
}

async function upsertPlan(plan) {
  await getPrisma().subscriptionPlan.upsert({
    where: { nombre: plan.nombre },
    create: {
      nombre: plan.nombre,
      programId: plan.program_id || 'virtual_d28d',
      descripcion: plan.descripcion,
      precioMensual: plan.precio_mensual || 0,
      features: plan.features || [],
      maxUsuarios: plan.max_usuarios || 0,
      usuariosActivos: plan.usuarios_activos || 0,
    },
    update: {
      descripcion: plan.descripcion,
      precioMensual: plan.precio_mensual,
      features: plan.features,
      maxUsuarios: plan.max_usuarios,
      usuariosActivos: plan.usuarios_activos,
    },
  });
}

async function createAccount(acc) {
  const row = await getPrisma().userAccount.create({
    data: {
      userId: acc.user_id,
      planNombre: acc.plan,
      gymId: acc.gym_id,
      trainerId: acc.trainer_id,
      precioMensual: acc.precio_mensual || 0,
      metodoPago: acc.metodoPago,
      sesionesRestantes: acc.sesiones_restantes || 0,
      sesionesTotales: acc.sesiones_totales || 0,
      estado: acc.estado || 'activo',
      activo: true,
    },
  });
  return accountToLegacy(row);
}

module.exports = { loadState, upsertPlan, createAccount, planToLegacy, accountToLegacy };
