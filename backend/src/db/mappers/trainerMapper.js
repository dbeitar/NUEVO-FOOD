function toLegacy(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    teléfono: row.telefono,
    especialidad: row.especialidad,
    certificaciones: Array.isArray(row.certificaciones) ? row.certificaciones : [],
    experiencia_años: row.experienciaAnos,
    gym_id: row.gymId,
    horario_disponible: row.horarioDisponible,
    tarifa_sesion: row.tarifaSesion,
    capacidad_usuarios: row.capacidadUsuarios,
    plan_id: row.planId,
    invite_code: row.inviteCode,
    activo: row.activo,
    creado: row.creado?.toISOString?.() || row.creado,
  };
}

function toPrisma(legacy) {
  return {
    nombre: legacy.nombre,
    email: legacy.email,
    telefono: legacy.teléfono || legacy.telefono || null,
    especialidad: legacy.especialidad || null,
    certificaciones: legacy.certificaciones || [],
    experienciaAnos: legacy.experiencia_años ?? null,
    gymId: legacy.gym_id ?? null,
    horarioDisponible: legacy.horario_disponible || null,
    tarifaSesion: legacy.tarifa_sesion ?? null,
    capacidadUsuarios: legacy.capacidad_usuarios ?? 50,
    planId: legacy.plan_id || null,
    inviteCode: legacy.invite_code || null,
    activo: legacy.activo !== false,
  };
}

module.exports = { toLegacy, toPrisma };
