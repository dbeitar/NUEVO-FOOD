const JsonStore = require('../utils/JsonStore');

const store = new JsonStore('training_log.json', []);
let rows = store.getAll();
if (!Array.isArray(rows)) rows = [];
let nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;

const TrainingLogStore = {
    getAll() {
        return [...rows];
    },

    getById(id) {
        return rows.find((r) => r.id === Number(id)) || null;
    },

    getByUserId(userId) {
        return rows
            .filter((r) => r.user_id === Number(userId))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    getByPlanId(planId) {
        return rows
            .filter((r) => r.plan_id === Number(planId))
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    getByUserAndDate(userId, fecha) {
        return rows.filter(
            (r) => r.user_id === Number(userId) && r.fecha === fecha
        );
    },

    getSummary(userId) {
        const userLogs = this.getByUserId(userId);
        const totalSessions = userLogs.length;
        const completedSessions = userLogs.filter((l) => l.completado).length;
        const totalMinutes = userLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
        const lastSession = userLogs.length > 0 ? userLogs[0] : null;

        // Ejercicios más frecuentes
        const exCount = {};
        for (const log of userLogs) {
            for (const ex of log.ejercicios || []) {
                exCount[ex.exercise_name] = (exCount[ex.exercise_name] || 0) + 1;
            }
        }
        const topExercises = Object.entries(exCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            totalSessions,
            completedSessions,
            totalMinutes,
            lastSession: lastSession ? { fecha: lastSession.fecha, dia: lastSession.dia } : null,
            topExercises,
        };
    },

    create({ user_id, plan_id, dia, ejercicios = [], completado = false, duration_minutes = 0, trainer_notes = '' }) {
        const entry = {
            id: nextId++,
            user_id: Number(user_id),
            plan_id: plan_id ? Number(plan_id) : null,
            dia: dia || 1,
            fecha: new Date().toISOString().split('T')[0],
            ejercicios: (ejercicios || []).map((ex) => ({
                exercise_name: ex.exercise_name || '',
                sets_done: ex.sets_done ?? 0,
                reps_done: ex.reps_done ?? '',
                weight_kg: ex.weight_kg ?? 0,
                intensity_actual: ex.intensity_actual ?? '',
                notes: ex.notes || '',
            })),
            completado: Boolean(completado),
            duration_minutes: Number(duration_minutes) || 0,
            trainer_notes: trainer_notes || '',
            wellness: {
                sleep_hours: 0,
                sleep_quality: 5, // 1-10
                stress_level: 5,  // 1-10
                appetite: 5,      // 1-10
                energy_level: 5,   // 1-10
                soreness: 0       // 1-10
            },
            created_at: new Date().toISOString(),
        };
        rows.push(entry);
        store.setAll(rows);
        return entry;
    },

    update(id, data) {
        const idx = rows.findIndex((r) => r.id === Number(id));
        if (idx === -1) return null;
        const entry = rows[idx];
        if (data.ejercicios) entry.ejercicios = data.ejercicios;
        if (data.completado !== undefined) entry.completado = Boolean(data.completado);
        if (data.duration_minutes !== undefined) entry.duration_minutes = Number(data.duration_minutes);
        if (data.trainer_notes !== undefined) entry.trainer_notes = data.trainer_notes;
        if (data.wellness) {
            entry.wellness = {
                ...entry.wellness,
                ...data.wellness
            };
        }
        rows[idx] = entry;
        store.setAll(rows);
        return entry;
    },

    delete(id) {
        const idx = rows.findIndex((r) => r.id === Number(id));
        if (idx === -1) return false;
        rows.splice(idx, 1);
        store.setAll(rows);
        return true;
    },
};

module.exports = TrainingLogStore;
