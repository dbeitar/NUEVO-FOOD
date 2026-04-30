const JsonStore = require('../utils/JsonStore');

class GymDatabase {
  constructor() {
    const initial = [
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
        capacidad_usuarios: 50,
        activo: true,
        creado: new Date('2026-01-15').toISOString(),
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
        capacidad_usuarios: 50,
        activo: true,
        creado: new Date('2026-01-20').toISOString(),
      },
    ];

    this.store = new JsonStore('gyms.json', initial);
    this.gyms = this._normalizeDates(this.store.getAll() || []);
    this.nextId = this.gyms.length > 0 ? Math.max(...this.gyms.map((g) => g.id)) + 1 : 1;
  }

  _normalizeDates(list) {
    return (Array.isArray(list) ? list : []).map((g) => ({
      ...g,
      creado: g?.creado ? String(g.creado) : new Date().toISOString(),
      activo: g?.activo !== false,
    }));
  }

  save() {
    this.store.setAll(this.gyms);
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
      capacidad_usuarios: gymData.capacidad_usuarios ?? 50,
      activo: true,
      creado: new Date().toISOString(),
    };
    this.gyms.push(newGym);
    this.save();
    return newGym;
  }

  update(id, gymData) {
    const gym = this.gyms.find(g => g.id === id);
    if (!gym) return null;
    
    Object.assign(gym, gymData, { activo: gym.activo });
    this.save();
    return gym;
  }

  delete(id) {
    const gym = this.gyms.find(g => g.id === id);
    if (!gym) return false;
    
    gym.activo = false;
    this.save();
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
