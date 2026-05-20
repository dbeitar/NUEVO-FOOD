const fs = require('fs');
const path = require('path');
const { getPrisma } = require('../lib/prisma');
const userRepo = require('./repositories/userRepository');
const gymRepo = require('./repositories/gymRepository');
const trainerRepo = require('./repositories/trainerRepository');
const cycleRepo = require('./repositories/cycleRepository');
const domainRepo = require('./repositories/domainDocumentRepository');
const { hydrateAccess, normalizeRoles } = require('../utils/accessControl');

const DATA_DIR = path.join(__dirname, '../../data');

function readJson(name, fallback) {
  const fp = path.join(DATA_DIR, name);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return fallback;
  }
}

async function seedRelationalFromJson() {
  console.log('[seed] Importando JSON → tablas relacionales…');
  const prisma = getPrisma();

  const gyms = readJson('gyms.json', []);
  for (const g of gyms) {
    await prisma.gym.upsert({
      where: { id: g.id },
      create: {
        id: g.id,
        nombre: g.nombre,
        direccion: g.direccion,
        telefono: g.teléfono || g.telefono,
        email: g.email,
        ciudad: g.ciudad,
        pais: g.país || g.pais || 'Colombia',
        latitude: g.latitude,
        longitude: g.longitude,
        capacidadUsuarios: g.capacidad_usuarios ?? 50,
        logoUrl: g.logo_url,
        brandName: g.brand_name,
        brandSlug: g.brand_slug,
        whiteLabelEnabled: Boolean(g.white_label_enabled),
        welcomeMessage: g.welcome_message,
        supportWhatsapp: g.support_whatsapp,
        primaryColor: g.primary_color,
        secondaryColor: g.secondary_color,
        status: g.status || 'active',
        planId: g.plan_id,
        inviteCode: g.invite_code,
        activo: g.activo !== false,
      },
      update: { inviteCode: g.invite_code, activo: g.activo !== false },
    });
  }

  const trainers = readJson('trainers.json', []);
  for (const t of trainers) {
    await prisma.trainer.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        nombre: t.nombre,
        email: t.email,
        telefono: t.teléfono || t.telefono,
        especialidad: t.especialidad,
        certificaciones: t.certificaciones || [],
        experienciaAnos: t.experiencia_años,
        gymId: t.gym_id,
        horarioDisponible: t.horario_disponible,
        tarifaSesion: t.tarifa_sesion,
        inviteCode: t.invite_code,
        activo: t.activo !== false,
      },
      update: { inviteCode: t.invite_code, activo: t.activo !== false },
    });
  }

  const users = readJson('users.json', []);
  for (const u of users) {
    const roles = normalizeRoles(u);
    const access = hydrateAccess({ ...u, roles });
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono,
        claveHash: u.clave_hash || '',
        rol: u.rol || 'usuario_final',
        roles,
        permissions: access.permissions,
        moduleAccess: u.module_access || {},
        gymId: u.gym_id ?? u.gymId,
        trainerId: u.trainer_id,
        planId: u.planId,
        activo: u.activo !== false,
      },
      update: {
        moduleAccess: u.module_access || {},
        roles,
        permissions: access.permissions,
        claveHash: u.clave_hash || undefined,
      },
    });
  }

  const cycles = readJson('cycles.json', []);
  for (const c of cycles) {
    await cycleRepo.upsertLegacy({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      label: c.label || '',
    });
  }

  const collections = [
    'training_plans.json',
    'training_log.json',
    'daily_food_logs.json',
    'exercises_gallery.json',
    'fitness_tests.json',
    'trainer_masters.json',
    'ecosystem_modules.json',
    'program_settings.json',
    'accounts_state.json',
    'user_plans.json',
    'live_classes.json',
    'foods.json',
    'recipes.json',
  ];

  for (const file of collections) {
    const col = file.replace('.json', '');
    const data = readJson(file, null);
    if (data === null) continue;

    if (col === 'foods' && Array.isArray(data)) {
      for (const f of data) {
        await prisma.foodItem.upsert({
          where: { id: f.id },
          create: {
            id: f.id,
            nombre: f.nombre,
            barcode: f.barcode,
            categoria: f.categoria,
            marca: f.marca,
            cantidad: f.cantidad,
            unidad: f.unidad,
            calorias: f.calorias,
            proteina: f.proteina,
            carbohidratos: f.carbohidratos,
            grasas: f.grasas,
            activo: f.activo !== false,
          },
          update: { activo: f.activo !== false },
        });
      }
      continue;
    }

    if (col === 'program_settings' && Array.isArray(data)) {
      for (const p of data) {
        await prisma.programSetting.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            name: p.name,
            color: p.color || '#64748b',
            active: p.active !== false,
            activeCycleId: p.active_cycle_id || 1,
            zoomEmail: p.zoom_email,
            zoomAccounts: p.zoom_accounts,
          },
          update: { active: p.active !== false, activeCycleId: p.active_cycle_id || 1 },
        });
      }
      continue;
    }

    if (col === 'live_classes' && Array.isArray(data)) {
      await domainRepo.setArray('live_classes', data);
      continue;
    }

    if (col === 'accounts_state' && data.accounts) {
      for (const pl of data.planes || []) {
        await prisma.subscriptionPlan.upsert({
          where: { nombre: pl.nombre },
          create: {
            nombre: pl.nombre,
            programId: pl.program_id || 'virtual_d28d',
            descripcion: pl.descripcion,
            precioMensual: pl.precio_mensual || 0,
            features: pl.features || [],
            maxUsuarios: pl.max_usuarios || 0,
            usuariosActivos: pl.usuarios_activos || 0,
          },
          update: { usuariosActivos: pl.usuarios_activos || 0 },
        });
      }
      continue;
    }

    const docCol = col.replace(/-/g, '_');
    await domainRepo.setPayload(docCol === 'accounts_state' ? 'accounts_legacy' : docCol, data);
  }

  console.log('[seed] Importación relacional completada');
}

module.exports = { seedRelationalFromJson };
