const JsonStore = require('../utils/JsonStore');
const bcryptjs = require('bcryptjs');
const { hydrateAccess, normalizeRoles } = require('../utils/accessControl');
const { useRelationalStorage } = require('../utils/storageMode');
const userRepo = require('../db/repositories/userRepository');

function makeInitialUsers() {
  const seedPwd = String(process.env.INITIAL_USERS_PASSWORD || '').trim();
  const hash = seedPwd.length >= 8 ? bcryptjs.hashSync(seedPwd, 10) : '';
  return [
    { id: 1, nombre: 'Super Admin', email: 'admin@foodplan.local', clave_hash: hash, rol: 'super_admin', roles: ['super_admin'] },
    { id: 2, nombre: 'D28D Admin', email: 'admin.d28d@foodplan.local', clave_hash: hash, rol: 'super_admin', roles: ['super_admin', 'admin_d28d'] },
    { id: 3, nombre: 'Admin Gym Test', email: 'admin.gym@test.foodplan.local', clave_hash: hash, rol: 'admin_gimnasio', roles: ['admin_gimnasio', 'admin_gym'] },
    { id: 4, nombre: 'Entrenador Test', email: 'trainer@test.foodplan.local', clave_hash: hash, rol: 'entrenador', roles: ['entrenador', 'admin_training'] },
    { id: 5, nombre: 'Cliente Test', email: 'cliente@foodplan.local', clave_hash: hash, rol: 'usuario_final', roles: ['usuario_final'] },
  ];
}

class UserDatabase {
  constructor() {
    this.users = [];
    this.nextId = 1;
    this._hydrated = false;

    if (!useRelationalStorage()) {
      this.store = new JsonStore('users.json', makeInitialUsers());
      this.users = (this.store.getAll() || []).map((user) => this.normalizeUser(user));
      this.nextId = this.users.length > 0 ? Math.max(...this.users.map((u) => u.id)) + 1 : 1;
      this._hydrated = true;
    }
  }

  async hydrate() {
    if (!useRelationalStorage() || this._hydrated) return;
    this.users = (await userRepo.findAllLegacy()).map((u) => this.normalizeUser(u));
    this.nextId = this.users.length > 0 ? Math.max(...this.users.map((u) => u.id)) + 1 : 1;
    this._hydrated = true;
  }

  save() {
    if (!useRelationalStorage()) {
      this.store.setAll(this.users);
    }
  }

  _persistRelational(user) {
    if (!useRelationalStorage()) return;
    userRepo.updateLegacy(user.id, user).catch((e) => {
      console.error('[UserDatabase] persist:', e.message);
    });
  }

  normalizeUser(user) {
    const roles = normalizeRoles(user);
    const access = hydrateAccess({ ...user, roles });
    return {
      ...user,
      rol: user.rol || roles[0] || 'usuario_final',
      roles,
      permissions: access.permissions,
      module_access: user.module_access || {},
    };
  }

  getAll() {
    return this.users;
  }

  getById(id) {
    return this.users.find((u) => u.id === id);
  }

  getByEmail(email) {
    return this.users.find((u) => u.email === email);
  }

  async create(userData) {
    const newUser = {
      id: this.nextId++,
      nombre: userData.nombre,
      email: userData.email,
      clave_hash: userData.clave_hash,
      rol: userData.rol || 'usuario_final',
      roles: normalizeRoles(userData),
      permissions: hydrateAccess(userData).permissions,
      module_access: userData.module_access || {},
      telefono: userData.telefono || null,
      fecha_nacimiento: userData.fecha_nacimiento || null,
      peso: userData.peso ?? null,
      altura: userData.altura ?? null,
      objetivo: userData.objetivo || null,
      tiene_restricciones: userData.tiene_restricciones ?? false,
      restricciones_detalles: userData.restricciones_detalles || '',
      genero: userData.genero || null,
      medidas_biomecanicas: userData.medidas_biomecanicas || null,
      experiencia: userData.experiencia || 'principiante',
      metodo_entrenamiento: userData.metodo_entrenamiento || null,
      gym_id: userData.gym_id || null,
      trainer_id: userData.trainer_id || null,
      gymId: userData.gymId || (userData.gym_id ?? null),
      planId: userData.planId || null,
      fecha_registro: new Date(),
    };
    const normalized = this.normalizeUser(newUser);

    if (useRelationalStorage()) {
      const saved = await userRepo.createLegacy(normalized);
      const finalUser = this.normalizeUser({ ...normalized, ...saved, id: saved.id });
      this.users.push(finalUser);
      this.nextId = Math.max(this.nextId, saved.id + 1);
      return finalUser;
    }

    this.users.push(normalized);
    this.save();
    return normalized;
  }

  update(id, updates) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    const normalized = this.normalizeUser(user);
    Object.assign(user, normalized);

    if (useRelationalStorage()) {
      this._persistRelational(user);
    } else {
      this.save();
    }
    return user;
  }

  delete(id) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);

    if (useRelationalStorage()) {
      userRepo.deleteSoft(id).catch((e) => console.error('[UserDatabase] delete:', e.message));
    } else {
      this.save();
    }
    return true;
  }
}

module.exports = new UserDatabase();
