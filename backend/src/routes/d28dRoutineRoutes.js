const express = require('express');
const authMiddleware = require('../middleware/auth');
const ctrl = require('../controllers/d28dRoutineController');

const router = express.Router();
router.use(authMiddleware);

router.get('/meta', ctrl.getMeta);
router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.upsertCategory);
router.put('/categories', ctrl.upsertCategory);

router.post('/import/bundled', ctrl.importBundled);
router.get('/notes/host', ctrl.listHostNotes);
router.post('/notes/host', ctrl.addHostNote);

router.get('/history/:rootId', ctrl.getHistory);
router.get('/', ctrl.listRoutines);
router.post('/', ctrl.createRoutine);
router.get('/:id', ctrl.getRoutine);
router.put('/:id', ctrl.updateRoutine);
router.post('/:id/duplicate', ctrl.duplicateRoutine);
router.post('/:id/archive', ctrl.archiveRoutine);

module.exports = router;
