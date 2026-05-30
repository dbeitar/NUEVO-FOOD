const spiritual = require('../services/spiritual/spiritualService');
const spiritualAi = require('../services/spiritual/spiritualAiService');
const { importBibleFromJson } = require('../services/spiritual/bibleImportService');
const { hasRole } = require('../utils/accessControl');
const platformAudit = require('../services/platformAuditService');

function requireSuperAdmin(req, res) {
  if (!hasRole(req.user, ['super_admin'])) {
    res.status(403).json({ error: 'Solo super admin' });
    return false;
  }
  return true;
}

function spiritualEnabled(req, res, next) {
  if (!spiritual.enabled()) {
    return res.status(404).json({ error: 'Centro espiritual desactivado' });
  }
  return next();
}

function wrap(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error('[spiritual]', e.message);
      res.status(e.status || 400).json({ error: e.message || 'Error espiritual' });
    }
  };
}

// --- User ---

exports.getFeed = wrap(async (req, res) => {
  const feed = await spiritual.getTodayFeed(req.user);
  res.json(feed);
});

exports.searchBible = wrap(async (req, res) => {
  const q = req.query.q || '';
  const rows = await spiritual.searchBible(q, req.query.version || 'RVR1960');
  res.json(rows);
});

exports.listBooks = wrap(async (req, res) => {
  const rows = await spiritual.listBooks(req.query.version || 'RVR1960');
  res.json(rows);
});

exports.getChapter = wrap(async (req, res) => {
  const row = await spiritual.getChapter(req.params.bookCode, req.params.chapter, req.query.version);
  if (!row) return res.status(404).json({ error: 'Capítulo no encontrado' });
  await spiritual.logBibleRead(req.user.id, {
    book_code: req.params.bookCode,
    chapter_number: Number(req.params.chapter),
  });
  res.json(row);
});

exports.toggleFavorite = wrap(async (req, res) => {
  const out = await spiritual.toggleFavorite(req.user.id, req.params.verseId);
  res.json(out);
});

exports.listFavorites = wrap(async (req, res) => {
  res.json(await spiritual.listFavorites(req.user.id));
});

exports.toggleBookmark = wrap(async (req, res) => {
  const out = await spiritual.toggleBookmark(req.user.id, req.params.chapterId, req.body.label);
  res.json(out);
});

exports.listBookmarks = wrap(async (req, res) => {
  res.json(await spiritual.listBookmarks(req.user.id));
});

exports.listDevotionals = wrap(async (req, res) => {
  res.json(await spiritual.listDevotionalsForUser(req.user));
});

exports.startDevotional = wrap(async (req, res) => {
  res.json(await spiritual.startDevotional(req.user.id, req.params.planId));
});

exports.completeDevotionalDay = wrap(async (req, res) => {
  const dayIndex = req.body.day_index || req.body.dayIndex;
  res.json(await spiritual.completeDevotionalDay(req.user.id, req.params.planId, dayIndex));
});

exports.getDevotionalProgress = wrap(async (req, res) => {
  res.json(await spiritual.getDevotionalProgress(req.user.id, req.params.planId));
});

exports.listStudies = wrap(async (req, res) => {
  res.json(await spiritual.listStudiesForUser(req.user));
});

exports.openStudy = wrap(async (req, res) => {
  const row = await spiritual.openStudy(req.user.id, req.params.studyId);
  if (!row) return res.status(404).json({ error: 'Estudio no encontrado' });
  res.json(row);
});

exports.listEvents = wrap(async (req, res) => {
  res.json(await spiritual.listEventsForUser(req.user));
});

exports.registerEvent = wrap(async (req, res) => {
  res.json(await spiritual.registerEvent(req.user.id, req.params.eventId));
});

exports.attendEvent = wrap(async (req, res) => {
  res.json(await spiritual.attendEvent(req.user.id, req.params.eventId));
});

// --- Admin ---

exports.adminListVerses = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminListVersesOfDay());
});

exports.adminSaveVerse = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveVerseOfDay(req.user.id, req.body));
});

exports.adminListDevotionals = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminListDevotionals());
});

exports.adminSaveDevotional = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveDevotional(req.user.id, req.body));
});

exports.adminListStudies = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminListStudies());
});

exports.adminSaveStudy = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveStudy(req.user.id, req.body));
});

exports.adminSaveCategory = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveCategory(req.body.name));
});

exports.adminSaveAuthor = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveAuthor(req.body.name));
});

exports.adminListEvents = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminListEvents());
});

