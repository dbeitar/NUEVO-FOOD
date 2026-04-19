const JsonStore = require('../utils/JsonStore');

const seed = [];
const store = new JsonStore('exercises_gallery.json', seed);
let rows = store.getAll();
if (!Array.isArray(rows)) rows = [];
let nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ExercisesGalleryStore = {
  getAll() {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  getByExerciseName(name) {
    const key = normalize(name);
    return rows.find((r) => normalize(r.name) === key) || null;
  },

  create({ name, muscle_group = '', youtube_url, created_by = null }) {
    const exists = this.getByExerciseName(name);
    if (exists) {
      return { error: 'Ya existe un video para ese ejercicio' };
    }
    const item = {
      id: nextId++,
      name: String(name).trim(),
      muscle_group: String(muscle_group || '').trim(),
      youtube_url: String(youtube_url).trim(),
      created_by,
      created_at: new Date().toISOString(),
    };
    rows.push(item);
    store.setAll(rows);
    return item;
  },

  delete(id) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    store.setAll(rows);
    return true;
  },
};

module.exports = ExercisesGalleryStore;
