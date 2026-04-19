const express = require('express');
const authMiddleware = require('../middleware/auth');
const trainingController = require('../controllers/trainingController');
const adminTrainingController = require('../controllers/adminTrainingController');
const router = express.Router();

// Existing:
router.post('/plan-json', trainingController.generatePlanJson);

// New AI Dashboard and Assistant endpoints:
// Protect these with auth if possible
router.use(authMiddleware);

router.get('/gallery', trainingController.getPublicGallery);
router.get('/admin/gallery', trainingController.getAdminGallery);
router.post('/admin/gallery', trainingController.createAdminGallery);
router.delete('/admin/gallery/:id', trainingController.deleteAdminGallery);

// Maestro de Entrenamiento (Planes persistentes)
router.get('/admin/plans', adminTrainingController.getPlans);
router.get('/admin/plans/:id', adminTrainingController.getPlanById);
router.post('/admin/plans', adminTrainingController.createPlan);
router.put('/admin/plans/:id', adminTrainingController.updatePlan);
router.patch('/admin/plans/:id/day/:dayIndex', adminTrainingController.updateDay);
router.patch('/admin/plans/:id/exercise/:dayIndex/:exerciseIndex', adminTrainingController.updateExercise);
router.post('/admin/plans/:id/reorder/:dayIndex', adminTrainingController.reorderExercise);
router.delete('/admin/plans/:id', adminTrainingController.deletePlan);

// Diario de Entrenamiento
router.get('/admin/log', adminTrainingController.getLogs);
router.post('/admin/log', adminTrainingController.createLog);
router.put('/admin/log/:id', adminTrainingController.updateLog);
router.get('/admin/log/summary/:userId', adminTrainingController.getLogSummary);

router.post('/generate-daily-plan', trainingController.generateDailyPlan);
router.get('/my-current-plan', trainingController.getMyCurrentPlan);
router.post('/ai-assistant/substitute', trainingController.substituteExercise);
router.post('/log', trainingController.createUserLog);

module.exports = router;
