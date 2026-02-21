// Base de datos en memoria para gimnasios
class GymDatabase {
  constructor() {
    this.gyms = [
      {
        id: 1,
        nombre: 'Gym Pro Fitness',
        direccion: 'Calle 50 #25-45, Bogotá',
        teléfono: '+57 (1) 2345-6789',
        email: 'info@gympro.com',
        ciudad: 'Bogotá',
        país: 'Colombia',
        latitude: 4.7110,
        longitude: -74.0055,
        activo: true,
        creado: new Date('2026-01-15'),
      },
      {
        id: 2,
        nombre: 'Fitness Hub Medellín',
        direccion: 'Carrera 45 #15-20, Medellín',
        teléfono: '+57 (4) 4455-6789',
        email: 'contact@fitnesshub.com',
        ciudad: 'Medellín',
        país: 'Colombia',
        latitude: 6.2442,
        longitude: -75.5812,
        activo: true,
        creado: new Date('2026-01-20'),
      },
    ];
    this.nextId = 3;
  }

  getAll() {
    return this.gyms.filter(g => g.activo);
  }

  getById(id) {
    return this.gyms.find(g => g.id === id && g.activo);
  }

  create(gymData) {
    const newGym = {
      id: this.nextId++,
      ...gymData,
      activo: true,
      creado: new Date(),
    };
    this.gyms.push(newGym);
    return newGym;
  }

  update(id, gymData) {
    const gym = this.gyms.find(g => g.id === id);
    if (!gym) return null;
    
    Object.assign(gym, gymData, { activo: gym.activo });
    return gym;
  }

  delete(id) {
    const gym = this.gyms.find(g => g.id === id);
    if (!gym) return false;
    
    gym.activo = false;
    return true;
  }

  getByCiudad(ciudad) {
    return this.gyms.filter(g => g.activo && g.ciudad === ciudad);
  }

  search(query) {
    const q = query.toLowerCase();
    return this.gyms.filter(g => 
      g.activo && (
        g.nombre.toLowerCase().includes(q) ||
        g.ciudad.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q)
      )
    );
  }
}

module.exports = new GymDatabase();
