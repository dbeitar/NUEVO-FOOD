// Base de datos en memoria para entrenadores
class TrainersDatabase {
  constructor() {
    this.trainers = [
      {
        id: 1,
        nombre: 'Carlos Rodríguez',
        email: 'carlos@trainers.com',
        teléfono: '+57 300-1234567',
        especialidad: 'Pérdida de Grasa',
        certificaciones: ['NASM Personal Trainer', 'Nutrición Deportiva'],
        experiencia_años: 8,
        gym_id: 1,
        horario_disponible: 'Lunes-Viernes 6AM-6PM',
        tarifa_sesion: 150000,
        activo: true,
        creado: new Date('2026-01-10'),
      },
      {
        id: 2,
        nombre: 'María González',
        email: 'maria@trainers.com',
        teléfono: '+57 300-7654321',
        especialidad: 'Ganancia Muscular',
        certificaciones: ['ISSA CPT', 'Powerlifting Intermediate'],
        experiencia_años: 6,
        gym_id: 1,
        horario_disponible: 'Martes-Sábado 5AM-4PM',
        tarifa_sesion: 180000,
        activo: true,
        creado: new Date('2026-01-12'),
      },
      {
        id: 3,
        nombre: 'Juan Méndez',
        email: 'juan@trainers.com',
        teléfono: '+57 300-1111111',
        especialidad: 'Entrenamiento Funcional',
        certificaciones: ['ACE Fitness Professional', 'Nutrición Integral'],
        experiencia_años: 5,
        gym_id: 2,
        horario_disponible: 'Lunes-Viernes 7AM-7PM',
        tarifa_sesion: 160000,
        activo: true,
        creado: new Date('2026-01-14'),
      },
    ];
    this.nextId = 4;
  }

  getAll() {
    return this.trainers.filter(t => t.activo);
  }

  getById(id) {
    return this.trainers.find(t => t.id === id && t.activo);
  }

  getByGymId(gymId) {
    return this.trainers.filter(t => t.activo && t.gym_id === gymId);
  }

  create(trainerData) {
    const newTrainer = {
      id: this.nextId++,
      ...trainerData,
      activo: true,
      creado: new Date(),
    };
    this.trainers.push(newTrainer);
    return newTrainer;
  }

  update(id, trainerData) {
    const trainer = this.trainers.find(t => t.id === id);
    if (!trainer) return null;
    
    Object.assign(trainer, trainerData, { activo: trainer.activo });
    return trainer;
  }

  delete(id) {
    const trainer = this.trainers.find(t => t.id === id);
    if (!trainer) return false;
    
    trainer.activo = false;
    return true;
  }

  searchBySpecialty(especialidad) {
    return this.trainers.filter(t =>
      t.activo && t.especialidad.toLowerCase().includes(especialidad.toLowerCase())
    );
  }

  search(query) {
    const q = query.toLowerCase();
    return this.trainers.filter(t =>
      t.activo && (
        t.nombre.toLowerCase().includes(q) ||
        t.especialidad.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      )
    );
  }
}

module.exports = new TrainersDatabase();
