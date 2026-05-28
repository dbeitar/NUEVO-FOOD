const express = require('express');
const auth = require('../middleware/auth');
const { uploadChallengeFile } = require('../middleware/challengeUpload');
const ctrl = require('../controllers/d28dChallengeController');

const router = express.Router();
router.use(auth);

router.get('/', ctrl.list);
router.get('/:id/ranking', ctrl.ranking);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.post('/:id/duplicate', ctrl.duplicate);
router.post('/:id/activate', ctrl.activate);
router.post('/:id/close', ctrl.close);
router.post('/:id/publish', ctrl.publish);
router.post('/:id/cancel', ctrl.cancel);
router.post('/:id/enroll', ctrl.enroll);
router.post('/:id/withdraw', ctrl.withdraw);
router.post('/:id/evidence', uploadChallengeFile, ctrl.addEvidence);
router.put('/:id/evidence/:evidenceId', ctrl.updateEvidence);
router.post('/:id/score', ctrl.score);
router.post('/:id/podium', ctrl.setPodium);

module.exports = router;
