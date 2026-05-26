const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const ExercisesGalleryStore = require('../models/ExercisesGalleryStore');
const TrainingLogStore = require('../models/TrainingLogStore');
const TrainingPlansStore = require('../models/TrainingPlansStore');
const userDB = require('../models/UserDatabase');
const { filterGalleryItems } = require('../utils/trainingTenantScope');
const { isPlatformAdmin, getUserGymId } = require('../utils/tenantScope');

const libraryPath = path.join(__dirname, '..', '..', 'data', 'training_library.json');
const rawLibrary = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const EXERCISE_LIBRARY = Array.isArray(rawLibrary?.exercises) ? rawLibrary.exercises : [];
const CURRENT_PLANS = new Map();

// Reglas base derivadas del documento "PARTE 2"
const LEVEL_CONFIG = {
  principiante: {
    weeklySetsPerMuscle: 10,
    targetRpe: 7.5,
    defaultSets: 2,
    defaultReps: 12,
    tempo: '3-1-2-0',
    exerciseCount: 6,
  },
  intermedio: {
    weeklySetsPerMuscle: 15,
    targetRpe: 8.5,
    defaultSets: 3,
    defaultReps: 10,
    tempo: '2-1-2-0',
    exerciseCount: 7,
  },
  avanzado: {
    weeklySetsPerMuscle: 20,
    targetRpe: 9.5,
    defaultSets: 4,
    defaultReps: 8,
    tempo: '2-0-1-0',
    exerciseCount: 8,
  },
};

const CATEGORY_PRIORITY = [
  'VARIANTES DE SENTADILLA',
  'VARIANTE PRENSA DE PIERNA',
  'BISAGRA DE CADERA',
  'ISQUIOSURALES',
  'EMPUJE HORIZONTAL',
  'EMPUJE INCLINADO',
  'TRACCIÓN HORIZONTAL',
  'ESPALDA ALTA',
  'DELTOIDES LATERAL',
  'DELTOIDES POSTERIOR',
  'DELTOIDES FRONTAL',
  'BÍCEPS',
  'TRÍCEPS',
  'ABDOMEN',
  'PANTORRILLA',
];

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

function normalizeLevel(input) {
  const raw = normalize(input || '');
  if (raw.includes('PRINCIPIANTE') || raw.includes('0-6') || raw.includes('0 A 6')) return 'principiante';
  if (raw.includes('INTERMEDIO') || raw.includes('1-2') || raw.includes('1 A 2')) return 'intermedio';
  if (raw.includes('AVANZADO') || raw.includes('>2') || raw.includes('MAS DE 2')) return 'avanzado';
  return 'intermedio';
}

function resolveSplitType(daysAvailable) {
  const days = Number(daysAvailable) || 4;
  if (days <= 3) return 'full_body';
  if (days === 4) return 'upper_lower';
  return 'push_pull_legs';
}

// NOTA: las funciones `inferMovementPattern` y `buildCvTrackingLogic` fueron
// retiradas del payload activo (pre-piloto, 2026-05-14) porque exponían lógica
// de computer-vision (MediaPipe-like landmarks, reglas biomecánicas y feedback
// de audio) que la UI no consume. Si en el futuro se decide reactivar pose
// estimation, se vuelve a importar desde el archivo histórico bajo
// `backend/_archive/legacy/` y se conecta detrás de un feature flag.

