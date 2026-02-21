const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const planController = require('../controllers/planController');

router.use(auth);

router.get('/mine', planController.getMine);
router.put('/:userId', planController.updateForUser);

module.exports = router;
