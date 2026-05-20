function toLegacy(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    teléfono: row.telefono,
    email: row.email,
    ciudad: row.ciudad,
    país: row.pais,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    capacidad_usuarios: row.capacidadUsuarios,
    logo_url: row.logoUrl || '',
    brand_name: row.brandName,
    brand_slug: row.brandSlug,
    white_label_enabled: row.whiteLabelEnabled,
    welcome_message: row.welcomeMessage || '',
    support_whatsapp: row.supportWhatsapp || '',
    primary_color: row.primaryColor,
    secondary_color: row.secondaryColor,
    status: row.status,
    plan_id: row.planId,
    invite_code: row.inviteCode,
    activo: row.activo,
    creado: row.creado?.toISOString?.() || row.creado,
  };
}

function toPrisma(legacy) {
  return {
    nombre: legacy.nombre,
    direccion: legacy.direccion || null,
    telefono: legacy.teléfono || legacy.telefono || null,
    email: legacy.email || null,
    ciudad: legacy.ciudad || null,
    pais: legacy.país || legacy.pais || 'Colombia',
    latitude: legacy.latitude ?? null,
    longitude: legacy.longitude ?? null,
    capacidadUsuarios: legacy.capacidad_usuarios ?? 50,
    logoUrl: legacy.logo_url || '',
    brandName: legacy.brand_name || legacy.nombre,
    brandSlug: legacy.brand_slug || null,
    whiteLabelEnabled: Boolean(legacy.white_label_enabled),
    welcomeMessage: legacy.welcome_message || '',
    supportWhatsapp: legacy.support_whatsapp || '',
    primaryColor: legacy.primary_color || '#2563eb',
    secondaryColor: legacy.secondary_color || '#10b981',
    status: legacy.status || 'active',
    planId: legacy.plan_id || null,
    inviteCode: legacy.invite_code || null,
    activo: legacy.activo !== false,
  };
}

module.exports = { toLegacy, toPrisma };
