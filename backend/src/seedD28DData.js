const GymDatabase = require('./models/GymDatabase');
const TrainersDatabase = require('./models/TrainersDatabase');
const LiveClassDatabase = require('./models/LiveClassDatabase');
const ExercisesGalleryStore = require('./models/ExercisesGalleryStore');
const TrainingPlansStore = require('./models/TrainingPlansStore');
const UserDatabase = require('./models/UserDatabase');

const video = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const d28dExercises = [
  ['Sentadilla goblet', 'Pierna'],
  ['Peso muerto rumano con mancuernas', 'Pierna'],
  ['Prensa de pierna', 'Pierna'],
  ['Hip thrust', 'Gluteos'],
  ['Zancadas caminando', 'Pierna'],
  ['Press banca con mancuernas', 'Pecho'],
  ['Press militar sentado', 'Hombro'],
  ['Flexiones', 'Pecho'],
  ['Remo con mancuerna', 'Espalda'],
  ['Jalon al pecho', 'Espalda'],
  ['Face pull', 'Hombro'],
  ['Curl de biceps', 'Brazo'],
  ['Extension de triceps en polea', 'Brazo'],
  ['Plancha frontal', 'Core'],
  ['Crunch abdominal', 'Core'],
  ['Burpees', 'Metabolico'],
  ['Sentadilla con salto', 'Metabolico'],
  ['Mountain climbers', 'Metabolico'],
  ['Elevacion de pantorrilla', 'Pierna'],
  ['Caminata inclinada', 'Cardio'],
];

function ensureGym() {
  const existing = GymDatabase.getAll().find((gym) => gym.brand_slug === 'd28d-marca-blanca' || gym.email === 'operaciones@d28d.fit');
  if (existing) {
    return GymDatabase.update(existing.id, {
      nombre: 'D28D Marca Blanca',
      ciudad: 'Bogota',
      direccion: 'Operacion digital D28D',
      email: 'operaciones@d28d.fit',
      teléfono: '+57 300 280 2800',
      logo_url: 'https://dummyimage.com/280x90/111827/a3e635&text=D28D',
      brand_name: 'D28D',
      brand_slug: 'd28d-marca-blanca',
      white_label_enabled: true,
      welcome_message: 'Bienvenido al ciclo D28D: entrenamiento, pruebas y clases en vivo bajo tu marca.',
      support_whatsapp: '+573002802800',
      primary_color: '#111827',
      secondary_color: '#a3e635',
      status: 'active',
      activo: true,
      plan_id: 'd28d-pro',
    });
  }
  return GymDatabase.create({
    nombre: 'D28D Marca Blanca',
    ciudad: 'Bogota',
    direccion: 'Operacion digital D28D',
    email: 'operaciones@d28d.fit',
    teléfono: '+57 300 280 2800',
    país: 'Colombia',
    capacidad_usuarios: 500,
    logo_url: 'https://dummyimage.com/280x90/111827/a3e635&text=D28D',
    brand_name: 'D28D',
    brand_slug: 'd28d-marca-blanca',
    white_label_enabled: true,
    welcome_message: 'Bienvenido al ciclo D28D: entrenamiento, pruebas y clases en vivo bajo tu marca.',
    support_whatsapp: '+573002802800',
    primary_color: '#111827',
    secondary_color: '#a3e635',
    status: 'active',
    plan_id: 'd28d-pro',
  });
}

function ensureTrainers(gymId) {
  const trainers = [
    ['Alejo D28D', 'alejo@d28d.fit', 'Metodo D28D y bienvenida de ciclos', 'Lunes a viernes 6AM-12PM'],
    ['Laura Fuerza', 'laura.fuerza@d28d.fit', 'Fuerza tren inferior', 'Lunes a viernes 7AM-2PM'],
    ['Nico Metabolico', 'nico.metabolico@d28d.fit', 'HIIT y acondicionamiento', 'Lunes a sabado 5PM-9PM'],
    ['Sofia Mobility', 'sofia.mobility@d28d.fit', 'Movilidad y recuperacion', 'Martes a sabado 6AM-11AM'],
    ['Mateo Performance', 'mateo.performance@d28d.fit', 'Hipertrofia y rendimiento', 'Lunes a viernes 12PM-8PM'],
  ];
  trainers.forEach(([nombre, email, especialidad, horario], index) => {
    const existing = TrainersDatabase.getAll().find((trainer) => trainer.email === email);
    const payload = {
      nombre,
      email,
      teléfono: `+57 300 280 28${String(index).padStart(2, '0')}`,
      especialidad,
      certificaciones: ['D28D Coach', 'Entrenamiento funcional', index % 2 ? 'Fuerza aplicada' : 'Nutricion deportiva'],
      experiencia_años: 4 + index,
      gym_id: gymId,
      horario_disponible: horario,
      tarifa_sesion: 0,
      capacidad_usuarios: 80,
    };
    if (existing) TrainersDatabase.update(existing.id, payload);
    else TrainersDatabase.create(payload);
  });
}

