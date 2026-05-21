const TrainingPlansStore = require('../models/TrainingPlansStore');
const TrainingLogStore = require('../models/TrainingLogStore');
const UserDatabase = require('../models/UserDatabase');
const { canManageTraining } = require('../utils/accessControl');

const isTrainerOrAdmin = (req) => canManageTraining(req.user);

const adminTrainingController = {
    // === PLANES DE ENTRENAMIENTO ===

    // Listar planes (todos o filtrados por user_id)
    getPlans: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { user_id } = req.query;
            let plans;
            if (user_id) {
                plans = TrainingPlansStore.getByUserId(user_id);
            } else {
                plans = TrainingPlansStore.getAll();
            }
            // Adjuntar info del usuario para mejor frontend
            const enhancedPlans = plans.map(p => {
                const u = UserDatabase.getById(p.user_id);
                return {
                    ...p,
                    user_name: u ? u.nombre : 'Usuario desconocido',
                    user_email: u ? u.email : ''
                };
            });
            res.json({ success: true, data: enhancedPlans });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error obteniendo planes de entrenamiento' });
        }
    },

    // Obtener detalle de plan
    getPlanById: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const plan = TrainingPlansStore.getById(req.params.id);
            if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
            res.json({ success: true, data: plan });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo el plan' });
        }
    },

    // Asignar (guardar) un plan nuevo
    createPlan: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { user_id, level, method, split_type, dias } = req.body;
            if (!user_id) return res.status(400).json({ error: 'user_id es requerido' });

            const newPlan = TrainingPlansStore.create({
                user_id,
                trainer_id: req.user.id,
                level,
                method,
                split_type,
                dias
            });
            res.status(201).json({ success: true, data: newPlan });
        } catch (error) {
            console.error('Error createPlan:', error);
            res.status(500).json({ error: 'Error creando plan de entrenamiento' });
        }
    },

    // Actualizar todo el plan
    updatePlan: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const updated = TrainingPlansStore.update(req.params.id, req.body);
            if (!updated) return res.status(404).json({ error: 'Plan no encontrado' });
            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ error: 'Error actualizando plan' });
        }
    },

    // Editar datos de un día (warmup, stretching, cardio)
    updateDay: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { id, dayIndex } = req.params;
            const updated = TrainingPlansStore.updateDayData(id, dayIndex, req.body);
            if (!updated) return res.status(404).json({ error: 'Error actualizando el día' });
            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ error: 'Error interno actualizando día' });
        }
    },

    // Editar un ejercicio específico (RPE, series, etc)
    updateExercise: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { id, dayIndex, exerciseIndex } = req.params;
            const updated = TrainingPlansStore.updateExercise(id, dayIndex, exerciseIndex, req.body);
            if (!updated) return res.status(404).json({ error: 'Error actualizando ejercicio' });
            res.json({ success: true, data: updated });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error interno actualizando ejercicio' });
        }
    },

    // Reordenar ejercicio
    reorderExercise: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { id, dayIndex } = req.params;
            const { fromIdx, toIdx } = req.body;
            const updated = TrainingPlansStore.reorderExercises(id, dayIndex, fromIdx, toIdx);
            if (!updated) return res.status(400).json({ error: 'Índices inválidos o plan no existe' });
            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ error: 'Error reordenando ejercicios' });
        }
    },

    addDay: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) return res.status(403).json({ error: 'No autorizado' });
            const updated = TrainingPlansStore.addDay(req.params.id);
            res.json({ success: true, data: updated });
        } catch (e) { res.status(500).json({ error: 'Error' }); }
    },

    deleteDay: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) return res.status(403).json({ error: 'No autorizado' });
            const updated = TrainingPlansStore.deleteDay(req.params.id, req.params.dayIndex);
            res.json({ success: true, data: updated });
        } catch (e) { res.status(500).json({ error: 'Error' }); }
    },

    addExercise: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) return res.status(403).json({ error: 'No autorizado' });
            const updated = TrainingPlansStore.addExercise(req.params.id, req.params.dayIndex);
            res.json({ success: true, data: updated });
        } catch (e) { res.status(500).json({ error: 'Error' }); }
    },

    deleteExercise: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) return res.status(403).json({ error: 'No autorizado' });
            const updated = TrainingPlansStore.deleteExercise(req.params.id, req.params.dayIndex, req.params.exerciseIndex);
            res.json({ success: true, data: updated });
        } catch (e) { res.status(500).json({ error: 'Error' }); }
    },

    deletePlan: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const ok = TrainingPlansStore.delete(req.params.id);
            if (!ok) return res.status(404).json({ error: 'Plan no encontrado' });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Error eliminando plan' });
        }
    },

    // === DIARIO DE ENTRENAMIENTO ===

    // Listar logs
    getLogs: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { user_id } = req.query;
            const logs = user_id ? TrainingLogStore.getByUserId(user_id) : TrainingLogStore.getAll();

            const enhancedLogs = logs.map(l => {
                const u = UserDatabase.getById(l.user_id);
                return {
                    ...l,
                    user_name: u ? u.nombre : 'Usuario desconocido'
                };
            });
            res.json({ success: true, data: enhancedLogs });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo diario' });
        }
    },

    // Registrar sesión manual desde el admin
    createLog: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const log = TrainingLogStore.create(req.body);
            res.status(201).json({ success: true, data: log });
        } catch (error) {
            res.status(500).json({ error: 'Error registrando sesión' });
        }
    },

    // Añadir notas de entrenador a un log existente
    updateLog: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const { trainer_notes } = req.body;
            const updated = TrainingLogStore.update(req.params.id, { trainer_notes });
            if (!updated) return res.status(404).json({ error: 'Registro no encontrado' });
            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ error: 'Error actualizando registro' });
        }
    },

    // Obtener resumen de actividad de un usuario
    getLogSummary: (req, res) => {
        try {
            if (!isTrainerOrAdmin(req)) {
                return res.status(403).json({ error: 'Permisos insuficientes' });
            }
            const summary = TrainingLogStore.getSummary(req.params.userId);
            res.json({ success: true, data: summary });
        } catch (error) {
            res.status(500).json({ error: 'Error obteniendo resumen' });
        }
    }
};

module.exports = adminTrainingController;
