const JsonStore = require('../utils/JsonStore');

const store = new JsonStore('training_plans.json', []);
let rows = store.getAll();
if (!Array.isArray(rows)) rows = [];
let nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;

const TrainingPlansStore = {
    getAll() {
        return [...rows];
    },

    getById(id) {
        return rows.find((r) => r.id === Number(id)) || null;
    },

    getByUserId(userId) {
        return rows.filter((r) => r.user_id === Number(userId));
    },

    getByTrainerId(trainerId) {
        return rows.filter((r) => r.trainer_id === Number(trainerId));
    },

    getActiveByUserId(userId) {
        const plans = this.getByUserId(userId);
        return plans.length > 0 ? plans[plans.length - 1] : null;
    },

    create({ user_id, trainer_id, level, method, split_type, dias }) {
        const plan = {
            id: nextId++,
            user_id: Number(user_id),
            trainer_id: trainer_id ? Number(trainer_id) : null,
            level: level || 'intermedio',
            method: method || 'hipertrofia',
            split_type: split_type || 'upper_lower',
            dias: (dias || []).map((d, i) => ({
                dia: d.dia || i + 1,
                nombre: d.nombre || `Día ${i + 1}`,
                warmup_url: d.warmup_url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                stretching_url: d.stretching_url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                cardio: d.cardio || {
                    goal: 'oxidación',
                    bpm: 130,
                    limit_type: 'time',
                    limit_value: 20
                },
                ejercicios: (d.ejercicios || []).map((ex) => ({
                    exercise_name: ex.exercise_name || '',
                    sets: ex.sets ?? ex.prescription?.sets ?? 3,
                    reps: ex.reps ?? ex.prescription?.reps ?? 10,
                    rest_seconds: ex.rest_seconds ?? 60,
                    intensity_type: ex.intensity_type || 'RPE',
                    intensity_value: ex.intensity_value ?? ex.prescription?.target_rpe ?? 8,
                    tempo: ex.tempo || ex.prescription?.tempo || '2-1-2-0',
                    youtube_url: ex.youtube_url || null,
                    notes: ex.notes || '',
                })),
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        rows.push(plan);
        store.setAll(rows);
        return plan;
    },

    update(id, data) {
        const idx = rows.findIndex((r) => r.id === Number(id));
        if (idx === -1) return null;
        const plan = rows[idx];
        if (data.dias) {
            plan.dias = data.dias.map((d, i) => ({
                dia: d.dia || i + 1,
                nombre: d.nombre || `Día ${i + 1}`,
                warmup_url: d.warmup_url || '',
                stretching_url: d.stretching_url || '',
                cardio: d.cardio || {
                    goal: 'oxidación',
                    bpm: 130,
                    limit_type: 'time',
                    limit_value: 20
                },
                ejercicios: (d.ejercicios || []).map((ex) => ({
                    exercise_name: ex.exercise_name || '',
                    sets: ex.sets ?? 3,
                    reps: ex.reps ?? 10,
                    rest_seconds: ex.rest_seconds ?? 60,
                    intensity_type: ex.intensity_type || 'RPE',
                    intensity_value: ex.intensity_value ?? 8,
                    tempo: ex.tempo || '2-1-2-0',
                    youtube_url: ex.youtube_url || null,
                    notes: ex.notes || '',
                })),
            }));
        }
        if (data.level) plan.level = data.level;
        if (data.method) plan.method = data.method;
        if (data.split_type) plan.split_type = data.split_type;
        plan.updated_at = new Date().toISOString();
        rows[idx] = plan;
        store.setAll(rows);
        return plan;
    },

    updateExercise(planId, dayIndex, exerciseIndex, exerciseData) {
        const plan = this.getById(planId);
        if (!plan) return null;
        const day = plan.dias?.[dayIndex];
        if (!day) return null;
        const ex = day.ejercicios?.[exerciseIndex];
        if (!ex) return null;
        Object.assign(ex, {
            ...ex,
            ...(exerciseData.exercise_name !== undefined ? { exercise_name: exerciseData.exercise_name } : {}),
            ...(exerciseData.sets !== undefined ? { sets: exerciseData.sets } : {}),
            ...(exerciseData.reps !== undefined ? { reps: exerciseData.reps } : {}),
            ...(exerciseData.rest_seconds !== undefined ? { rest_seconds: exerciseData.rest_seconds } : {}),
            ...(exerciseData.intensity_type !== undefined ? { intensity_type: exerciseData.intensity_type } : {}),
            ...(exerciseData.intensity_value !== undefined ? { intensity_value: exerciseData.intensity_value } : {}),
            ...(exerciseData.tempo !== undefined ? { tempo: exerciseData.tempo } : {}),
            ...(exerciseData.youtube_url !== undefined ? { youtube_url: exerciseData.youtube_url } : {}),
            ...(exerciseData.notes !== undefined ? { notes: exerciseData.notes } : {}),
        });
        plan.updated_at = new Date().toISOString();
        const idx = rows.findIndex((r) => r.id === Number(planId));
        rows[idx] = plan;
        store.setAll(rows);
        return plan;
    },

    updateDayData(planId, dayIndex, dayData) {
        const plan = this.getById(planId);
        if (!plan) return null;
        const day = plan.dias?.[dayIndex];
        if (!day) return null;

        if (dayData.warmup_url !== undefined) day.warmup_url = dayData.warmup_url;
        if (dayData.stretching_url !== undefined) day.stretching_url = dayData.stretching_url;

        if (dayData.cardio !== undefined) {
            day.cardio = {
                ...day.cardio,
                ...dayData.cardio
            };
        }

        plan.updated_at = new Date().toISOString();
        const idx = rows.findIndex((r) => r.id === Number(planId));
        rows[idx] = plan;
        store.setAll(rows);
        return plan;
    },

    reorderExercises(planId, dayIndex, fromIdx, toIdx) {
        const plan = this.getById(planId);
        if (!plan) return null;
        const day = plan.dias?.[dayIndex];
        if (!day || !day.ejercicios) return null;
        const arr = [...day.ejercicios];
        if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return null;
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        day.ejercicios = arr;
        plan.updated_at = new Date().toISOString();
        const idx = rows.findIndex((r) => r.id === Number(planId));
        rows[idx] = plan;
        store.setAll(rows);
        return plan;
    },

    addDay(planId) {
        const plan = this.getById(planId);
        if (!plan) return null;
        const nextDia = (plan.dias?.length || 0) + 1;
        plan.dias.push({
            dia: nextDia,
            nombre: `Día ${nextDia}`,
            warmup_url: '',
            stretching_url: '',
            cardio: { goal: 'oxidación', bpm: 130, limit_type: 'time', limit_value: 20 },
            ejercicios: []
        });
        plan.updated_at = new Date().toISOString();
        store.setAll(rows);
        return plan;
    },

    deleteDay(planId, dayIndex) {
        const plan = this.getById(planId);
        if (!plan || !plan.dias) return null;
        plan.dias.splice(dayIndex, 1);
        // Re-index days
        plan.dias.forEach((d, i) => d.dia = i + 1);
        plan.updated_at = new Date().toISOString();
        store.setAll(rows);
        return plan;
    },

    addExercise(planId, dayIndex) {
        const plan = this.getById(planId);
        if (!plan || !plan.dias?.[dayIndex]) return null;
        plan.dias[dayIndex].ejercicios.push({
            exercise_name: 'Nuevo Ejercicio',
            sets: 3,
            reps: 10,
            rest_seconds: 60,
            intensity_type: 'RPE',
            intensity_value: 8,
            tempo: '2-1-2-0',
            youtube_url: '',
            notes: ''
        });
        plan.updated_at = new Date().toISOString();
        store.setAll(rows);
        return plan;
    },

    deleteExercise(planId, dayIndex, exIndex) {
        const plan = this.getById(planId);
        if (!plan || !plan.dias?.[dayIndex]?.ejercicios) return null;
        plan.dias[dayIndex].ejercicios.splice(exIndex, 1);
        plan.updated_at = new Date().toISOString();
        store.setAll(rows);
        return plan;
    },

    delete(id) {
        const idx = rows.findIndex((r) => r.id === Number(id));
        if (idx === -1) return false;
        rows.splice(idx, 1);
        store.setAll(rows);
        return true;
    },
};

module.exports = TrainingPlansStore;
