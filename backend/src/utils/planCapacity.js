/** max_usuarios / capacidad 0 o negativo = ilimitado */
function isUnlimitedCapacity(value) {
  const n = Number(value);
  return !Number.isFinite(n) || n <= 0;
}

function isPlanAtCapacity(plan) {
  if (!plan || isUnlimitedCapacity(plan.max_usuarios)) return false;
  return (plan.usuarios_activos || 0) >= plan.max_usuarios;
}

module.exports = { isUnlimitedCapacity, isPlanAtCapacity };
