import api from '../services/api';

const base = '/spiritual';

export async function fetchSpiritualFeed() {
  const { data } = await api.get(`${base}/feed/today`);
  return data;
}

export async function searchBible(q) {
  const { data } = await api.get(`${base}/bible/search`, { params: { q } });
  return data;
}

export async function listBibleBooks() {
  const { data } = await api.get(`${base}/bible/books`);
  return data;
}

export async function getBibleChapter(bookCode, chapter) {
  const { data } = await api.get(`${base}/bible/${bookCode}/${chapter}`);
  return data;
}

export async function toggleFavorite(verseId) {
  const { data } = await api.post(`${base}/bible/favorites/${verseId}`);
  return data;
}

export async function startDevotional(planId) {
  const { data } = await api.post(`${base}/devotionals/${planId}/start`);
  return data;
}

export async function completeDevotionalDay(planId, dayIndex) {
  const { data } = await api.post(`${base}/devotionals/${planId}/complete`, { day_index: dayIndex });
  return data;
}

export async function openStudy(studyId) {
  const { data } = await api.get(`${base}/studies/${studyId}`);
  return data;
}

export async function registerEvent(eventId) {
  const { data } = await api.post(`${base}/events/${eventId}/register`);
  return data;
}

export async function attendEvent(eventId) {
  const { data } = await api.post(`${base}/events/${eventId}/attend`);
  return data;
}

// Admin
export async function adminListVerses() {
  const { data } = await api.get(`${base}/admin/verse-of-day`);
  return data;
}

export async function adminSaveVerse(body) {
  const { data } = await api.post(`${base}/admin/verse-of-day`, body);
  return data;
}

export async function adminListDevotionals() {
  const { data } = await api.get(`${base}/admin/devotionals`);
  return data;
}

export async function adminSaveDevotional(body) {
  const { data } = await api.post(`${base}/admin/devotionals`, body);
  return data;
}

export async function adminListStudies() {
  const { data } = await api.get(`${base}/admin/studies`);
  return data;
}

export async function adminSaveStudy(body) {
  const { data } = await api.post(`${base}/admin/studies`, body);
  return data;
}

export async function adminUploadStudy(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`${base}/admin/studies/upload`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function adminSaveCategory(name) {
  const { data } = await api.post(`${base}/admin/categories`, { name });
  return data;
}

export async function adminSaveAuthor(name) {
  const { data } = await api.post(`${base}/admin/authors`, { name });
  return data;
}

export async function adminListEvents() {
  const { data } = await api.get(`${base}/admin/events`);
  return data;
}

export async function adminSaveEvent(body) {
  const { data } = await api.post(`${base}/admin/events`, body);
  return data;
}

export async function adminImportBible(file, versionCode = 'RVR1960') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('version_code', versionCode);
  const { data } = await api.post(`${base}/admin/bible/import`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export function spiritualWidgetsEnabled() {
  return String(import.meta.env.VITE_SPIRITUAL_WIDGETS ?? 'true').toLowerCase() !== 'false';
}
