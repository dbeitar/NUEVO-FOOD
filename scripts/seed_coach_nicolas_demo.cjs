#!/usr/bin/env node
/**
 * Seed: entrenador Nicolas del Rio + cliente John + rutina + seguimiento ~30 días.
 * Uso: node scripts/seed_coach_nicolas_demo.cjs
 */
const path = require('path');
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));

require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const COACH_EMAIL = process.env.SEED_COACH_EMAIL || 'nicolasdelrio@foodplan.local';
const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD || 'nicolas123';
const COACH_NAME = 'Nicolas del Rio';
const CLIENT_EMAIL = 'johnnicolasdelrio718@gmail.com';
const CLIENT_PASSWORD = 'nicolas231223';
const CLIENT_NAME = 'John Nicolas del Rio';

async function main() {
  const userDB = require('../backend/src/models/UserDatabase');
  const TrainersDatabase = require('../backend/src/models/TrainersDatabase');
  const TrainingPlansStore = require('../backend/src/models/TrainingPlansStore');
  const TrainingLogStore = require('../backend/src/models/TrainingLogStore');
  const BodyMeasurementStore = require('../backend/src/models/BodyMeasurementStore');
  const licenseService = require('../backend/src/services/licenseService');
  const { useRelationalStorage } = require('../backend/src/utils/storageMode');

  await TrainersDatabase.hydrate?.();
  await userDB.hydrate?.();
  await TrainingPlansStore.hydrate?.();
  await TrainingLogStore.hydrateFromRelational?.();
  await BodyMeasurementStore.hydrate?.();

  const hash = async (pwd) => bcrypt.hash(pwd, 10);
  const { getPrisma } = require('../backend/src/lib/prisma');
  const { toLegacy: trainerToLegacy } = require('../backend/src/db/mappers/trainerMapper');

  let trainer = TrainersDatabase.getAll().find(
    (t) => String(t.email || '').toLowerCase() === COACH_EMAIL.toLowerCase()
      || String(t.nombre || '').toLowerCase().includes('nicolas del rio'),
  );

  if (useRelationalStorage()) {
    const prisma = getPrisma();
    let row = await prisma.trainer.findFirst({
      where: { email: COACH_EMAIL, activo: true },
    });
    if (!row) {
      await prisma.$executeRawUnsafe(
        "SELECT setval(pg_get_serial_sequence('trainers', 'id'), COALESCE((SELECT MAX(id) FROM trainers), 1))",
      );
      row = await prisma.trainer.create({
        data: {
          nombre: COACH_NAME,
          email: COACH_EMAIL,
          especialidad: 'Hipertrofia y recomposición',
          inviteCode: `COACH-NICOLAS-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          capacidadUsuarios: 100,
          gymId: null,
          activo: true,
        },
      });
      console.log('Entrenador PG creado:', row.id, row.email);
    } else {
      row = await prisma.trainer.update({
        where: { id: row.id },
        data: {
          nombre: COACH_NAME,
          inviteCode: row.inviteCode || 'COACH-NICOLAS-DELRIO',
        },
      });
      console.log('Entrenador PG existente:', row.id, row.email);
    }
    trainer = trainerToLegacy(row);
    const mem = TrainersDatabase.getById(trainer.id);
    if (!mem) {
      TrainersDatabase.trainers.push(trainer);
    }
  } else if (!trainer) {
    trainer = TrainersDatabase.create({
      nombre: COACH_NAME,
      email: COACH_EMAIL,
      especialidad: 'Hipertrofia y recomposición',
      invite_code: 'COACH-NICOLAS-DELRIO',
      capacidad_usuarios: 100,
      gym_id: null,
    });
    console.log('Entrenador creado:', trainer.id, trainer.email);
  } else {
    console.log('Entrenador existente:', trainer.id, trainer.email);
  }

  const coachModuleAccess = {
    gym: false,
    d28d: false,
    training: true,
    nutrition: true,
    food_plan: true,
    live_classes: false,
  };

  let coachUser = userDB.getByEmail(COACH_EMAIL);
  if (!coachUser) {
    coachUser = await userDB.create({
      nombre: COACH_NAME,
      email: COACH_EMAIL,
      clave_hash: await hash(COACH_PASSWORD),
      rol: 'entrenador',
      roles: ['entrenador'],
      gym_id: null,
      trainer_id: trainer.id,
      module_access: coachModuleAccess,
      planId: null,
    });
    console.log('Usuario entrenador creado:', coachUser.id);
  } else {
    userDB.update(coachUser.id, {
      nombre: COACH_NAME,
      clave_hash: await hash(COACH_PASSWORD),
      rol: 'entrenador',
      roles: ['entrenador'],
      trainer_id: trainer.id,
      module_access: coachModuleAccess,
      planId: null,
    });
    coachUser = userDB.getById(coachUser.id);
    console.log('Usuario entrenador actualizado:', coachUser.id);
  }
  await licenseService.syncFromModuleAccess(coachUser.id, coachModuleAccess, 'seed');

  let client = userDB.getByEmail(CLIENT_EMAIL);
  const clientAccess = {
    gym: false,
    d28d: false,
    training: true,
    nutrition: true,
    food_plan: true,
    live_classes: false,
  };
  if (!client) {
    client = await userDB.create({
      nombre: CLIENT_NAME,
      email: CLIENT_EMAIL,
      clave_hash: await hash(CLIENT_PASSWORD),
      rol: 'usuario_final',
      roles: ['usuario_final'],
      gym_id: null,
      trainer_id: trainer.id,
      module_access: clientAccess,
      planId: null,
    });
    console.log('Cliente creado:', client.id);
  } else {
    userDB.update(client.id, {
      trainer_id: trainer.id,
      clave_hash: await hash(CLIENT_PASSWORD),
      module_access: clientAccess,
      planId: null,
    });
    client = userDB.getById(client.id);
    console.log('Cliente actualizado:', client.id);
  }
  await licenseService.syncFromModuleAccess(client.id, clientAccess, 'seed');

  const planDias = [
    {
      dia: 1,
      nombre: 'Semana 1 — Tren superior',
      ejercicios: [
        { exercise_name: 'Press banca con mancuernas', sets: 4, reps: '10', rest_seconds: 90, intensity_type: 'RPE', intensity_value: 7, notes: '' },
        { exercise_name: 'Remo con barra', sets: 4, reps: '10', rest_seconds: 90, intensity_type: 'RPE', intensity_value: 7, notes: '' },
        { exercise_name: 'Press militar', sets: 3, reps: '12', rest_seconds: 75, intensity_type: 'RPE', intensity_value: 7, notes: '' },
        { exercise_name: 'Curl bíceps', sets: 3, reps: '12', rest_seconds: 60, intensity_type: 'RPE', intensity_value: 7, notes: '' },
      ],
    },
    {
      dia: 2,
      nombre: 'Semana 1 — Tren inferior',
      ejercicios: [
        { exercise_name: 'Sentadilla trasera', sets: 4, reps: '8', rest_seconds: 120, intensity_type: 'RPE', intensity_value: 8, notes: '' },
        { exercise_name: 'Peso muerto rumano', sets: 3, reps: '10', rest_seconds: 90, intensity_type: 'RPE', intensity_value: 7, notes: '' },
        { exercise_name: 'Zancadas caminando', sets: 3, reps: '12', rest_seconds: 75, intensity_type: 'RPE', intensity_value: 7, notes: '' },
      ],
    },
    {
      dia: 3,
      nombre: 'Semana 2 — Full body',
      ejercicios: [
        { exercise_name: 'Dominadas asistidas', sets: 4, reps: '8', rest_seconds: 90, intensity_type: 'RPE', intensity_value: 7, notes: '' },
        { exercise_name: 'Hip thrust', sets: 4, reps: '10', rest_seconds: 90, intensity_type: 'RPE', intensity_value: 8, notes: '' },
        { exercise_name: 'Press inclinado', sets: 3, reps: '10', rest_seconds: 75, intensity_type: 'RPE', intensity_value: 7, notes: '' },
      ],
    },
    {
      dia: 4,
      nombre: 'Semana 3 — Metabólico + fuerza',
      ejercicios: [
        { exercise_name: 'Peso muerto convencional', sets: 4, reps: '6', rest_seconds: 150, intensity_type: 'RPE', intensity_value: 8, notes: '' },
        { exercise_name: 'Press banca', sets: 4, reps: '8', rest_seconds: 120, intensity_type: 'RPE', intensity_value: 8, notes: '' },
        { exercise_name: 'Remo en polea', sets: 3, reps: '12', rest_seconds: 75, intensity_type: 'RPE', intensity_value: 7, notes: '' },
      ],
    },
  ];

  let plan = TrainingPlansStore.getActiveByUserId(client.id);
  if (!plan) {
    plan = TrainingPlansStore.create({
      user_id: client.id,
      trainer_id: trainer.id,
      level: 'intermedio',
      method: 'Plan Nicolas del Rio',
      split_type: '4 días / mes',
      dias: planDias,
    });
    console.log('Plan de entrenamiento creado:', plan.id);
  } else {
    TrainingPlansStore.update(plan.id, {
      trainer_id: trainer.id,
      dias: planDias,
      method: 'Plan Nicolas del Rio',
    });
    plan = TrainingPlansStore.getById(plan.id);
    console.log('Plan actualizado:', plan.id);
  }

  const existingLogs = TrainingLogStore.getByUserId(client.id);
  if (existingLogs.length < 20) {
    const start = new Date();
    start.setDate(start.getDate() - 28);
    for (let d = 0; d < 28; d += 2) {
      const fecha = new Date(start);
      fecha.setDate(start.getDate() + d);
      const fechaStr = fecha.toISOString().split('T')[0];
      if (TrainingLogStore.getByUserAndDate(client.id, fechaStr).length) continue;
      const diaPlan = planDias[d % planDias.length];
      TrainingLogStore.create({
        user_id: client.id,
        plan_id: plan.id,
        dia: diaPlan.dia,
        fecha: fechaStr,
        completado: d % 4 !== 3,
        duration_minutes: 45 + (d % 3) * 10,
        trainer_notes: d % 6 === 0 ? 'Buen control técnico. Subir carga la próxima sesión.' : '',
        wellness: {
          sleep_hours: 6.5 + (d % 3) * 0.5,
          sleep_quality: 6 + (d % 4),
          stress_level: 3 + (d % 5),
          energy_level: 7 + (d % 3),
          appetite: 7,
          soreness: 2 + (d % 4),
        },
        ejercicios: (diaPlan.ejercicios || []).map((ex) => ({
          exercise_name: ex.exercise_name,
          sets_done: ex.sets,
          reps_done: ex.reps,
          weight_kg: 20 + d,
          intensity_actual: `RPE ${ex.intensity_value || 7}`,
          notes: ex.notes || '',
        })),
      });
    }
    console.log('Logs de seguimiento generados (~1 mes)');
  } else {
    console.log('Logs ya existentes:', existingLogs.length);
  }

  const existingMeas = BodyMeasurementStore.getByUserId(client.id);
  if (existingMeas.length < 4) {
    const base = new Date();
    for (let w = 0; w < 4; w += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - w * 7);
      const fecha = d.toISOString().split('T')[0];
      if (BodyMeasurementStore.getByUserId(client.id).some((m) => m.recorded_at === fecha)) continue;
      BodyMeasurementStore.create({
        user_id: client.id,
        recorded_at: fecha,
        weight_kg: 78 - w * 0.4,
        chest_cm: 102 - w * 0.2,
        abdomen_navel_cm: 86 - w * 0.3,
        right_thigh_cm: 58 + w * 0.1,
        notes: w === 0 ? 'Control semanal demo' : '',
      });
    }
    console.log('Medidas corporales demo generadas');
  }

  if (useRelationalStorage()) {
    try {
      const routineService = require('../backend/src/services/d28dRoutineService');
      const { normalizeRoutineInput } = require('../backend/src/shared/routineTemplateModel');
      const payload = normalizeRoutineInput({
        nombre: 'Rutina completa — Nicolas del Rio',
        categoria: 'Fuerza',
        subcategoria: 'Hipertrofia',
        objetivo: 'hipertrofia',
        nivel: 'intermedio',
        duracion: '60 min',
        descripcion: 'Plantilla demo para clientes marca blanca',
        scope: 'coach_wl',
        blocks: [
          {
            tipo: 'BLOQUE_LIBRE',
            orden: 0,
            nombre: 'Calentamiento',
            exercises: [{ nombre: 'Movilidad articular', series: '1', repeticiones: '10', orden: 0 }],
          },
          {
            tipo: 'SUPER_SET',
            orden: 1,
            nombre: 'Bloque principal',
            exercises: [
              { nombre: 'Sentadilla', series: '4', repeticiones: '8', descanso: '120s', orden: 0 },
              { nombre: 'Press banca', series: '4', repeticiones: '10', descanso: '90s', orden: 1 },
            ],
          },
        ],
      });
      const created = await routineService.createRoutine(payload, coachUser.id, trainer.id);
      console.log('Rutina D28D coach creada:', created?.id);
    } catch (e) {
      console.warn('Rutina PostgreSQL (opcional):', e.message);
    }
  }

  console.log('\n--- Credenciales ---');
  console.log('Entrenador:', COACH_EMAIL, '/', COACH_PASSWORD);
  console.log('Cliente:', CLIENT_EMAIL, '/', CLIENT_PASSWORD);
  console.log('Invite code:', trainer.invite_code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