exports.adminSaveEvent = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.adminSaveEvent(req.user.id, req.body));
});

exports.adminImportBible = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  if (!req.file) return res.status(400).json({ error: 'Archivo JSON requerido' });
  const out = await importBibleFromJson({
    filePath: req.file.path,
    versionCode: req.body.version_code || 'RVR1960',
    versionName: req.body.version_name || 'Reina-Valera 1960',
  });
  await platformAudit.log(req.user.id, 'spiritual', 'bible.imported', 'bible_version', out.versionId, out);
  res.json(out);
});

exports.adminListVersions = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(await spiritual.listBibleVersions());
});

exports.adminAiStatus = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const available = await spiritualAi.ollamaAvailable();
  res.json({
    ollama_configured: Boolean(process.env.OLLAMA_BASE_URL),
    ollama_available: available,
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    fallback: !available,
    persona: 'Formación espiritual centrada en enseñanzas de Jesús (no denominacional)',
  });
});

exports.adminNicolasTrainer = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const trainer = await spiritualAi.findNicolasTrainer();
  if (!trainer) {
    return res.status(404).json({
      error: 'Entrenador Nicolas del Rio no encontrado. Ejecuta: npm run seed:coach-nicolas',
    });
  }
  res.json({ id: trainer.id, nombre: trainer.nombre, email: trainer.email });
});

exports.adminAiGenerateVerse = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const trainer = await spiritualAi.findNicolasTrainer();
  const generated = await spiritualAi.generateVerseOfDay(req.body || {});
  const scope = trainer && req.body?.assign_nicolas !== false
    ? { scope_type: 'trainer', scope_trainer_id: trainer.id }
    : { scope_type: req.body?.scope_type || 'global', scope_gym_id: req.body?.scope_gym_id, scope_trainer_id: req.body?.scope_trainer_id };
  const row = await spiritual.adminSaveVerseOfDay(req.user.id, {
    scheduled_date: req.body?.scheduled_date || new Date().toISOString().slice(0, 10),
    verse_id: generated.verse_id,
    custom_text: generated.custom_text,
    reflection: generated.reflection,
    published: req.body?.published !== false,
    ...scope,
  });
  await platformAudit.log(req.user.id, 'spiritual', 'ai.verse.generated', 'verse_of_day', row.id, { trainer_id: trainer?.id, ai: generated.ai });
  res.json({ generated, saved: row, trainer: trainer ? { id: trainer.id, nombre: trainer.nombre } : null });
});

exports.adminAiGenerateDevotional = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const trainer = await spiritualAi.findNicolasTrainer();
  const plan = await spiritualAi.generateDevotionalPlan(req.body || {});
  const scope = trainer && req.body?.assign_nicolas !== false
    ? { scope_type: 'trainer', scope_trainer_id: trainer.id }
    : { scope_type: req.body?.scope_type || 'global' };
  const saved = await spiritual.adminSaveDevotional(req.user.id, {
    title: plan.title,
    duration_days: plan.duration_days,
    description: plan.description,
    days: plan.days,
    ...scope,
  });
  await platformAudit.log(req.user.id, 'spiritual', 'ai.devotional.generated', 'devotional_plan', saved.id, { trainer_id: trainer?.id, ai: plan.ai });
  res.json({ generated: plan, saved, trainer: trainer ? { id: trainer.id, nombre: trainer.nombre } : null });
});

exports.adminAiGenerateStudy = wrap(async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const trainer = await spiritualAi.findNicolasTrainer();
  const study = await spiritualAi.generateStudy(req.body || {});
  const cat = await spiritual.adminSaveCategory('Formación espiritual');
  const author = await spiritual.adminSaveAuthor('Nicolas del Rio · Comunidad');
  const scope = trainer && req.body?.assign_nicolas !== false
    ? { scope_type: 'trainer', scope_trainer_id: trainer.id }
    : { scope_type: req.body?.scope_type || 'global' };
  const saved = await spiritual.adminSaveStudy(req.user.id, {
    title: study.title,
    description: study.content_text || study.description,
    media_type: 'text',
    media_url: study.media_url || 'inline',
    category_id: cat.id,
    author_id: author.id,
    tags: study.tags,
    ...scope,
  });
  await platformAudit.log(req.user.id, 'spiritual', 'ai.study.generated', 'study', saved.id, { trainer_id: trainer?.id, ai: study.ai });
  res.json({ generated: study, saved, trainer: trainer ? { id: trainer.id, nombre: trainer.nombre } : null });
});

exports.spiritualEnabled = spiritualEnabled;