function _legacyInferMovementPattern(exercise) {
  const name = normalize(exercise.exercise_name);
  const category = normalize(exercise.category);
  const source = `${name} ${category}`;

  if (
    source.includes('SENTADILLA') ||
    source.includes('PRENSA') ||
    source.includes('CUADRICEPS') ||
    source.includes('LUNGE') ||
    source.includes('BULGARA')
  ) {
    return 'squat_knee_dominant';
  }

  if (
    source.includes('PESO MUERTO') ||
    source.includes('BISAGRA') ||
    source.includes('ISQUIOS') ||
    source.includes('EXTENSION CADERA') ||
    source.includes('HIP THRUST')
  ) {
    return 'hinge_hip_dominant';
  }

  if (
    source.includes('EMPUJE') ||
    source.includes('PECTORAL') ||
    source.includes('TRICEPS') ||
    source.includes('DELTOIDES FRONTAL')
  ) {
    return 'upper_push';
  }

  if (
    source.includes('TRACCION') ||
    source.includes('JALON') ||
    source.includes('ESPALDA') ||
    source.includes('BICEPS') ||
    source.includes('PULLOVER') ||
    source.includes('DELTOIDES POSTERIOR')
  ) {
    return 'upper_pull';
  }

  if (source.includes('ABDOMEN') || source.includes('CRUNCH') || source.includes('DRAGON FLAG')) {
    return 'core';
  }

  if (source.includes('PANTORRILLA') || source.includes('TOBILLO')) {
    return 'calf';
  }

  return 'generic';
}

function isBeginnerFriendly(exercise) {
  const name = normalize(exercise.exercise_name);
  const riskyPatterns = [
    'UNILATERAL',
    'AVANZADA',
    'DEADSTOP',
    'DRAGON FLAG',
    'CLUSTER',
    'MYO',
    'REST-PAUSE',
  ];
  if (riskyPatterns.some((p) => name.includes(p))) return false;
  return true;
}

