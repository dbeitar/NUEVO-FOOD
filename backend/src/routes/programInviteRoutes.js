const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const programInviteController = require('../controllers/programInviteController');

router.get('/', authMiddleware, programInviteController.listInvites);
router.post('/', authMiddleware, programInviteController.createInvite);
router.put('/:code', authMiddleware, programInviteController.updateInvite);
router.delete('/:code', authMiddleware, programInviteController.deleteInvite);

module.exports = router;
