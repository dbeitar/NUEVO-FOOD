const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const domainRepo = require('../db/repositories/domainDocumentRepository');

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
        day_label: 'Lunes',
        class_type: 'FUERZA',
        coach: 'Alejo',
        capacity: 40,
        enrolled_user_ids: [],
        attendance_user_ids: [],
        attendance_events: [],
        source_module: 'd28d',
        locked: true,
        start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        end_time: new Date(Date.now() + 1000 * 60 * 95).toISOString(),
        active: true,
        created_at: new Date().toISOString(),
      },
    ];

    if (!useRelationalStorage()) {
      this.store = new JsonStore('live_classes.json', initial);
      this.rows = this.normalizeRows(Array.isArray(this.store.getAll()) ? this.store.getAll() : []);
    } else {
      this.rows = [];
    }
    this.nextId = this.rows.length > 0 ? Math.max(...this.rows.map((item) => item.id || 0)) + 1 : 1;
    if (!useRelationalStorage()) this.store.setAll(this.rows);
  }

  async hydrate() {
    if (!useRelationalStorage()) return;
    const arr = await domainRepo.getArray('live_classes');
    this.rows = this.normalizeRows(Array.isArray(arr) && arr.length ? arr : []);
    this.nextId = this.rows.length > 0 ? Math.max(...this.rows.map((item) => item.id || 0)) + 1 : 1;
  }

  _persist() {
    if (useRelationalStorage()) {
      domainRepo.setArray('live_classes', this.rows).catch((e) => console.error('[LiveClass]', e.message));
    } else {
      this._persist();
    }
  }

  normalizeRows(rows) {
    return rows.map((item) => {
      const sourceModule = item.source_module || (item.is_global || item.gym_id === null ? 'd28d' : 'gym');
      return {
        ...item,
        attendance_user_ids: Array.isArray(item.attendance_user_ids) ? item.attendance_user_ids : [],
        attendance_events: Array.isArray(item.attendance_events) ? item.attendance_events : [],
        source_module: sourceModule,
        locked: item.locked === true || sourceModule === 'd28d',
        d28d_routine_id: item.d28d_routine_id != null ? Number(item.d28d_routine_id) : null,
        d28d_routine_version: item.d28d_routine_version != null ? Number(item.d28d_routine_version) : null,
        d28d_routine_snapshot: item.d28d_routine_snapshot || null,
      };
    });
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
      day_label: String(data.day_label || '').trim(),
      program_id: data.program_id || null,
      class_type: String(data.class_type || 'METODO D28D').trim(),
      coach: String(data.coach || '').trim(),
      capacity: Number(data.capacity || 40),
      enrolled_user_ids: Array.isArray(data.enrolled_user_ids) ? data.enrolled_user_ids : [],
      attendance_user_ids: Array.isArray(data.attendance_user_ids) ? data.attendance_user_ids : [],
      attendance_events: Array.isArray(data.attendance_events) ? data.attendance_events : [],
      source_module: data.source_module || (data.is_global !== false ? 'd28d' : 'gym'),
      locked: data.locked === true || data.source_module === 'd28d',
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      active: data.active !== false,
      d28d_routine_id: data.d28d_routine_id != null ? Number(data.d28d_routine_id) : null,
      d28d_routine_version: data.d28d_routine_version != null ? Number(data.d28d_routine_version) : null,
      d28d_routine_snapshot: data.d28d_routine_snapshot || null,
      created_at: new Date().toISOString(),
    };
    this.rows.push(newClass);
    this._persist();
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
    if (updates.day_label !== undefined) item.day_label = String(updates.day_label || '').trim();
    if (updates.program_id !== undefined) item.program_id = updates.program_id || null;
    if (updates.class_type !== undefined) item.class_type = String(updates.class_type || '').trim();
    if (updates.coach !== undefined) item.coach = String(updates.coach || '').trim();
    if (updates.capacity !== undefined) item.capacity = Number(updates.capacity || 40);
    if (updates.start_time !== undefined) item.start_time = new Date(updates.start_time).toISOString();
    if (updates.end_time !== undefined) item.end_time = new Date(updates.end_time).toISOString();
    if (updates.active !== undefined) item.active = !!updates.active;
    if (updates.source_module !== undefined) item.source_module = String(updates.source_module || 'gym');
    if (updates.locked !== undefined) item.locked = !!updates.locked;
    if (updates.d28d_routine_id !== undefined) {
      item.d28d_routine_id = updates.d28d_routine_id != null ? Number(updates.d28d_routine_id) : null;
    }
    if (updates.d28d_routine_version !== undefined) {
      item.d28d_routine_version = updates.d28d_routine_version != null ? Number(updates.d28d_routine_version) : null;
    }
    if (updates.d28d_routine_snapshot !== undefined) {
      item.d28d_routine_snapshot = updates.d28d_routine_snapshot || null;
    }
    this._persist();
    return item;
  }

  attend(classId, user) {
    const item = this.getById(classId);
    if (!item || !item.active) return null;
    const userId = user?.id;
    if (!userId) return null;
    const current = Array.isArray(item.attendance_user_ids) ? item.attendance_user_ids : [];
    if (!current.includes(userId)) {
      item.attendance_user_ids = [...current, userId];
    }
    const events = Array.isArray(item.attendance_events) ? item.attendance_events : [];
    item.attendance_events = [
      ...events,
      {
        user_id: userId,
        email: user.email || '',
        gym_id: user.gym_id || user.gymId || null,
        joined_at: new Date().toISOString(),
        trigger: 'join_zoom_click',
      },
    ];
    this._persist();
    return item;
  }

  enroll(classId, userId) {
    const item = this.getById(classId);
    if (!item || !item.active) return null;
    const current = Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids : [];
    if (current.includes(userId)) return item;
    if (current.length >= Number(item.capacity || 40)) {
      const error = new Error('Clase llena');
      error.code = 'CLASS_FULL';
      throw error;
    }
    item.enrolled_user_ids = [...current, userId];
    this._persist();
    return item;
  }

  unenroll(classId, userId) {
    const item = this.getById(classId);
    if (!item) return null;
    const current = Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids : [];
    item.enrolled_user_ids = current.filter((id) => id !== userId);
    this._persist();
    return item;
  }

  seedD28DWeek(baseDate = new Date()) {
    const start = new Date(baseDate);
    const day = start.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const slots = [
      ['07:00', '08:00', 'METODO D28D'],
      ['08:00', '09:00', 'FUERZA'],
      ['18:00', '19:00', 'METODO D28D'],
      ['19:00', '20:00', 'FUERZA'],
    ];
    const created = [];
    days.forEach((dayLabel, dayIndex) => {
      slots.forEach(([from, to, type]) => {
        const [fromHour, fromMin] = from.split(':').map(Number);
        const [toHour, toMin] = to.split(':').map(Number);
        const classStart = new Date(start);
        classStart.setDate(start.getDate() + dayIndex);
        classStart.setHours(fromHour, fromMin, 0, 0);
        const classEnd = new Date(start);
        classEnd.setDate(start.getDate() + dayIndex);
        classEnd.setHours(toHour, toMin, 0, 0);
        const exists = this.rows.some((item) => item.day_label === dayLabel && item.class_type === type && item.start_time === classStart.toISOString());
        if (!exists) {
          created.push(this.create({
            title: `${type} D28D - ${dayLabel} ${from}`,
            description: type === 'FUERZA' ? 'Bloque de fuerza guiado para el ciclo D28D.' : 'Clase principal del Metodo D28D.',
            zoom_link: 'https://zoom.us/j/d28d-demo',
            gym_id: null,
            is_global: true,
            source_module: 'd28d',
            locked: true,
            day_label: dayLabel,
            class_type: type,
            coach: dayLabel === 'Lunes' || dayLabel === 'Martes' ? 'Alejo' : 'Coach D28D',
            capacity: 40,
            start_time: classStart,
            end_time: classEnd,
            active: true,
          }));
        }
      });
    });
    return created;
  }

  delete(id) {
    const index = this.rows.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.rows.splice(index, 1);
    this._persist();
    return true;
  }
}

module.exports = new LiveClassDatabase();
