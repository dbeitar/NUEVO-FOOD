const JsonStore = require('../utils/JsonStore');

class LiveClassDatabase {
  constructor() {
    const initial = [
      {
        id: 1,
        title: 'Clase en Vivo D28D - Fuerza Total',
        description: 'Sesión en vivo para todos los gimnasios afiliados, con coach centralizado.',
        zoom_link: 'https://zoom.us/j/1234567890',
        gym_id: null,
        is_global: true,
        start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        end_time: new Date(Date.now() + 1000 * 60 * 95).toISOString(),
        active: true,
        created_at: new Date().toISOString(),
      },
    ];

    this.store = new JsonStore('live_classes.json', initial);
    this.rows = Array.isArray(this.store.getAll()) ? this.store.getAll() : [];
    this.nextId = this.rows.length > 0 ? Math.max(...this.rows.map((item) => item.id || 0)) + 1 : 1;
  }

  getAll() {
    return [...this.rows].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }

  getById(id) {
    return this.rows.find((item) => item.id === id) || null;
  }

  create(data) {
    const newClass = {
      id: this.nextId++,
      title: String(data.title).trim(),
      description: String(data.description || '').trim(),
      zoom_link: String(data.zoom_link).trim(),
      gym_id: data.gym_id || null,
      is_global: data.is_global !== false,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      active: data.active !== false,
      created_at: new Date().toISOString(),
    };
    this.rows.push(newClass);
    this.store.setAll(this.rows);
    return newClass;
  }

  update(id, updates) {
    const item = this.getById(id);
    if (!item) return null;
    if (updates.title !== undefined) item.title = String(updates.title).trim();
    if (updates.description !== undefined) item.description = String(updates.description || '').trim();
    if (updates.zoom_link !== undefined) item.zoom_link = String(updates.zoom_link).trim();
    if (updates.gym_id !== undefined) item.gym_id = updates.gym_id || null;
    if (updates.is_global !== undefined) item.is_global = updates.is_global;
    if (updates.start_time !== undefined) item.start_time = new Date(updates.start_time).toISOString();
    if (updates.end_time !== undefined) item.end_time = new Date(updates.end_time).toISOString();
    if (updates.active !== undefined) item.active = !!updates.active;
    this.store.setAll(this.rows);
    return item;
  }

  delete(id) {
    const index = this.rows.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    this.store.setAll(this.rows);
    return true;
  }
}

module.exports = new LiveClassDatabase();
