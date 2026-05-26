const express = require('express');
const authMiddleware = require('../middleware/auth');
const trainingController = require('../controllers/trainingController');
const adminTrainingController = require('../controllers/adminTrainingController');
const coachTrainingController = require('../controllers/coachTrainingController');
const bodyMeasurementController = require('../controllers/bodyMeasurementController');
const router = express.Router();
const { requireModuleLicense } = require('../middleware/requireModuleLicense');

// Todas las rutas de /api/training requieren autenticación.
router.use(authMiddleware);
router.use(requireModuleLicense('training'));

// Generación de plan (antes era pública por error)
router.post('/plan-json', trainingController.generatePlanJson);

router.get('/gallery', trainingController.getPublicGallery);
router.get('/admin/gallery', trainingController.getAdminGallery);
router.post('/admin/gallery', trainingController.createAdminGallery);
router.put('/admin/gallery/:id', trainingController.updateAdminGallery);
router.delete('/admin/gallery/:id', trainingController.deleteAdminGallery);

// Maestro de Entrenamiento (Planes persistentes)
router.get('/admin/plans', adminTrainingController.getPlans);
router.get('/admin/plans/:id', adminTrainingController.getPlanById);
router.post('/admin/plans', adminTrainingController.createPlan);
router.put('/admin/plans/:id', adminTrainingController.updatePlan);
router.patch('/admin/plans/:id/day/:dayIndex', adminTrainingController.updateDay);
router.patch('/admin/plans/:id/exercise/:dayIndex/:exerciseIndex', adminTrainingController.updateExercise);
router.post('/admin/plans/:id/reorder/:dayIndex', adminTrainingController.reorderExercise);
router.post('/admin/plans/:id/add-day', adminTrainingController.addDay);
router.delete('/admin/plans/:id/delete-day/:dayIndex', adminTrainingController.deleteDay);
router.post('/admin/plans/:id/add-exercise/:dayIndex', adminTrainingController.addExercise);
router.delete('/admin/plans/:id/delete-exercise/:dayIndex/:exerciseIndex', adminTrainingController.deleteExercise);
router.delete('/admin/plans/:id', adminTrainingController.deletePlan);

// Diario de Entrenamiento
router.get('/admin/log', adminTrainingController.getLogs);
router.post('/admin/log', adminTrainingController.createLog);
router.put('/admin/log/:id', adminTrainingController.updateLog);
router.get('/admin/log/summary/:userId', adminTrainingController.getLogSummary);

router.post('/generate-daily-plan', trainingController.generateDailyPlan);
router.get('/my-assigned-plan', trainingController.getMyAssignedPlan);
router.get('/my-current-plan', trainingController.getMyCurrentPlan);
router.post('/ai-assistant/substitute', trainingController.substituteExercise);
router.post('/coach/ai-suggest-routine', trainingController.coachAiSuggestRoutine);
router.get('/coach/clients', coachTrainingController.getClients);
router.get('/coach/clients/:userId/insights', coachTrainingController.getClientInsights);
router.get('/coach/notifications', coachTrainingController.getNotifications);
router.post('/coach/notifications/read', coachTrainingController.markNotificationsRead);
router.post('/coach/ai-preview-plan', coachTrainingController.previewPlanFromRoutine);
router.post('/coach/ai-assign-plan', coachTrainingController.aiBuildPlanFromRoutine);
router.post('/log', trainingController.createUserLog);

router.get('/measurements/me', bodyMeasurementController.listMine);
router.post('/measurements', bodyMeasurementController.create);
router.put('/measurements/:id', bodyMeasurementController.update);
router.delete('/measurements/:id', bodyMeasurementController.remove);
router.get('/coach/clients/:userId/measurements', bodyMeasurementController.listForUser);

module.exports = router;
