const express = require('express');
const authMiddleware = require('../middleware/auth');
const liveClassController = require('../controllers/liveClassController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', liveClassController.getPublicClasses);
router.get('/admin', liveClassController.getAdminClasses);
router.get('/admin/d28d-hosts', liveClassController.getD28dHosts);
router.get('/admin/attendance', liveClassController.getAttendanceReport);
router.post('/admin/seed-d28d-week', liveClassController.seedD28DWeek);
router.post('/admin/zoom-meeting', liveClassController.createZoomMeeting);
router.post('/admin', liveClassController.createClass);
router.put('/admin/:id', liveClassController.updateClass);
router.delete('/admin/:id', liveClassController.deleteClass);
router.post('/:id/enroll', liveClassController.enrollClass);
router.delete('/:id/enroll', liveClassController.unenrollClass);
router.post('/:id/join', liveClassController.joinClass);

module.exports = router;
