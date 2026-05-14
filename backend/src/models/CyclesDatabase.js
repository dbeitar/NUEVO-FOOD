const JsonStore = require('../utils/JsonStore');

// Ciclos D28D. Cada ciclo dura 28 días (4 semanas exactas). El año se
// divide en 13 ciclos = 364 días. Los ciclos son **editables**: un
// administrador puede crear nuevos, modificar fechas o eliminar los que
// ya no apliquen sin tocar código.
//
// Seed inicial: 13 ciclos del calendario anual base D28D.
const INITIAL_CYCLES = [
  { id: 1,  name: 'Ciclo 1',  startDate: '2026-12-14', label: 'Vacacional' },
  { id: 2,  name: 'Ciclo 2',  startDate: '2026-01-12', label: '' },
  { id: 3,  name: 'Ciclo 3',  startDate: '2026-02-09', label: '' },
  { id: 4,  name: 'Ciclo 4',  startDate: '2026-03-09', label: '' },
  { id: 5,  name: 'Ciclo 5',  startDate: '2026-04-06', label: '' },
  { id: 6,  name: 'Ciclo 6',  startDate: '2026-05-04', label: '' },
  { id: 7,  name: 'Ciclo 7',  startDate: '2026-06-01', label: '' },
  { id: 8,  name: 'Ciclo 8',  startDate: '2026-06-29', label: '' },
  { id: 9,  name: 'Ciclo 9',  startDate: '2026-07-27', label: '' },
  { id: 10, name: 'Ciclo 10', startDate: '2026-08-24', label: '' },
  { id: 11, name: 'Ciclo 11', startDate: '2026-09-21', label: '' },
  { id: 12, name: 'Ciclo 12', startDate: '2026-10-19', label: '' },
  { id: 13, name: 'Ciclo 13', startDate: '2026-11-16', label: '' },
];

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function normalize(cycle) {
  return {
    id: Number(cycle.id),
    name: String(cycle.name || `Ciclo ${cycle.id}`),
    startDate: String(cycle.startDate),
    label: cycle.label ? String(cycle.label) : '',
  };
}

class CyclesDatabase {
  constructor() {
    this.store = new JsonStore('cycles.json', INITIAL_CYCLES);
    this.cycles = (this.store.getAll() || []).map(normalize);
    if (this.cycles.length === 0) {
      this.cycles = INITIAL_CYCLES.map(normalize);
      this.persist();
    }
  }

  persist() {
    this.store.setAll(this.cycles);
  }

  nextId() {
    return this.cycles.length === 0 ? 1 : Math.max(...this.cycles.map((c) => c.id)) + 1;
  }

  getAll() {
    return [...this.cycles].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }

  getById(id) {
    return this.cycles.find((c) => c.id === Number(id)) || null;
  }

  create({ name, startDate, label }) {
    if (!isValidDate(startDate)) {
      return { error: 'startDate inválido (formato YYYY-MM-DD)' };
    }
    const id = this.nextId();
    const cycle = normalize({ id, name: name || `Ciclo ${id}`, startDate, label });
    this.cycles.push(cycle);
    this.persist();
    return { data: cycle };
  }

  update(id, updates) {
    const idx = this.cycles.findIndex((c) => c.id === Number(id));
    if (idx === -1) return { error: 'Ciclo no encontrado', status: 404 };
    const merged = { ...this.cycles[idx], ...updates };
    if (updates.startDate && !isValidDate(updates.startDate)) {
      return { error: 'startDate inválido (formato YYYY-MM-DD)' };
    }
    this.cycles[idx] = normalize({ ...merged, id: this.cycles[idx].id });
    this.persist();
    return { data: this.cycles[idx] };
  }

  delete(id) {
    const idx = this.cycles.findIndex((c) => c.id === Number(id));
    if (idx === -1) return { error: 'Ciclo no encontrado', status: 404 };
    const removed = this.cycles.splice(idx, 1)[0];
    this.persist();
    return { data: removed };
  }
}

module.exports = new CyclesDatabase();
