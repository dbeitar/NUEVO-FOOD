const express = require('express');
const authenticateToken = require('../middleware/auth');
const accountsController = require('../controllers/accountsController');

const router = express.Router();

// Rutas públicas (sin autenticación)
router.get('/plans', accountsController.getPlans);

// Rutas autenticadas
router.get('/my-account', authenticateToken, accountsController.getMyAccount);
router.get('/me', authenticateToken, accountsController.getMyAccount);
router.post('/', authenticateToken, accountsController.createAccount);
router.put('/:id', authenticateToken, accountsController.updateAccount);
router.delete('/:id', authenticateToken, accountsController.cancelAccount);
router.post('/:id/renew', authenticateToken, accountsController.renewPlan);
router.post('/:id/use-session', authenticateToken, accountsController.useSession);

// Rutas admin
router.get('/', authenticateToken, accountsController.getAllAccounts);
router.get('/gym/:gymId', authenticateToken, accountsController.getAccountsByGym);
router.get('/expiring', authenticateToken, accountsController.getExpiringAccounts);
router.post('/plans', authenticateToken, accountsController.createPlan);
router.put('/plans/:nombre', authenticateToken, accountsController.updatePlan);
router.delete('/plans/:nombre', authenticateToken, accountsController.deletePlan);

module.exports = router;