// eslint-disable-next-line no-unused-vars
function _legacyBuildCvTrackingLogic(exercise, level) {
  const pattern = _legacyInferMovementPattern(exercise);
  const category = normalize(exercise.category);
  const isBeginner = level === 'principiante';
  const hasUnilateral = normalize(exercise.exercise_name).includes('UNILATERAL');
  const defaultCamera = isBeginner ? 'lateral' : hasUnilateral ? '45_degrees' : 'lateral';

  if (pattern === 'squat_knee_dominant') {
    return {
      camera_angle_setup: 'lateral',
      primary_landmarks: [23, 24, 25, 26, 27, 28, 29, 30],
      validation_rules: [
        {
          rule: 'depth_check',
          joint_a: 'hip',
          joint_b: 'knee',
          threshold_angle: 95,
          comparison: 'less_than',
        },
        {
          rule: 'torso_alignment',
          joint_a: 'shoulder',
          joint_b: 'hip',
          max_deviation_degrees: 35,
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'Mantén columna neutra y rodillas estables.',
        on_rep_half_way: 'Controla la bajada y sigue.',
        on_velocity_loss: 'Empuja el suelo con más intención.',
      },
    };
  }

  if (pattern === 'hinge_hip_dominant') {
    return {
      camera_angle_setup: 'lateral',
      primary_landmarks: [11, 12, 23, 24, 25, 26, 27, 28],
      validation_rules: [
        {
          rule: 'hip_hinge_check',
          joint_a: 'shoulder',
          joint_b: 'hip',
          threshold_angle: 55,
          comparison: 'greater_than',
        },
        {
          rule: 'spine_neutrality',
          joint_a: 'shoulder',
          joint_b: 'hip',
          max_deviation_degrees: 20,
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'Bisagra de cadera: evita redondear la espalda.',
        on_rep_half_way: 'Lleva la cadera un poco más atrás.',
        on_velocity_loss: 'Sube más explosivo manteniendo técnica.',
      },
    };
  }

  if (pattern === 'upper_push') {
    return {
      camera_angle_setup: isBeginner ? 'frontal' : defaultCamera,
      primary_landmarks: [11, 12, 13, 14, 15, 16, 23, 24],
      validation_rules: [
        {
          rule: 'elbow_tracking',
          joint_a: 'shoulder',
          joint_b: 'elbow',
          max_deviation_degrees: 25,
        },
        {
          rule: 'scapular_control',
          joint_a: 'shoulder',
          joint_b: 'hip',
          max_deviation_degrees: 20,
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'Estabiliza escápulas y controla los codos.',
        on_rep_half_way: 'Recorre completo con control.',
        on_velocity_loss: 'Empuja con más intención en la fase concéntrica.',
      },
    };
  }

  if (pattern === 'upper_pull') {
    return {
      camera_angle_setup: isBeginner ? 'frontal' : defaultCamera,
      primary_landmarks: [11, 12, 13, 14, 15, 16, 23, 24],
      validation_rules: [
        {
          rule: 'elbow_path',
          joint_a: 'elbow',
          joint_b: 'shoulder',
          max_deviation_degrees: 30,
        },
        {
          rule: 'trunk_stability',
          joint_a: 'shoulder',
          joint_b: 'hip',
          max_deviation_degrees: 18,
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'No balancees el torso, tracciona con control.',
        on_rep_half_way: 'Aprieta escápulas al final.',
        on_velocity_loss: 'Acelera ligeramente la tracción.',
      },
    };
  }

  if (pattern === 'core') {
    return {
      camera_angle_setup: 'frontal',
      primary_landmarks: [11, 12, 23, 24, 25, 26],
      validation_rules: [
        {
          rule: 'lumbar_control',
          joint_a: 'shoulder',
          joint_b: 'hip',
          max_deviation_degrees: 20,
        },
        {
          rule: 'hip_control',
          joint_a: 'hip',
          joint_b: 'knee',
          threshold_angle: 80,
          comparison: 'greater_than',
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'Controla el core, evita compensar con lumbar.',
        on_rep_half_way: 'Mantén tensión abdominal.',
        on_velocity_loss: 'No pierdas ritmo: exhala y ejecuta.',
      },
    };
  }

  if (pattern === 'calf') {
    return {
      camera_angle_setup: 'lateral',
      primary_landmarks: [25, 26, 27, 28, 29, 30, 31, 32],
      validation_rules: [
        {
          rule: 'ankle_rom',
          joint_a: 'knee',
          joint_b: 'ankle',
          threshold_angle: 65,
          comparison: 'greater_than',
        },
        {
          rule: 'balance_control',
          joint_a: 'hip',
          joint_b: 'ankle',
          max_deviation_degrees: 15,
        },
      ],
      real_time_audio_feedback: {
        on_error_posture: 'Alinea tobillo-rodilla-cadera.',
        on_rep_half_way: 'Busca más rango en el tobillo.',
        on_velocity_loss: 'Sube con más energía y controla la bajada.',
      },
    };
  }

  return {
    camera_angle_setup: defaultCamera,
    primary_landmarks: category.includes('DELTOIDES')
      ? [11, 12, 13, 14, 15, 16, 23, 24]
      : [11, 12, 23, 24, 25, 26, 27, 28],
    validation_rules: [
      {
        rule: 'posture_control',
        joint_a: 'shoulder',
        joint_b: 'hip',
        max_deviation_degrees: 20,
      },
      {
        rule: 'rom_control',
        joint_a: 'hip',
        joint_b: 'knee',
        threshold_angle: 90,
        comparison: 'greater_than',
      },
    ],
    real_time_audio_feedback: {
      on_error_posture: 'Ajusta postura y controla la técnica.',
      on_rep_half_way: 'Mantén rango completo.',
      on_velocity_loss: 'Aumenta intención sin perder control.',
    },
  };
}

function scoreExerciseForLevel(exercise, level) {
  const category = normalize(exercise.category);
  let score = CATEGORY_PRIORITY.length;
  const idx = CATEGORY_PRIORITY.findIndex((c) => normalize(c) === category);
  if (idx >= 0) score = idx;

  if (level === 'principiante') {
    if (!isBeginnerFriendly(exercise)) score += 100;
    const name = normalize(exercise.exercise_name);
    if (name.includes('MAQUINA') || name.includes('SMITH')) score -= 2;
  }
  return score;
}

function selectExercises(level, count) {
  const pool = [...EXERCISE_LIBRARY]
    .filter((e) => e.exercise_name && e.category)
    .sort((a, b) => scoreExerciseForLevel(a, level) - scoreExerciseForLevel(b, level));

  const selected = [];
  const usedCategories = new Set();
  for (const ex of pool) {
    const cat = normalize(ex.category);
    if (!usedCategories.has(cat) || selected.length < Math.min(count, 5)) {
      selected.push(ex);
      usedCategories.add(cat);
    }
    if (selected.length >= count) break;
  }

  if (selected.length < count) {
    for (const ex of pool) {
      if (!selected.find((s) => s.exercise_name === ex.exercise_name)) {
        selected.push(ex);
      }
      if (selected.length >= count) break;
    }
  }

  return selected.slice(0, count);
}

function buildPrescription(level, objective) {
  const cfg = LEVEL_CONFIG[level];
  let reps = cfg.defaultReps;
  let tempo = cfg.tempo;
  if (normalize(objective).includes('FUERZA')) {
    reps = Math.max(5, cfg.defaultReps - 3);
    tempo = '2-1-1-0';
  }
  if (normalize(objective).includes('RESISTENCIA')) {
    reps = cfg.defaultReps + 3;
    tempo = '2-1-2-1';
  }
  return {
    sets: cfg.defaultSets,
    reps,
    target_rpe: cfg.targetRpe,
    tempo,
  };
}

function buildRoutine(level, objective, daysAvailable) {
  const cfg = LEVEL_CONFIG[level];
  const splitType = resolveSplitType(daysAvailable);
  const splitMultiplier = splitType === 'full_body' ? 1 : splitType === 'upper_lower' ? 1.15 : 1.3;
  const selectedExercises = selectExercises(level, Math.max(5, Math.round(cfg.exerciseCount * splitMultiplier)));

  const exercise_sequence = selectedExercises.map((exercise) => ({
    exercise_name: exercise.exercise_name,
    prescription: buildPrescription(level, objective),
  }));

  return {
    routine_id: randomUUID(),
    split_type: splitType,
    exercise_sequence,
  };
}

function splitDayNames(splitType, days) {
  if (splitType === 'full_body') {
    return Array.from({ length: days }, (_, i) => `Full Body ${i + 1}`);
  }
  if (splitType === 'upper_lower') {
    const order = ['Upper A', 'Lower A', 'Upper B', 'Lower B'];
    return Array.from({ length: days }, (_, i) => order[i % order.length]);
  }
  const order = ['Push', 'Pull', 'Legs', 'Push 2', 'Pull 2', 'Legs 2'];
  return Array.from({ length: days }, (_, i) => order[i % order.length]);
}

function attachGalleryData(exerciseObj, user = null) {
  if (user) {
    const items = filterGalleryItems(ExercisesGalleryStore.getAll(), user);
    const key = normalize(exerciseObj.exercise_name);
    const scoped = items.find((i) => normalize(i.name) === key);
    if (scoped) {
      return {
        ...exerciseObj,
        youtube_url: scoped.youtube_url || null,
        muscle_group: scoped.muscle_group || null,
      };
    }
  }
  const item = ExercisesGalleryStore.getByExerciseName(exerciseObj.exercise_name);
  return {
    ...exerciseObj,
    youtube_url: item?.youtube_url || null,
    muscle_group: item?.muscle_group || null,
  };
}

const generatePlanJson = (req, res) => {
  try {
    const level = normalizeLevel(req.body?.level);
    const objective = req.body?.objective || 'hipertrofia';
    const daysAvailable = req.body?.days_available || 4;
    const routine = buildRoutine(level, objective, daysAvailable);
    return res.json(routine);
  } catch (error) {
    console.error('Error generating training JSON:', error);
    return res.status(500).json({ error: 'Error generando plan de entrenamiento' });
  }
};

const generateDailyPlan = async (req, res) => {
  try {
    const method = req.user?.metodo_entrenamiento || req.body.method || req.body.objective || 'hipertrofia';
    const level = normalizeLevel(req.body.level || req.user?.experiencia || 'intermedio');
    const days = Math.min(6, Math.max(2, Number(req.body.days_available || 4)));
    const routine = buildRoutine(level, method, days);
    const names = splitDayNames(routine.split_type, days);
    const chunkSize = Math.ceil(routine.exercise_sequence.length / days);
    const dias = [];
    for (let i = 0; i < days; i++) {
      const start = i * chunkSize;
      const end = start + chunkSize;
      dias.push({
        dia: i + 1,
        nombre: names[i],
        completado: false,
        ejercicios: routine.exercise_sequence.slice(start, end).map((ex) => attachGalleryData(ex, req.user)),
      });
    }

    const payload = {
      success: true,
      message: 'Plan de entrenamiento día a día generado.',
      data: {
        metodo: method,
        level,
        split_type: routine.split_type,
        routine_id: routine.routine_id,
        dias,
      },
    };
    if (req.user?.id) {
      CURRENT_PLANS.set(req.user.id, payload.data);
    }
    return res.json({
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error generando plan.' });
  }
};

function enrichPlanDaysWithGallery(plan, user) {
  if (!plan?.dias?.length) return plan;
  return {
    ...plan,
    dias: plan.dias.map((d) => ({
      ...d,
      ejercicios: (d.ejercicios || []).map((ex) => {
        const enriched = attachGalleryData(
          { exercise_name: ex.exercise_name, youtube_url: ex.youtube_url },
          user,
        );
        return {
          ...ex,
          youtube_url: enriched.youtube_url || ex.youtube_url || null,
          muscle_group: enriched.muscle_group || ex.muscle_group || null,
        };
      }),
    })),
  };
}

const getMyAssignedPlan = async (req, res) => {
  try {
    const assigned = TrainingPlansStore.getActiveByUserId(req.user?.id);
    if (!assigned) {
      return res.json({ success: true, plan: null });
    }
    return res.json({
      success: true,
      plan: enrichPlanDaysWithGallery(assigned, req.user),
      source: 'coach_assigned',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo plan asignado.' });
  }
};

const getMyCurrentPlan = async (req, res) => {
  try {
    const assigned = TrainingPlansStore.getActiveByUserId(req.user?.id);
    if (assigned) {
      return res.json({
        success: true,
        plan: enrichPlanDaysWithGallery(assigned, req.user),
        source: 'coach_assigned',
      });
    }
    const current = CURRENT_PLANS.get(req.user?.id);
    if (!current) {
      return res.json({ success: true, plan: null, message: 'Tu entrenador aún no te ha asignado un plan.' });
    }
    return res.json({ success: true, plan: enrichPlanDaysWithGallery(current, req.user), source: 'session' });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo el plan actual.' });
  }
};

const substituteExercise = async (req, res) => {
  try {
    const { exercise, cause } = req.body;
    await ExercisesGalleryStore.hydrate?.();
    const all = ExercisesGalleryStore.getAll();
    const gallery = filterGalleryItems(all, req.user);
    const athleteSubstitution = require('../services/athleteSubstitutionService');
    const result = athleteSubstitution.suggestSubstitutions({
      galleryItems: gallery,
      exerciseName: exercise,
      cause,
      limit: 4,
    });

    return res.json({
      success: true,
      substitution: result.primary,
      alternatives: result.alternatives,
      meta: result.meta,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Error al consultar el asistente IA.' });
  }
};

const { isCoachUser, getCoachTrainerId, sanitizeModuleAccessForCoachClient } = require('../utils/coachScope');
const { buildListFilter } = require('../utils/d28dRoutineAccess');
const routineService = require('../services/d28dRoutineService');

const GALLERY_VIEW_ROLES = [
  'super_admin', 'admin_gimnasio', 'admin_marca', 'admin_d28d',
  'admin_training', 'admin_entrenador', 'entrenador', 'nutricionista',
];
const GALLERY_WRITE_ROLES = [
  'super_admin', 'admin_gimnasio', 'admin_marca',
  'admin_training', 'admin_entrenador', 'entrenador', 'nutricionista',
];

function userHasGalleryRole(user, rolesList) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.rol];
  return roles.some((r) => rolesList.includes(r));
}

const getAdminGallery = async (req, res) => {
  try {
    if (!userHasGalleryRole(req.user, GALLERY_VIEW_ROLES)) {
      return res.status(403).json({ error: 'No tienes permisos para ver la galería' });
    }
    const data = filterGalleryItems(ExercisesGalleryStore.getAll(), req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo galería' });
  }
};

const createAdminGallery = async (req, res) => {
  try {
    if (!userHasGalleryRole(req.user, GALLERY_WRITE_ROLES)) {
      return res.status(403).json({ error: 'No tienes permisos para crear en la galería' });
    }
    const { name, muscle_group = '', youtube_url, is_global = true } = req.body || {};
    if (!name || !youtube_url) {
      return res.status(400).json({ error: 'name y youtube_url son requeridos' });
    }
    const coachTid = getCoachTrainerId(req.user);
    if (isCoachUser(req.user) && coachTid == null) {
      return res.status(400).json({ error: 'Cuenta sin entrenador vinculado' });
    }
    const created = ExercisesGalleryStore.create({
      name,
      muscle_group,
      youtube_url,
      is_global: isCoachUser(req.user) ? false : (isPlatformAdmin(req.user) ? is_global : false),
      created_by: req.user.id,
      gym_id: isCoachUser(req.user) ? null : getUserGymId(req.user),
      trainer_id: coachTid,
    });
    if (created?.error) {
      return res.status(409).json({ error: created.error });
    }
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ error: 'Error creando registro en la galería' });
  }
};

const updateAdminGallery = async (req, res) => {
  try {
    if (!userHasGalleryRole(req.user, GALLERY_WRITE_ROLES)) {
      return res.status(403).json({ error: 'No tienes permisos para editar la galería' });
    }
    const id = Number(req.params.id);
    const current = ExercisesGalleryStore.getById(id);
    if (!current) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    const visible = filterGalleryItems([current], req.user);
    if (!visible.length) {
      return res.status(403).json({ error: 'No puedes editar este registro' });
    }
    const { name, muscle_group, youtube_url, is_global } = req.body || {};
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (muscle_group !== undefined) patch.muscle_group = muscle_group;
    if (youtube_url !== undefined) patch.youtube_url = youtube_url;
    if (isCoachUser(req.user)) {
      patch.is_global = false;
      patch.trainer_id = getCoachTrainerId(req.user);
    } else if (is_global !== undefined && isPlatformAdmin(req.user)) {
      patch.is_global = is_global;
    }
    const updated = ExercisesGalleryStore.update(id, patch);
    if (updated?.error) {
      return res.status(409).json({ error: updated.error });
    }
    if (!updated) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Error actualizando registro de galería' });
  }
};

const deleteAdminGallery = async (req, res) => {
  try {
    if (!userHasGalleryRole(req.user, GALLERY_WRITE_ROLES)) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar en la galería' });
    }
    const current = ExercisesGalleryStore.getById(Number(req.params.id));
    if (!current) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    const visible = filterGalleryItems([current], req.user);
    if (!visible.length) {
      return res.status(403).json({ error: 'No puedes eliminar este registro' });
    }
    const ok = ExercisesGalleryStore.delete(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error eliminando registro de galería' });
  }
};

const getPublicGallery = async (req, res) => {
  try {
    const all = ExercisesGalleryStore.getAll();
    const data = filterGalleryItems(all, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ error: 'Error obteniendo galería' });
  }
};

const createUserLog = (req, res) => {
  try {
    const user_id = req.user.id;
    const { plan_id, dia, ejercicios, completado, duration_minutes, wellness } = req.body;

    const log = TrainingLogStore.create({
      user_id,
      plan_id,
      dia,
      ejercicios,
      completado,
      duration_minutes,
      trainer_notes: '',
      wellness,
    });

    const athlete = userDB.getById(user_id);
    if (athlete) {
      const { notifyCoachOnAthleteLog } = require('../services/coachTrainingService');
      notifyCoachOnAthleteLog(athlete, log);
    }

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    console.error('Error createUserLog:', error);
    res.status(500).json({ error: 'Error guardando bitácora de entrenamiento.' });
  }
};

const coachAiSuggestRoutine = async (req, res) => {
  try {
    if (!isCoachUser(req.user)) {
      return res.status(403).json({ error: 'Solo entrenadores pueden usar este asistente' });
    }
    const tid = getCoachTrainerId(req.user);
    if (tid == null) {
      return res.status(400).json({ error: 'Cuenta sin entrenador vinculado' });
    }
    const {
      objetivo = 'hipertrofia',
      nivel = 'intermedio',
      dias = 4,
      notas = '',
    } = req.body || {};
    const ExercisesGalleryStore = require('../models/ExercisesGalleryStore');
    const coachAi = require('../services/coachAiTrainingService');
    await ExercisesGalleryStore.hydrate?.();
    const { filterGalleryItems } = require('../utils/trainingTenantScope');
    const gallery = filterGalleryItems(ExercisesGalleryStore.getAll(), req.user)
      .filter((g) => g?.name)
      .map((g) => ({
        name: String(g.name).replace(/\s+/g, ' ').trim(),
        muscle_group: String(g.muscle_group || '').replace(/\s+/g, ' ').trim(),
        youtube_url: g.youtube_url || null,
      }));

    const params = { objetivo, nivel, dias, notas };
    const built = coachAi.buildDaysFromGallery(gallery, params);
    const daysCount = built.daysCount;
    const routineName = `IA · ${objetivo} · ${nivel} · ${daysCount} días`;

    const { normalizeRoutineInput } = require('../shared/routineTemplateModel');
    const payload = normalizeRoutineInput({
      nombre: routineName,
      categoria: 'IA',
      subcategoria: 'Clase virtual',
      objetivo,
      nivel,
      duracion: '60-75 min',
      descripcion: [
        built.motivo,
        `Especialista: ${coachAi.SPECIALIST_PERSONA.slice(0, 140)}…`,
      ].join(' '),
      scope: 'coach_wl',
      blocks: built.blocks,
    });

    const created = await routineService.createRoutine(payload, req.user.id, tid);
    const mainCount = built.dias.reduce(
      (s, d) => s + d.ejercicios.filter((e) => e.block_type === 'principal').length,
      0,
    );

    return res.json({
      success: true,
      data: {
        routine_id: created?.id,
        nombre: created?.nombre || routineName,
        categoria: created?.categoria || 'IA',
        nivel,
        duracion: '60-75 min',
        objetivo,
        bloques_count: built.blocks.length,
        ejercicios_count: mainCount,
        ejercicios_preview: built.dias.flatMap((d) =>
          d.ejercicios.filter((e) => e.block_type === 'principal').map((e) => e.exercise_name),
        ).slice(0, 12),
        motivo: built.motivo,
        dias_sugeridos: daysCount,
        reglas: {
          min_ejercicios_por_dia: built.levelRule.minMain,
          incluye: ['calentamiento', 'principal', 'cardio_pulsaciones', 'estiramiento'],
          intensidad: 'RPE/RIR',
        },
        specialist_prompt: built.specialist_prompt,
        split: built.split,
        dias_preview: built.dias,
      },
    });
  } catch (error) {
    console.error('coachAiSuggestRoutine:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Error del asistente IA' });
  }
};

module.exports = {
  generatePlanJson,
  generateDailyPlan,
  getMyAssignedPlan,
  getMyCurrentPlan,
  substituteExercise,
  getAdminGallery,
  createAdminGallery,
  updateAdminGallery,
  deleteAdminGallery,
  getPublicGallery,
  createUserLog,
  coachAiSuggestRoutine,
};
