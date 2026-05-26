const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../backend/data/training_plans.json');

const baseRoutines = [
  {
    id: 100,
    nombre: "FullBody - Fuerza Base (3 Días)",
    user_id: 3, // Cesar Gomez
    level: "principiante/intermedio",
    method: "Fuerza/Hipertrofia",
    split_type: "FullBody",
    dias: [
      {
        dia: 1,
        nombre: "Día 1: Empuje + Tracción + Pierna",
        warmup_url: null,
        ejercicios: [
          { exercise_name: "Sentadilla con Barra", sets: 3, reps: "8-10", rest_seconds: 90, intensity_type: "RPE", intensity_value: 8 },
          { exercise_name: "Press de Banca", sets: 3, reps: "8-10", rest_seconds: 90, intensity_type: "RPE", intensity_value: 8 },
          { exercise_name: "Remo con Barra", sets: 3, reps: "10-12", rest_seconds: 60, intensity_type: "RPE", intensity_value: 8 },
          { exercise_name: "Press Militar", sets: 2, reps: "10-12", rest_seconds: 60, intensity_type: "RPE", intensity_value: 7 }
        ]
      },
      {
        dia: 2,
        nombre: "Día 2: Descanso Activo / Cardio",
        cardio: { goal: 'recuperación', bpm: 120, limit_type: 'time', limit_value: 30 },
        ejercicios: []
      },
      {
        dia: 3,
        nombre: "Día 3: Tracción Posterior + Empuje Vertical",
        ejercicios: [
          { exercise_name: "Peso Muerto Rumano", sets: 3, reps: "10-12", rest_seconds: 90, intensity_type: "RPE", intensity_value: 8 },
          { exercise_name: "Dominadas / Jalón al Pecho", sets: 3, reps: "max", rest_seconds: 90, intensity_type: "RPE", intensity_value: 9 },
          { exercise_name: "Press Inclinado", sets: 3, reps: "10-12", rest_seconds: 60, intensity_type: "RPE", intensity_value: 8 },
          { exercise_name: "Zancadas", sets: 2, reps: "12 por pierna", rest_seconds: 60, intensity_type: "RPE", intensity_value: 7 }
        ]
      }
    ]
  },
  {
    id: 101,
    nombre: "Semana Completa - Hipertrofia (5 Días)",
    user_id: 3,
    level: "intermedio",
    method: "Hipertrofia",
    split_type: "Push/Pull/Legs",
    dias: [
      { dia: 1, nombre: "Empuje (Push)", ejercicios: [{ exercise_name: "Press de Banca", sets: 4, reps: 8 }, { exercise_name: "Press Militar", sets: 3, reps: 10 }] },
      { dia: 2, nombre: "Tracción (Pull)", ejercicios: [{ exercise_name: "Peso Muerto", sets: 3, reps: 5 }, { exercise_name: "Remo", sets: 4, reps: 10 }] },
      { dia: 3, nombre: "Pierna (Legs)", ejercicios: [{ exercise_name: "Sentadilla", sets: 4, reps: 10 }, { exercise_name: "Prensa", sets: 3, reps: 12 }] },
      { dia: 4, nombre: "Torso Superior", ejercicios: [{ exercise_name: "Dominadas", sets: 3, reps: 10 }] },
      { dia: 5, nombre: "Pierna + Accesorios", ejercicios: [{ exercise_name: "Extensión Cuadriceps", sets: 3, reps: 15 }] }
    ]
  },
  {
    id: 102,
    nombre: "Plan Mensual Evolutivo - Fase 1",
    user_id: 3,
    level: "intermedio",
    method: "Mesociclo Fuerza",
    split_type: "A/B Alternado",
    dias: Array.from({ length: 12 }, (_, i) => ({
      dia: i + 1,
      nombre: `Semana ${Math.floor(i/3) + 1} - Sesión ${i % 3 + 1}`,
      ejercicios: [
        { exercise_name: "Sentadilla", sets: 3 + Math.floor(i/4), reps: 10 - Math.floor(i/4), rest_seconds: 90 },
        { exercise_name: "Press Banca", sets: 3 + Math.floor(i/4), reps: 10 - Math.floor(i/4), rest_seconds: 90 }
      ]
    }))
  }
];

function seed() {
  let existing = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}

  // Eliminar duplicados previos por nombre para evitar basura
  const merged = existing.filter(m => !baseRoutines.find(br => br.nombre === m.nombre));
  
  // Agregar nuevas
  merged.push(...baseRoutines);

  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
  console.log('✅ Rutinas base inyectadas y asignadas al usuario 3 (Cesar Gomez).');
}

seed();
