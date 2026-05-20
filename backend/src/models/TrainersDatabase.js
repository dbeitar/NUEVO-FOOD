const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const trainerRepo = require('../db/repositories/trainerRepository');

const INITIAL = [
  { id: 1, nombre: 'Carlos Rodríguez', email: 'carlos@trainers.com', teléfono: '+57 300-1234567', especialidad: 'Pérdida de Grasa', certificaciones: ['NASM Personal Trainer'], experiencia_años: 8, gym_id: 1, horario_disponible: 'L-V 6-18', tarifa_sesion: 150000, capacidad_usuarios: 50, activo: true, creado: new Date('2026-01-10').toISOString(), invite_code: 'COACH-CARLOS-001' },
  { id: 2, nombre: 'María González', email: 'maria@trainers.com', teléfono: '+57 300-7654321', especialidad: 'Ganancia Muscular', certificaciones: ['ISSA CPT'], experiencia_años: 6, gym_id: 1, horario_disponible: 'M-S 5-16', tarifa_sesion: 180000, capacidad_usuarios: 50, activo: true, creado: new Date('2026-01-12').toISOString(), invite_code: 'COACH-MARIA-002' },
  { id: 3, nombre: 'Juan Méndez', email: 'juan@trainers.com', teléfono: '+57 300-1111111', especialidad: 'Funcional', certificaciones: ['ACE CPT'], experiencia_años: 5, gym_id: 2, horario_disponible: 'L-V 7-19', tarifa_sesion: 160000, capacidad_usuarios: 50, activo: true, creado: new Date('2026-01-14').toISOString(), invite_code: 'COACH-JUAN-003' },
];

class TrainersDatabase {
  constructor() {
    this.trainers = [];
    this.nextId = 1;
    this._hydrated = false;
    if (!useRelationalStorage()) {
      this.store = new JsonStore('trainers.json', INITIAL);
      this.trainers = this._normalizeDates(this.store.getAll() || []);
      this.nextId = this.trainers.length ? Math.max(...this.trainers.map((t) => t.id)) + 1 : 1;
      this._hydrated = true;
    }
  }

  async hydrate() {
    if (!useRelationalStorage() || this._hydrated) return;
    this.trainers = this._normalizeDates(await trainerRepo.findAllLegacy());
    this.nextId = this.trainers.length ? Math.max(...this.trainers.map((t) => t.id)) + 1 : 1;
    this._hydrated = true;
  }

  _normalizeDates(list) {
    return (Array.isArray(list) ? list : []).map((t) => ({
      ...t,
      creado: t?.creado ? String(t.creado) : new Date().toISOString(),
      activo: t?.activo !== false,
    }));
  }

  save() {
    if (!useRelationalStorage()) this.store.setAll(this.trainers);
  }

  getAll() { return this.trainers.filter((t) => t.activo); }
  getById(id) { return this.trainers.find((t) => t.id === id && t.activo); }
  getByInviteCode(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!c) return null;
    return this.trainers.find((t) => t.activo && String(t.invite_code || '').trim().toUpperCase() === c) || null;
  }
  getByGymId(gymId) { return this.trainers.filter((t) => t.activo && t.gym_id === gymId); }

  create(trainerData) {
    const newTrainer = { id: this.nextId++, ...trainerData, capacidad_usuarios: trainerData.capacidad_usuarios ?? 50, activo: true, creado: new Date().toISOString() };
    this.trainers.push(newTrainer);
    if (useRelationalStorage()) trainerRepo.createLegacy(newTrainer).catch(console.error);
    else this.save();
    return newTrainer;
  }

  update(id, trainerData) {
    const trainer = this.trainers.find((t) => t.id === id);
    if (!trainer) return null;
    Object.assign(trainer, trainerData, { activo: trainer.activo });
    if (useRelationalStorage()) trainerRepo.updateLegacy(id, trainer).catch(console.error);
    else this.save();
    return trainer;
  }

  delete(id) {
    const trainer = this.trainers.find((t) => t.id === id);
    if (!trainer) return false;
    trainer.activo = false;
    if (useRelationalStorage()) trainerRepo.deleteSoft(id).catch(console.error);
    else this.save();
    return true;
  }

  searchBySpecialty(especialidad) {
    return this.trainers.filter((t) => t.activo && t.especialidad.toLowerCase().includes(especialidad.toLowerCase()));
  }

  search(query) {
    const q = query.toLowerCase();
    return this.trainers.filter((t) => t.activo && (t.nombre.toLowerCase().includes(q) || t.especialidad.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)));
  }
}

module.exports = new TrainersDatabase();
