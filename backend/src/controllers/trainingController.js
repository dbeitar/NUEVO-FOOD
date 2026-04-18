const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const libraryPath = path.join(__dirname, '..', '..', 'data', 'training_library.json');
const rawLibrary = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const EXERCISE_LIBRARY = Array.isArray(rawLibrary?.exercises) ? rawLibrary.exercises : [];

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

function inferMovementPattern(exercise) {
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

function buildCvTrackingLogic(exercise, level) {
  const pattern = inferMovementPattern(exercise);
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

const generatePlanJson = (req, res) => {
  try {
    const level = normalizeLevel(req.body?.level);
    const objective = req.body?.objective || 'hipertrofia';
    const daysAvailable = req.body?.days_available || 4;
    const cfg = LEVEL_CONFIG[level];
    const splitType = resolveSplitType(daysAvailable);
    const splitMultiplier = splitType === 'full_body' ? 1 : splitType === 'upper_lower' ? 1.15 : 1.3;
    const selectedExercises = selectExercises(level, Math.max(5, Math.round(cfg.exerciseCount * splitMultiplier)));

    const exercise_sequence = selectedExercises.map((exercise) => ({
      exercise_name: exercise.exercise_name,
      prescription: buildPrescription(level, objective),
      cv_tracking_logic: buildCvTrackingLogic(exercise, level),
    }));

    return res.json({
      routine_id: randomUUID(),
      exercise_sequence,
    });
  } catch (error) {
    console.error('Error generating training JSON:', error);
    return res.status(500).json({ error: 'Error generando plan de entrenamiento' });
  }
};

module.exports = {
  generatePlanJson,
};