function ensureGallery() {
  d28dExercises.forEach(([name, muscle_group]) => {
    if (!ExercisesGalleryStore.getByExerciseName(name)) {
      ExercisesGalleryStore.create({ name, muscle_group, youtube_url: video, created_by: 1, is_global: true });
    }
  });
}

function makeExercise(name, sets, reps, intensity = 8, notes = '') {
  return {
    exercise_name: name,
    sets,
    reps,
    rest_seconds: 75,
    intensity_type: 'RPE',
    intensity_value: intensity,
    tempo: '2-1-2-0',
    youtube_url: video,
    notes,
  };
}

function buildMonthRoutine() {
  const week = [
    {
      nombre: 'Semana 1 - Base fuerza inferior',
      ejercicios: [
        makeExercise('Sentadilla goblet', 3, '12', 7, 'Tecnica limpia y profundidad controlada.'),
        makeExercise('Peso muerto rumano con mancuernas', 3, '10', 7),
        makeExercise('Prensa de pierna', 3, '12', 8),
        makeExercise('Plancha frontal', 3, '40 seg', 8),
      ],
    },
    {
      nombre: 'Semana 1 - Tren superior',
      ejercicios: [
        makeExercise('Press banca con mancuernas', 3, '10', 8),
        makeExercise('Remo con mancuerna', 3, '12', 8),
        makeExercise('Press militar sentado', 3, '10', 7),
        makeExercise('Face pull', 3, '15', 7),
      ],
    },
    {
      nombre: 'Semana 1 - Metodo D28D metabolico',
      ejercicios: [
        makeExercise('Burpees', 4, '30 seg', 8),
        makeExercise('Sentadilla con salto', 4, '12', 8),
        makeExercise('Mountain climbers', 4, '40 seg', 8),
        makeExercise('Crunch abdominal', 3, '20', 7),
      ],
    },
    {
      nombre: 'Semana 1 - Full body control',
      ejercicios: [
        makeExercise('Hip thrust', 3, '12', 8),
        makeExercise('Jalon al pecho', 3, '12', 8),
        makeExercise('Flexiones', 3, 'max tecnico', 8),
        makeExercise('Elevacion de pantorrilla', 3, '15', 7),
      ],
    },
  ];

  const dias = [];
  for (let block = 0; block < 4; block += 1) {
    week.forEach((day, index) => {
      dias.push({
        dia: dias.length + 1,
        nombre: day.nombre.replace('Semana 1', `Semana ${block + 1}`),
        warmup_url: video,
        stretching_url: video,
        cardio: {
          goal: block < 2 ? 'oxidacion' : 'capacidad aerobica',
          bpm: 125 + block * 5,
          limit_type: 'time',
          limit_value: 18 + block * 2,
        },
        ejercicios: day.ejercicios.map((exercise) => ({
          ...exercise,
          sets: Number(exercise.sets) + (block >= 2 ? 1 : 0),
          intensity_value: Math.min(10, Number(exercise.intensity_value) + block * 0.5),
        })),
      });
    });
  }
  return dias;
}

function ensureTrainingPlan() {
  const user = UserDatabase.getByEmail('cliente@foodplan.local') || UserDatabase.getById(2);
  if (!user) return;
  UserDatabase.update(user.id, { gym_id: 1, gymId: 1, trainer_id: 1, planId: 'd28d-month-template' });
  const existing = TrainingPlansStore.getByUserId(user.id).find((plan) => plan.method === 'D28D rutina mensual');
  if (existing) return;
  TrainingPlansStore.create({
    user_id: user.id,
    trainer_id: 1,
    level: 'intermedio',
    method: 'D28D rutina mensual',
    split_type: '4 semanas / 4 dias',
    dias: buildMonthRoutine(),
  });
}

function seedD28DData() {
  const gym = ensureGym();
  ensureTrainers(gym.id);
  ensureGallery();
  LiveClassDatabase.seedD28DWeek(new Date());
  ensureTrainingPlan();
  return { gym_id: gym.id };
}

module.exports = seedD28DData;
