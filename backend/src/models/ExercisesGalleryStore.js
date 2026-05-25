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

  getPublic() {
    return [...rows].filter((item) => item.is_global !== false).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  getByExerciseName(name) {
    const key = normalize(name);
    return rows.find((r) => normalize(r.name) === key) || null;
  },

  create({ name, muscle_group = '', youtube_url, created_by = null, is_global = true, gym_id = null, trainer_id = null }) {
    const key = normalize(name);
    const dup = rows.find((r) => {
      if (normalize(r.name) !== key) return false;
      if (trainer_id != null) return Number(r.trainer_id) === Number(trainer_id);
      if (gym_id != null) return Number(r.gym_id) === Number(gym_id);
      return r.is_global !== false && r.trainer_id == null && r.gym_id == null;
    });
    if (dup) {
      return { error: 'Ya existe un video para ese ejercicio en tu catálogo' };
    }
    const item = {
      id: nextId++,
      name: String(name).trim(),
      muscle_group: String(muscle_group || '').trim(),
      youtube_url: String(youtube_url).trim(),
      is_global: is_global !== false,
      created_by,
      gym_id: gym_id != null ? Number(gym_id) : null,
      trainer_id: trainer_id != null ? Number(trainer_id) : null,
      created_at: new Date().toISOString(),
    };
    rows.push(item);
    store.setAll(rows);
    return item;
  },

  getById(id) {
    return rows.find((r) => r.id === Number(id)) || null;
  },

  update(id, patch = {}) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    const item = rows[idx];
    if (patch.name !== undefined) {
      const nextName = String(patch.name).trim();
      const key = normalize(nextName);
      const dup = rows.find((r) => r.id !== Number(id) && normalize(r.name) === key);
      if (dup) return { error: 'Ya existe un video para ese ejercicio' };
      item.name = nextName;
    }
    if (patch.muscle_group !== undefined) {
      item.muscle_group = String(patch.muscle_group || '').trim();
    }
    if (patch.youtube_url !== undefined) {
      item.youtube_url = String(patch.youtube_url || '').trim() || null;
    }
    if (patch.is_global !== undefined) {
      item.is_global = patch.is_global !== false;
    }
    if (patch.gym_id !== undefined) {
      item.gym_id = patch.gym_id != null ? Number(patch.gym_id) : null;
    }
    if (patch.trainer_id !== undefined) {
      item.trainer_id = patch.trainer_id != null ? Number(patch.trainer_id) : null;
    }
    item.updated_at = new Date().toISOString();
    rows[idx] = item;
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
