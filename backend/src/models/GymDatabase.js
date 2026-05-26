const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const gymRepo = require('../db/repositories/gymRepository');

const INITIAL_GYMS = [
  {
    id: 1,
    nombre: 'Gym Pro Fitness',
    direccion: 'Calle 50 #25-45, Bogotá',
    teléfono: '+57 (1) 2345-6789',
    email: 'info@gympro.com',
    ciudad: 'Bogotá',
    país: 'Colombia',
    logo_url: 'https://via.placeholder.com/140x40.png?text=Gym+Pro',
    brand_name: 'Gym Pro Fitness',
    brand_slug: 'gym-pro-fitness',
    white_label_enabled: true,
    welcome_message: 'Entrena con el metodo D28D desde tu sede.',
    support_whatsapp: '+573001234567',
    primary_color: '#2563eb',
    secondary_color: '#10b981',
    status: 'active',
    latitude: 4.711,
    longitude: -74.0055,
    capacidad_usuarios: 50,
    activo: true,
    creado: new Date('2026-01-15').toISOString(),
    plan_id: 'basico',
    invite_code: 'GYM-PRO-001',
  },
  {
    id: 2,
    nombre: 'Fitness Hub Medellín',
    direccion: 'Carrera 45 #15-20, Medellín',
    teléfono: '+57 (4) 4455-6789',
    email: 'contact@fitnesshub.com',
    ciudad: 'Medellín',
    país: 'Colombia',
    logo_url: 'https://via.placeholder.com/140x40.png?text=Fitness+Hub',
    brand_name: 'Fitness Hub Medellin',
    brand_slug: 'fitness-hub-medellin',
    white_label_enabled: true,
    welcome_message: 'Programa D28D para comunidad Fitness Hub.',
    support_whatsapp: '+573004455678',
    primary_color: '#047857',
    secondary_color: '#d97706',
    status: 'active',
    latitude: 6.2442,
    longitude: -75.5812,
    capacidad_usuarios: 50,
    activo: true,
    creado: new Date('2026-01-20').toISOString(),
    plan_id: 'vip',
    invite_code: 'GYM-HUB-002',
  },
];

class GymDatabase {
  constructor() {
    this.gyms = [];
    this.nextId = 1;
    this._hydrated = false;

    if (!useRelationalStorage()) {
      this.store = new JsonStore('gyms.json', INITIAL_GYMS);
      this.gyms = this._normalizeDates(this.store.getAll() || []);
      this.nextId = this.gyms.length > 0 ? Math.max(...this.gyms.map((g) => g.id)) + 1 : 1;
      this._hydrated = true;
    }
  }

  async hydrate() {
    if (!useRelationalStorage() || this._hydrated) return;
    this.gyms = this._normalizeDates(await gymRepo.findAllLegacy());
    this.nextId = this.gyms.length > 0 ? Math.max(...this.gyms.map((g) => g.id)) + 1 : 1;
    this._hydrated = true;
  }

  _normalizeDates(list) {
    return (Array.isArray(list) ? list : []).map((g) => ({
      ...g,
      creado: g?.creado ? String(g.creado) : new Date().toISOString(),
      activo: g?.activo !== false,
    }));
  }

  save() {
    if (!useRelationalStorage()) this.store.setAll(this.gyms);
  }

  getAll() {
    return this.gyms.filter((g) => g.activo && g.status !== 'inactive');
  }

  getById(id) {
    return this.gyms.find((g) => g.id === id && g.activo && g.status !== 'inactive');
  }

  getByInviteCode(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!c) return null;
    return this.gyms.find(
      (g) => g.activo && g.status !== 'inactive' && String(g.invite_code || '').trim().toUpperCase() === c,
    ) || null;
  }

  create(gymData) {
    const newGym = {
      id: this.nextId++,
      ...gymData,
      capacidad_usuarios: gymData.capacidad_usuarios ?? 50,
      logo_url: gymData.logo_url || '',
      brand_name: gymData.brand_name || gymData.nombre,
      brand_slug: gymData.brand_slug || String(gymData.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      white_label_enabled: gymData.white_label_enabled === true || gymData.white_label_enabled === 'true',
      welcome_message: gymData.welcome_message || '',
      support_whatsapp: gymData.support_whatsapp || '',
      primary_color: gymData.primary_color || '#2563eb',
      secondary_color: gymData.secondary_color || '#10b981',
      status: gymData.status || 'active',
      activo: gymData.activo !== false,
      creado: new Date().toISOString(),
    };
    this.gyms.push(newGym);
    if (useRelationalStorage()) {
      gymRepo.createLegacy(newGym).catch((e) => console.error('[GymDatabase]', e.message));
    } else {
      this.save();
    }
    return newGym;
  }

  update(id, gymData) {
    const gym = this.gyms.find((g) => g.id === id);
    if (!gym) return null;
    Object.assign(gym, gymData);
    if (gymData.status !== undefined) {
      gym.status = gymData.status;
      if (gymData.status === 'inactive') gym.activo = false;
    }
    if (useRelationalStorage()) {
      gymRepo.updateLegacy(id, gym).catch((e) => console.error('[GymDatabase]', e.message));
    } else {
      this.save();
    }
    return gym;
  }

  delete(id) {
    const gym = this.gyms.find((g) => g.id === id);
    if (!gym) return false;
    gym.activo = false;
    if (useRelationalStorage()) {
      gymRepo.deleteSoft(id).catch((e) => console.error('[GymDatabase]', e.message));
    } else {
      this.save();
    }
    return true;
  }

  getByCiudad(ciudad) {
    return this.gyms.filter((g) => g.activo && g.ciudad === ciudad);
  }

  search(query) {
    const q = query.toLowerCase();
    return this.gyms.filter((g) =>
      g.activo && (
        g.nombre.toLowerCase().includes(q)
        || g.ciudad.toLowerCase().includes(q)
        || g.email.toLowerCase().includes(q)
      ),
    );
  }
}

module.exports = new GymDatabase();
