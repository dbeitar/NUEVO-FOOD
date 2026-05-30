const { getPrisma } = require('../../lib/prisma');
const platformAudit = require('../platformAuditService');
const communicationCenter = require('../communicationCenterService');
const { filterByScope, pickBest } = require('./spiritualAssignmentService');

function enabled() {
  return String(process.env.SPIRITUAL_CENTER_ENABLED || 'true').toLowerCase() !== 'false';
}

function todayDate() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseScheduleDate(str) {
  if (!str) return todayDate();
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return todayDate();
  return new Date(Date.UTC(y, m - 1, d));
}

function scopeFields(body = {}) {
  const scopeType = String(body.scope_type || body.scopeType || 'global').toLowerCase();
  return {
    scopeType,
    scopeGymId: scopeType === 'gym' ? Number(body.scope_gym_id || body.scopeGymId) || null : null,
    scopeTrainerId: scopeType === 'trainer' ? Number(body.scope_trainer_id || body.scopeTrainerId) || null : null,
  };
}

async function verseWithRef(prisma, verseId) {
  if (!verseId) return null;
  const v = await prisma.spiritualBibleVerse.findUnique({
    where: { id: verseId },
    include: {
      chapter: { include: { book: { include: { version: true } } } },
    },
  });
  if (!v) return null;
  const book = v.chapter.book;
  return {
    id: v.id,
    text: v.text,
    verse_number: v.verseNumber,
    chapter_number: v.chapter.chapterNumber,
    book_code: book.code,
    book_name: book.name,
    version_code: book.version.code,
    reference: `${book.name} ${v.chapter.chapterNumber}:${v.verseNumber}`,
  };
}

// --- Bible ---

async function listBibleVersions() {
  const prisma = getPrisma();
  return prisma.spiritualBibleVersion.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
}

async function listBooks(versionCode) {
  const prisma = getPrisma();
  const version = await prisma.spiritualBibleVersion.findFirst({ where: { code: versionCode, active: true } });
  if (!version) return [];
  return prisma.spiritualBibleBook.findMany({
    where: { versionId: version.id },
    orderBy: { orden: 'asc' },
  });
}

async function getChapter(bookCode, chapterNumber, versionCode = 'RVR1960') {
  const prisma = getPrisma();
  const version = await prisma.spiritualBibleVersion.findFirst({ where: { code: versionCode } });
  if (!version) return null;
  const book = await prisma.spiritualBibleBook.findFirst({
    where: { versionId: version.id, code: String(bookCode).toUpperCase() },
  });
  if (!book) return null;
  const chapter = await prisma.spiritualBibleChapter.findFirst({
    where: { bookId: book.id, chapterNumber: Number(chapterNumber) },
    include: { verses: { orderBy: { verseNumber: 'asc' } } },
  });
  if (!chapter) return null;
  return {
    book: { code: book.code, name: book.name },
    chapter_number: chapter.chapterNumber,
    verses: chapter.verses.map((v) => ({ id: v.id, verse_number: v.verseNumber, text: v.text })),
  };
}

async function searchBible(q, versionCode = 'RVR1960', limit = 30) {
  const prisma = getPrisma();
  const version = await prisma.spiritualBibleVersion.findFirst({ where: { code: versionCode } });
  if (!version || !q) return [];
  const term = String(q).trim();
  const verses = await prisma.spiritualBibleVerse.findMany({
    where: {
      text: { contains: term, mode: 'insensitive' },
      chapter: { book: { versionId: version.id } },
    },
    take: limit,
    include: { chapter: { include: { book: true } } },
    orderBy: [{ chapter: { book: { orden: 'asc' } } }, { chapter: { chapterNumber: 'asc' } }, { verseNumber: 'asc' }],
  });
  return verses.map((v) => ({
    id: v.id,
    text: v.text,
    reference: `${v.chapter.book.name} ${v.chapter.chapterNumber}:${v.verseNumber}`,
    book_code: v.chapter.book.code,
    chapter_number: v.chapter.chapterNumber,
    verse_number: v.verseNumber,
  }));
}

