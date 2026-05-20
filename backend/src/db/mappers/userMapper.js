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

function parseBirthDate(raw) {
  if (!raw || String(raw).trim() === '') return null;
  const iso = String(raw).trim().slice(0, 10);
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPrisma(legacy) {
  return {
    nombre: legacy.nombre,
    email: legacy.email,
    telefono: legacy.telefono || null,
    fechaNacimiento: parseBirthDate(legacy.fecha_nacimiento),
    peso: toNumberOrNull(legacy.peso),
    altura: toNumberOrNull(legacy.altura),
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
