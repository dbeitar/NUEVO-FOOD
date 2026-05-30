const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/spiritualController');
const { uploadStudyFile, uploadBibleJson } = require('../middleware/spiritualUpload');
const { hasRole } = require('../utils/accessControl');

const router = express.Router();

router.use(auth);
router.use(ctrl.spiritualEnabled);

function requireSuperAdmin(req, res, next) {
  if (!hasRole(req.user, ['super_admin'])) {
    return res.status(403).json({ error: 'Solo super admin' });
  }
  return next();
}

// User feed & bible
router.get('/feed/today', ctrl.getFeed);
router.get('/bible/books', ctrl.listBooks);
router.get('/bible/search', ctrl.searchBible);
router.get('/bible/:bookCode/:chapter', ctrl.getChapter);
router.get('/bible/favorites', ctrl.listFavorites);
router.post('/bible/favorites/:verseId', ctrl.toggleFavorite);
router.get('/bible/bookmarks', ctrl.listBookmarks);
router.post('/bible/bookmarks/:chapterId', ctrl.toggleBookmark);

// Devotionals
router.get('/devotionals', ctrl.listDevotionals);
router.post('/devotionals/:planId/start', ctrl.startDevotional);
router.get('/devotionals/:planId/progress', ctrl.getDevotionalProgress);
router.post('/devotionals/:planId/complete', ctrl.completeDevotionalDay);

// Studies & events
router.get('/studies', ctrl.listStudies);
router.get('/studies/:studyId', ctrl.openStudy);
router.get('/events', ctrl.listEvents);
router.post('/events/:eventId/register', ctrl.registerEvent);
router.post('/events/:eventId/attend', ctrl.attendEvent);

// Admin
router.use('/admin', requireSuperAdmin);
router.get('/admin/bible/versions', ctrl.adminListVersions);
router.get('/admin/bible/stats', ctrl.adminBibleStats);
router.post('/admin/bible/import', uploadBibleJson, ctrl.adminImportBible);
router.get('/admin/verse-of-day', ctrl.adminListVerses);
router.post('/admin/verse-of-day', ctrl.adminSaveVerse);
router.get('/admin/devotionals', ctrl.adminListDevotionals);
router.post('/admin/devotionals', ctrl.adminSaveDevotional);
router.get('/admin/studies', ctrl.adminListStudies);
router.post('/admin/studies', ctrl.adminSaveStudy);
router.post('/admin/studies/upload', uploadStudyFile, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
  res.json({ media_url: `/uploads/spiritual/studies/${req.file.filename}` });
});
router.post('/admin/categories', ctrl.adminSaveCategory);
router.post('/admin/authors', ctrl.adminSaveAuthor);
router.get('/admin/events', ctrl.adminListEvents);
router.post('/admin/events', ctrl.adminSaveEvent);

router.get('/admin/ai/status', ctrl.adminAiStatus);
router.get('/admin/trainers/nicolas-del-rio', ctrl.adminNicolasTrainer);
router.post('/admin/ai/verse-of-day', ctrl.adminAiGenerateVerse);
router.post('/admin/ai/devotional', ctrl.adminAiGenerateDevotional);
router.post('/admin/ai/study', ctrl.adminAiGenerateStudy);

module.exports = router;
