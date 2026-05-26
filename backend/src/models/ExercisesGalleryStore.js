const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const domainRepo = require('../db/repositories/domainDocumentRepository');
const { detectPlatform } = require('../utils/videoPlatform');

const store = new JsonStore('exercises_gallery.json', []);
let rows = [];
let nextId = 1;

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function cleanText(value = '') {
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function recomputeNextId() {
  nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;
}

function persistRows() {
  if (useRelationalStorage()) {
    domainRepo.setArray('exercises_gallery', rows).catch((e) => {
      console.error('[ExercisesGalleryStore] persist:', e.message);
    });
  } else {
    store.setAll(rows);
  }
}

if (!useRelationalStorage()) {
  rows = (store.getAll() || []).map((r) => ({ status: 'active', ...r }));
  recomputeNextId();
}

function scopeMatch(row, { trainer_id = null, gym_id = null, is_global = false }) {
  if (trainer_id != null) return Number(row.trainer_id) === Number(trainer_id);
  if (gym_id != null) return Number(row.gym_id) === Number(gym_id);
  if (is_global) return row.is_global !== false && row.trainer_id == null && row.gym_id == null;
  return row.trainer_id == null && row.gym_id == null;
}

function findInScope(name, scope) {
  const key = normalize(name);
  return rows.find((r) => normalize(r.name) === key && scopeMatch(r, scope)) || null;
}

async function hydrate() {
  if (!useRelationalStorage()) return;
  const fromDb = await domainRepo.getArray('exercises_gallery');
  rows = Array.isArray(fromDb) ? fromDb : [];
  if (!rows.length) {
    const disk = store.getAll();
    if (Array.isArray(disk) && disk.length) {
      rows = disk;
      await domainRepo.setArray('exercises_gallery', rows);
    }
  }
  rows = rows.map((r) => ({
    status: r.status || 'active',
    platform: r.platform || detectPlatform(r.youtube_url || r.video_url),
    ...r,
    name: cleanText(r.name || r.exercise_name || ''),
    muscle_group: cleanText(r.muscle_group || ''),
    youtube_url: cleanText(r.youtube_url || r.video_url || '') || null,
  }));
  recomputeNextId();
}

const ExercisesGalleryStore = {
  getAll() {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  getPublic() {
    return [...rows]
      .filter((item) => item.is_global !== false && (item.status || 'active') === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },

  getByExerciseName(name, scope = {}) {
    return findInScope(name, scope);
  },

  create({
    name,
    muscle_group = '',
    youtube_url,
    notes = '',
    created_by = null,
    is_global = true,
    gym_id = null,
    trainer_id = null,
    status = 'active',
  }) {
    const scope = {
      trainer_id,
      gym_id,
      is_global: trainer_id == null && gym_id == null && is_global !== false,
    };
    const dup = findInScope(name, scope);
    if (dup) {
      return { error: 'Ya existe un video para ese ejercicio en tu catálogo' };
    }
    const url = cleanText(youtube_url || '');
    const item = {
      id: nextId++,
      name: cleanText(name),
      muscle_group: cleanText(muscle_group),
      youtube_url: url || null,
      video_url: url || null,
      platform: detectPlatform(url),
      status: status || 'active',
      notes: cleanText(notes),
      is_global: scope.is_global,
      created_by,
      gym_id: gym_id != null ? Number(gym_id) : null,
      trainer_id: trainer_id != null ? Number(trainer_id) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    rows.push(item);
    persistRows();
    return item;
  },

  upsert({
    name,
    muscle_group = '',
    youtube_url = '',
    notes = '',
    trainer_id = null,
    gym_id = null,
    is_global = false,
    created_by = null,
  }) {
    const scope = {
      trainer_id,
      gym_id,
      is_global: trainer_id == null && gym_id == null && is_global,
    };
    const existing = findInScope(name, scope);
    const url = cleanText(youtube_url || '');
    const group = cleanText(muscle_group);

    if (!existing) {
      const created = this.create({
        name,
        muscle_group: group,
        youtube_url: url,
        notes,
        trainer_id,
        gym_id,
        is_global: scope.is_global,
        created_by,
        status: 'active',
      });
      if (created.error) return { action: 'skipped', reason: created.error };
      return { action: 'created', item: created };
    }

    let changed = false;
    if (group && (!existing.muscle_group || existing.muscle_group.length < group.length)) {
      existing.muscle_group = group;
      changed = true;
    }
    if (url && (!existing.youtube_url || existing.youtube_url.length < url.length)) {
      existing.youtube_url = url;
      existing.video_url = url;
      existing.platform = detectPlatform(url);
      changed = true;
    }
    if (notes && (!existing.notes || notes.length > (existing.notes || '').length)) {
      existing.notes = notes;
      changed = true;
    }
    if ((existing.status || 'active') !== 'active') {
      existing.status = 'active';
      changed = true;
    }
    if (changed) {
      existing.updated_at = new Date().toISOString();
      persistRows();
      return { action: 'updated', item: existing };
    }
    return { action: 'skipped', item: existing, reason: 'sin cambios' };
  },

  getById(id) {
    return rows.find((r) => r.id === Number(id)) || null;
  },

  update(id, patch = {}) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return null;
    const item = rows[idx];
    if (patch.name !== undefined) {
      const nextName = cleanText(patch.name);
      const key = normalize(nextName);
      const dup = rows.find(
        (r) => r.id !== Number(id)
          && normalize(r.name) === key
          && scopeMatch(r, {
            trainer_id: item.trainer_id,
            gym_id: item.gym_id,
            is_global: item.is_global,
          }),
      );
      if (dup) return { error: 'Ya existe un video para ese ejercicio' };
      item.name = nextName;
    }
    if (patch.muscle_group !== undefined) {
      item.muscle_group = cleanText(patch.muscle_group);
    }
    if (patch.youtube_url !== undefined) {
      const url = cleanText(patch.youtube_url) || null;
      item.youtube_url = url;
      item.video_url = url;
      item.platform = detectPlatform(url);
    }
    if (patch.notes !== undefined) item.notes = cleanText(patch.notes);
    if (patch.status !== undefined) item.status = patch.status || 'active';
    if (patch.is_global !== undefined) item.is_global = patch.is_global !== false;
    if (patch.gym_id !== undefined) item.gym_id = patch.gym_id != null ? Number(patch.gym_id) : null;
    if (patch.trainer_id !== undefined) item.trainer_id = patch.trainer_id != null ? Number(patch.trainer_id) : null;
    item.updated_at = new Date().toISOString();
    rows[idx] = item;
    persistRows();
    return item;
  },

  delete(id) {
    const idx = rows.findIndex((r) => r.id === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    persistRows();
    return true;
  },

  hydrate,
};

module.exports = ExercisesGalleryStore;
