const express = require('express');
const authenticateToken = require('../middleware/auth');
const communicationController = require('../controllers/communicationController');

const router = express.Router();

// Admin (super_admin)
router.get('/templates', authenticateToken, communicationController.listTemplates);
router.post('/templates', authenticateToken, communicationController.createTemplate);
router.put('/templates/:id', authenticateToken, communicationController.updateTemplate);
router.delete('/templates/:id', authenticateToken, communicationController.deleteTemplate);

router.get('/logs', authenticateToken, communicationController.listLogs);

router.get('/support', authenticateToken, communicationController.getMySupport);

// User (authenticated): WhatsApp click audit
router.post('/whatsapp/click', authenticateToken, communicationController.whatsappClick);

// Admin: test email (requires super_admin inside controller)
router.post('/email/test', authenticateToken, communicationController.sendTestEmail);

// Admin: run daily jobs now (validation)
router.post('/jobs/run', authenticateToken, communicationController.runDailyJobs);

module.exports = router;

