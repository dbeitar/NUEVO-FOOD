function toLegacy(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    fecha_nacimiento: row.fechaNacimiento
      ? row.fechaNacimiento.toISOString().slice(0, 10)
      : null,
    peso: row.peso != null ? Number(row.peso) : null,
    altura: row.altura != null ? Number(row.altura) : null,
    objetivo: row.objetivo,
    clave_hash: row.claveHash,
    rol: row.rol,
    roles: Array.isArray(row.roles) ? row.roles : [],
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    module_access: row.moduleAccess && typeof row.moduleAccess === 'object' ? row.moduleAccess : {},
    genero: row.genero,
    tiene_restricciones: row.tieneRestricciones,
    restricciones_detalles: row.restriccionesDetalles || '',
    medidas_biomecanicas: row.medidasBiomecanicas,
    experiencia: row.experiencia,
    metodo_entrenamiento: row.metodoEntrenamiento,
    gym_id: row.gymId,
    trainer_id: row.trainerId,
    gymId: row.gymId,
    planId: row.planId,
    activo: row.activo,
    fecha_registro: row.fechaRegistro,
  };
}

function toPrisma(legacy) {
  return {
    nombre: legacy.nombre,
    email: legacy.email,
    telefono: legacy.telefono || null,
    fechaNacimiento: legacy.fecha_nacimiento
      ? new Date(`${legacy.fecha_nacimiento}T00:00:00.000Z`)
      : null,
    peso: legacy.peso ?? null,
    altura: legacy.altura ?? null,
    objetivo: legacy.objetivo || null,
    claveHash: legacy.clave_hash,
    rol: legacy.rol || 'usuario_final',
    roles: legacy.roles || [],
    permissions: legacy.permissions || [],
    moduleAccess: legacy.module_access || {},
    genero: legacy.genero || null,
    tieneRestricciones: Boolean(legacy.tiene_restricciones),
    restriccionesDetalles: legacy.restricciones_detalles || '',
    medidasBiomecanicas: legacy.medidas_biomecanicas || null,
    experiencia: legacy.experiencia || 'principiante',
    metodoEntrenamiento: legacy.metodo_entrenamiento || null,
    gymId: legacy.gym_id ?? legacy.gymId ?? null,
    trainerId: legacy.trainer_id ?? null,
    planId: legacy.planId || null,
    activo: legacy.activo !== false,
  };
}

module.exports = { toLegacy, toPrisma };
