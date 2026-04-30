const JsonStore = require('../utils/JsonStore');

const TEST_DEFINITIONS = [
  { key: 'abdominales', label: 'Abdominales', unit: 'reps', higher_is_better: true },
  { key: 'burpees', label: 'Burpees', unit: 'reps', higher_is_better: true },
  { key: 'flexiones', label: 'Flexiones', unit: 'reps', higher_is_better: true },
  { key: 'sentadilla', label: 'Sentadilla', unit: 'reps', higher_is_better: true },
  { key: 'plancha', label: 'Plancha', unit: 'seg', higher_is_better: true },
];

const cycleDates = [
  ['Enero 13', '2026-01-13'],
  ['Febrero 10', '2026-02-10'],
  ['Marzo 10', '2026-03-10'],
  ['Abril 7', '2026-04-07'],
  ['Mayo 5', '2026-05-05'],
  ['Junio 2', '2026-06-02'],
  ['Junio 30', '2026-06-30'],
  ['Julio 28', '2026-07-28'],
  ['Agosto 25', '2026-08-25'],
  ['Septiembre 22', '2026-09-22'],
  ['Octubre 20', '2026-10-20'],
  ['Noviembre 17', '2026-11-17'],
];

class FitnessTestDatabase {
  constructor() {
    const initial = cycleDates.map(([name, date], index) => ({
      id: index + 1,
      name: `Ciclo D28D - ${name}`,
      test_date: date,
      description: 'Pruebas D28D: abdominales, burpees, flexiones, sentadilla y plancha.',
      tests: TEST_DEFINITIONS,
      active: true,
      enrolled_user_ids: [],
      results: [],
      created_at: new Date().toISOString(),
    }));
    this.store = new JsonStore('fitness_tests.json', initial);
    this.rows = Array.isArray(this.store.getAll()) ? this.store.getAll() : [];
    this.nextId = this.rows.length > 0 ? Math.max(...this.rows.map((item) => item.id || 0)) + 1 : 1;
  }

  getAll() {
    return [...this.rows].sort((a, b) => new Date(a.test_date) - new Date(b.test_date));
  }

  getById(id) {
    return this.rows.find((item) => item.id === id) || null;
  }

  enroll(id, userId) {
    const item = this.getById(id);
    if (!item || !item.active) return null;
    const current = Array.isArray(item.enrolled_user_ids) ? item.enrolled_user_ids : [];
    if (!current.includes(userId)) item.enrolled_user_ids = [...current, userId];
    this.store.setAll(this.rows);
    return item;
  }

  recordResult(id, user, scores) {
    const item = this.getById(id);
    if (!item || !item.active) return null;
    const normalized = {};
    TEST_DEFINITIONS.forEach((test) => {
      normalized[test.key] = Number(scores?.[test.key] || 0);
    });
    const total = TEST_DEFINITIONS.reduce((sum, test) => sum + normalized[test.key], 0);
    const results = Array.isArray(item.results) ? item.results : [];
    const existingIndex = results.findIndex((result) => result.user_id === user.id);
    const record = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.nombre || user.email,
      scores: normalized,
      total,
      recorded_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) results[existingIndex] = record;
    else results.push(record);
    item.results = results;
    this.enroll(id, user.id);
    this.store.setAll(this.rows);
    return item;
  }
}

module.exports = new FitnessTestDatabase();
module.exports.TEST_DEFINITIONS = TEST_DEFINITIONS;