async function toggleFavorite(userId, verseId) {
  const prisma = getPrisma();
  const existing = await prisma.spiritualUserFavorite.findUnique({
    where: { userId_verseId: { userId, verseId: Number(verseId) } },
  });
  if (existing) {
    await prisma.spiritualUserFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.spiritualUserFavorite.create({ data: { userId, verseId: Number(verseId) } });
  await platformAudit.log(userId, 'spiritual', 'bible.favorited', 'verse', verseId);
  return { favorited: true };
}

async function listFavorites(userId) {
  const prisma = getPrisma();
  const rows = await prisma.spiritualUserFavorite.findMany({
    where: { userId },
    include: { verse: { include: { chapter: { include: { book: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.verse.id,
    text: r.verse.text,
    reference: `${r.verse.chapter.book.name} ${r.verse.chapter.chapterNumber}:${r.verse.verseNumber}`,
  }));
}

async function toggleBookmark(userId, chapterId, label = null) {
  const prisma = getPrisma();
  const cid = Number(chapterId);
  const existing = await prisma.spiritualUserBookmark.findUnique({
    where: { userId_chapterId: { userId, chapterId: cid } },
  });
  if (existing) {
    await prisma.spiritualUserBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.spiritualUserBookmark.create({ data: { userId, chapterId: cid, label } });
  await platformAudit.log(userId, 'spiritual', 'bible.bookmarked', 'chapter', cid);
  return { bookmarked: true };
}

async function listBookmarks(userId) {
  const prisma = getPrisma();
  const rows = await prisma.spiritualUserBookmark.findMany({
    where: { userId },
    include: { chapter: { include: { book: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    chapter_id: r.chapterId,
    label: r.label,
    book_code: r.chapter.book.code,
    book_name: r.chapter.book.name,
    chapter_number: r.chapter.chapterNumber,
  }));
}

async function logBibleRead(userId, meta = {}) {
  await platformAudit.log(userId, 'spiritual', 'bible.read', 'chapter', meta.chapter_id || null, meta);
}

// --- Verse of day ---

async function adminListVersesOfDay() {
  const prisma = getPrisma();
  return prisma.spiritualVerseOfDay.findMany({ orderBy: { scheduledDate: 'desc' }, take: 100 });
}

async function adminSaveVerseOfDay(userId, body) {
  const prisma = getPrisma();
  const date = parseScheduleDate(body.scheduled_date);
  const scope = scopeFields(body);
  const data = {
    scheduledDate: date,
    verseId: body.verse_id ? Number(body.verse_id) : null,
    customText: body.custom_text || null,
    reflection: body.reflection || null,
    published: Boolean(body.published),
    publishedAt: body.published ? new Date() : null,
    createdById: userId,
    ...scope,
  };
  let row;
  if (body.id) {
    row = await prisma.spiritualVerseOfDay.update({ where: { id: Number(body.id) }, data });
  } else {
    row = await prisma.spiritualVerseOfDay.create({ data });
  }
  if (row.published) {
    await publishVerseOfDay(userId, row);
  }
  return row;
}

async function publishVerseOfDay(userId, row) {
  const prisma = getPrisma();
  const verse = await verseWithRef(prisma, row.verseId);
  const text = row.customText || verse?.text || '';
  const ref = verse?.reference || 'Versículo del día';
  await platformAudit.log(userId, 'spiritual', 'verse.published', 'verse_of_day', row.id, { scope: row.scopeType });

  const users = await resolveUsersForScope(row);
  for (const u of users) {
    await communicationCenter.dispatchEvent({
      evento: 'verse.published',
      modulo: 'spiritual',
      userId: u.id,
      targetEmail: u.email,
      vars: {
        user: { nombre: u.nombre },
        verse: { text, reference: ref, reflection: row.reflection || '' },
      },
    });
  }
}

async function resolveUsersForScope(scopeRow) {
  const prisma = getPrisma();
  const scope = String(scopeRow.scopeType || 'global').toLowerCase();
  if (scope === 'global') {
    return prisma.user.findMany({
      where: { rol: 'usuario_final' },
      select: { id: true, email: true, nombre: true },
      take: 500,
    });
  }
  if (scope === 'gym' && scopeRow.scopeGymId) {
    return prisma.user.findMany({
      where: { gymId: scopeRow.scopeGymId },
      select: { id: true, email: true, nombre: true },
    });
  }
  if (scope === 'trainer' && scopeRow.scopeTrainerId) {
    return prisma.user.findMany({
      where: { trainerId: scopeRow.scopeTrainerId },
      select: { id: true, email: true, nombre: true },
    });
  }
  return [];
}

async function getTodayVerse(user) {
  const prisma = getPrisma();
  const date = todayDate();
  const rows = await prisma.spiritualVerseOfDay.findMany({
    where: { scheduledDate: date, published: true },
  });
  let row = pickBest(rows, user);
  if (!row) {
    const recent = await prisma.spiritualVerseOfDay.findMany({
      where: { published: true },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
    });
    row = pickBest(recent, user);
  }
  if (!row) return null;
  const verse = await verseWithRef(prisma, row.verseId);
  return {
    id: row.id,
    text: row.customText || verse?.text || '',
    reference: verse?.reference || null,
    reflection: row.reflection,
  };
}

// --- Devotionals ---

async function adminListDevotionals() {
  const prisma = getPrisma();
  return prisma.spiritualDevotionalPlan.findMany({
    include: { days: { orderBy: { dayIndex: 'asc' } } },
    orderBy: { id: 'desc' },
  });
}

async function adminSaveDevotional(userId, body) {
  const prisma = getPrisma();
  const scope = scopeFields(body);
  const duration = Number(body.duration_days || body.durationDays);
  if (![7, 21, 30, 40].includes(duration)) {
    throw new Error('Duración debe ser 7, 21, 30 o 40 días');
  }
  const planData = {
    title: body.title,
    durationDays: duration,
    description: body.description || null,
    active: body.active !== false,
    ...scope,
  };
  let plan;
  if (body.id) {
    plan = await prisma.spiritualDevotionalPlan.update({
      where: { id: Number(body.id) },
      data: planData,
    });
    if (Array.isArray(body.days)) {
      await prisma.spiritualDevotionalDay.deleteMany({ where: { planId: plan.id } });
      for (const d of body.days) {
        await prisma.spiritualDevotionalDay.create({
          data: {
            planId: plan.id,
            dayIndex: Number(d.day_index || d.dayIndex),
            verseId: d.verse_id ? Number(d.verse_id) : null,
            reflection: d.reflection || '',
            prayer: d.prayer || '',
            challenge: d.challenge || '',
          },
        });
      }
    }
  } else {
    plan = await prisma.spiritualDevotionalPlan.create({
      data: {
        ...planData,
        days: {
          create: (body.days || []).map((d) => ({
            dayIndex: Number(d.day_index || d.dayIndex),
            verseId: d.verse_id ? Number(d.verse_id) : null,
            reflection: d.reflection || '',
            prayer: d.prayer || '',
            challenge: d.challenge || '',
          })),
        },
      },
    });
  }
  await platformAudit.log(userId, 'spiritual', 'devotional.saved', 'devotional_plan', plan.id);
  return prisma.spiritualDevotionalPlan.findUnique({
    where: { id: plan.id },
    include: { days: { orderBy: { dayIndex: 'asc' } } },
  });
}

async function getBibleStats() {
  const prisma = getPrisma();
  const version = await prisma.spiritualBibleVersion.findFirst({
    where: { code: 'RVR1960', active: true },
  });
  if (!version) {
    return { loaded: false, books: 0, verses: 0, version: null };
  }
  const books = await prisma.spiritualBibleBook.count({ where: { versionId: version.id } });
  const verses = await prisma.spiritualBibleVerse.count({
    where: { chapter: { book: { versionId: version.id } } },
  });
  return {
    loaded: verses > 100,
    books,
    verses,
    version: {
      code: version.code,
      name: version.name,
      importedAt: version.importedAt,
    },
  };
}

async function listDevotionalsForUser(user) {
  const prisma = getPrisma();
  const plans = await prisma.spiritualDevotionalPlan.findMany({
    where: { active: true },
    include: { days: { orderBy: { dayIndex: 'asc' } } },
    orderBy: { id: 'desc' },
  });
  const scoped = filterByScope(plans, user);
  const priority = { trainer: 3, gym: 2, global: 1 };
  return scoped.sort((a, b) => {
    const sa = priority[String(a.scopeType || 'global').toLowerCase()] || 0;
    const sb = priority[String(b.scopeType || 'global').toLowerCase()] || 0;
    return sb - sa || b.id - a.id;
  });
}

async function startDevotional(userId, planId) {
  const prisma = getPrisma();
  const plan = await prisma.spiritualDevotionalPlan.findUnique({ where: { id: Number(planId) } });
  if (!plan) throw new Error('Plan no encontrado');
  await platformAudit.log(userId, 'spiritual', 'devotional.started', 'devotional_plan', planId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  await communicationCenter.dispatchEvent({
    evento: 'devotional.started',
    modulo: 'spiritual',
    userId,
    targetEmail: user?.email,
    vars: { user: { nombre: user?.nombre }, devotional: { title: plan.title } },
  });
  return { ok: true, plan_id: planId };
}

async function completeDevotionalDay(userId, planId, dayIndex) {
  const prisma = getPrisma();
  const pid = Number(planId);
  const day = Number(dayIndex);
  await prisma.spiritualDevotionalProgress.upsert({
    where: { userId_planId_dayIndex: { userId, planId: pid, dayIndex: day } },
    create: { userId, planId: pid, dayIndex: day },
    update: { completedAt: new Date() },
  });
  const plan = await prisma.spiritualDevotionalPlan.findUnique({ where: { id: pid } });
  const progress = await prisma.spiritualDevotionalProgress.count({ where: { userId, planId: pid } });
  const action = progress >= (plan?.durationDays || 0) ? 'devotional.completed' : 'devotional.day_completed';
  await platformAudit.log(userId, 'spiritual', action, 'devotional_plan', pid, { day_index: day });
  if (action === 'devotional.completed') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await communicationCenter.dispatchEvent({
      evento: 'devotional.completed',
      modulo: 'spiritual',
      userId,
      targetEmail: user?.email,
      vars: { user: { nombre: user?.nombre }, devotional: { title: plan?.title } },
    });
  }
  return { completed: true, progress, total: plan?.durationDays || 0 };
}

async function getDevotionalProgress(userId, planId) {
  const prisma = getPrisma();
  return prisma.spiritualDevotionalProgress.findMany({
    where: { userId, planId: Number(planId) },
    orderBy: { dayIndex: 'asc' },
  });
}

// --- Studies ---

async function adminListStudies() {
  const prisma = getPrisma();
  return prisma.spiritualStudy.findMany({
    include: { category: true, author: true },
    orderBy: { id: 'desc' },
  });
}

async function adminSaveStudy(userId, body) {
  const prisma = getPrisma();
  const scope = scopeFields(body);
  const data = {
    title: body.title,
    description: body.description || null,
    mediaType: body.media_type || body.mediaType || 'pdf',
    mediaUrl: body.media_url || body.mediaUrl || '',
    categoryId: body.category_id ? Number(body.category_id) : null,
    authorId: body.author_id ? Number(body.author_id) : null,
    tags: body.tags || [],
    active: body.active !== false,
    ...scope,
  };
  let row;
  if (body.id) {
    row = await prisma.spiritualStudy.update({ where: { id: Number(body.id) }, data });
  } else {
    row = await prisma.spiritualStudy.create({ data });
  }
  await platformAudit.log(userId, 'spiritual', 'study.saved', 'study', row.id);
  return row;
}

async function adminSaveCategory(name) {
  const prisma = getPrisma();
  return prisma.spiritualStudyCategory.upsert({
    where: { name },
    create: { name },
    update: { active: true },
  });
}

async function adminSaveAuthor(name) {
  const prisma = getPrisma();
  return prisma.spiritualStudyAuthor.upsert({
    where: { name },
    create: { name },
    update: { active: true },
  });
}

async function listStudiesForUser(user) {
  const prisma = getPrisma();
  const rows = await prisma.spiritualStudy.findMany({
    where: { active: true },
    include: { category: true, author: true },
    orderBy: { id: 'desc' },
  });
  const scoped = filterByScope(rows, user);
  const priority = { trainer: 3, gym: 2, global: 1 };
  return scoped.sort((a, b) => {
    const sa = priority[String(a.scopeType || 'global').toLowerCase()] || 0;
    const sb = priority[String(b.scopeType || 'global').toLowerCase()] || 0;
    return sb - sa || b.id - a.id;
  });
}

async function openStudy(userId, studyId) {
  await platformAudit.log(userId, 'spiritual', 'study.opened', 'study', studyId);
  const prisma = getPrisma();
  return prisma.spiritualStudy.findUnique({
    where: { id: Number(studyId) },
    include: { category: true, author: true },
  });
}

// --- Events ---

async function adminListEvents() {
  const prisma = getPrisma();
  return prisma.spiritualEvent.findMany({ orderBy: { startTime: 'asc' } });
}

async function adminSaveEvent(userId, body) {
  const prisma = getPrisma();
  const scope = scopeFields(body);
  const data = {
    title: body.title,
    description: body.description || null,
    mode: body.mode || 'virtual',
    location: body.location || null,
    zoomLink: body.zoom_link || null,
    meetLink: body.meet_link || null,
    startTime: new Date(body.start_time),
    endTime: new Date(body.end_time),
    capacity: body.capacity ? Number(body.capacity) : null,
    active: body.active !== false,
    ...scope,
  };
  let row;
  if (body.id) {
    row = await prisma.spiritualEvent.update({ where: { id: Number(body.id) }, data });
  } else {
    row = await prisma.spiritualEvent.create({ data });
    await platformAudit.log(userId, 'spiritual', 'event.created', 'event', row.id);
    const users = await resolveUsersForScope(row);
    for (const u of users.slice(0, 200)) {
      await communicationCenter.dispatchEvent({
        evento: 'event.created',
        modulo: 'spiritual',
        userId: u.id,
        targetEmail: u.email,
        vars: {
          user: { nombre: u.nombre },
          event: { title: row.title, start_time: row.startTime.toISOString() },
        },
      });
    }
  }
  return row;
}

async function listEventsForUser(user) {
  const prisma = getPrisma();
  const now = new Date();
  const rows = await prisma.spiritualEvent.findMany({
    where: { active: true, endTime: { gte: now } },
    orderBy: { startTime: 'asc' },
    take: 20,
  });
  const scoped = filterByScope(rows, user);
  const priority = { trainer: 3, gym: 2, global: 1 };
  return scoped.sort((a, b) => {
    const sa = priority[String(a.scopeType || 'global').toLowerCase()] || 0;
    const sb = priority[String(b.scopeType || 'global').toLowerCase()] || 0;
    return sb - sa;
  });
}

async function registerEvent(userId, eventId) {
  const prisma = getPrisma();
  const eid = Number(eventId);
  const reg = await prisma.spiritualEventRegistration.upsert({
    where: { eventId_userId: { eventId: eid, userId } },
    create: { eventId: eid, userId },
    update: { status: 'registered' },
  });
  await platformAudit.log(userId, 'spiritual', 'event.registered', 'event', eid);
  return reg;
}

async function attendEvent(userId, eventId) {
  const prisma = getPrisma();
  const eid = Number(eventId);
  const att = await prisma.spiritualEventAttendance.upsert({
    where: { eventId_userId: { eventId: eid, userId } },
    create: { eventId: eid, userId },
    update: { joinedAt: new Date() },
  });
  await platformAudit.log(userId, 'spiritual', 'event.attended', 'event', eid);
  return att;
}

async function sendEventReminders() {
  const prisma = getPrisma();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await prisma.spiritualEvent.findMany({
    where: {
      active: true,
      reminderSent: false,
      startTime: { gte: now, lte: in24h },
    },
  });
  let sent = 0;
  for (const ev of events) {
    const regs = await prisma.spiritualEventRegistration.findMany({
      where: { eventId: ev.id },
      include: { },
    });
    for (const reg of regs) {
      const user = await prisma.user.findUnique({ where: { id: reg.userId } });
      if (!user) continue;
      await communicationCenter.dispatchEvent({
        evento: 'event.reminder',
        modulo: 'spiritual',
        userId: user.id,
        targetEmail: user.email,
        vars: {
          user: { nombre: user.nombre },
          event: { title: ev.title, start_time: ev.startTime.toISOString() },
        },
      });
    }
    await prisma.spiritualEvent.update({ where: { id: ev.id }, data: { reminderSent: true } });
    sent += 1;
  }
  return { sent };
}

// --- Feed ---

async function getTodayFeed(user) {
  const userId = user.id || user.user_id;
  const [verse, devotionals, studies, events] = await Promise.all([
    getTodayVerse(user),
    listDevotionalsForUser(user),
    listStudiesForUser(user),
    listEventsForUser(user),
  ]);

  let activeDevotional = null;
  if (devotionals.length) {
    const plan = devotionals[0];
    const progress = userId
      ? await getDevotionalProgress(userId, plan.id)
      : [];
    const completedDays = new Set(progress.map((p) => p.dayIndex));
    const nextDay = plan.days.find((d) => !completedDays.has(d.dayIndex)) || plan.days[0];
    activeDevotional = {
      plan_id: plan.id,
      title: plan.title,
      duration_days: plan.durationDays,
      completed_count: progress.length,
      next_day: nextDay ? {
        day_index: nextDay.dayIndex,
        reflection: nextDay.reflection,
        prayer: nextDay.prayer,
        challenge: nextDay.challenge,
      } : null,
    };
  }

  return {
    enabled: enabled(),
    verse,
    devotional: activeDevotional,
    studies: studies.slice(0, 5),
    events: events.slice(0, 5),
  };
}

module.exports = {
  enabled,
  listBibleVersions,
  listBooks,
  getChapter,
  searchBible,
  toggleFavorite,
  listFavorites,
  toggleBookmark,
  listBookmarks,
  logBibleRead,
  adminListVersesOfDay,
  adminSaveVerseOfDay,
  getTodayVerse,
  adminListDevotionals,
  adminSaveDevotional,
  listDevotionalsForUser,
  startDevotional,
  completeDevotionalDay,
  getDevotionalProgress,
  adminListStudies,
  adminSaveStudy,
  adminSaveCategory,
  adminSaveAuthor,
  listStudiesForUser,
  openStudy,
  adminListEvents,
  adminSaveEvent,
  listEventsForUser,
  registerEvent,
  attendEvent,
  sendEventReminders,
  getTodayFeed,
  getBibleStats,
  localDateString,
};
