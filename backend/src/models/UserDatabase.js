const JsonStore = require('../utils/JsonStore');
const bcryptjs = require('bcryptjs');
const { hydrateAccess, normalizeRoles } = require('../utils/accessControl');

class UserDatabase {
  constructor() {
    const initialUsers = [
      {
        id: 1,
        nombre: 'Super Admin',
        email: 'admin@foodplan.local',
        clave_hash: bcryptjs.hashSync('Admin!234', 10),
        rol: 'super_admin',
        roles: ['super_admin']
      },
      {
        id: 2,
        nombre: 'D28D Admin',
        email: 'admin.d28d@foodplan.local',
        clave_hash: bcryptjs.hashSync('Admin!234', 10),
        rol: 'super_admin',
        roles: ['super_admin', 'admin_d28d']
      },
      {
        id: 3,
        nombre: 'Admin Gym Test',
        email: 'admin.gym@test.foodplan.local',
        clave_hash: bcryptjs.hashSync('Admin!234', 10),
        rol: 'admin_gimnasio',
        roles: ['admin_gimnasio', 'admin_gym']
      },
      {
        id: 4,
        nombre: 'Entrenador Test',
        email: 'trainer@test.foodplan.local',
        clave_hash: bcryptjs.hashSync('Admin!234', 10),
        rol: 'entrenador',
        roles: ['entrenador', 'admin_training']
      },
      {
        id: 5,
        nombre: 'Cliente Test',
        email: 'cliente@foodplan.local',
        clave_hash: bcryptjs.hashSync('Admin!234', 10),
        rol: 'usuario_final',
        roles: ['usuario_final']
      }
    ];

    this.store = new JsonStore('users.json', initialUsers);
    this.users = (this.store.getAll() || []).map((user) => this.normalizeUser(user));

    this.nextId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
  }

  save() {
    this.store.setAll(this.users);
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
    return this.users.find(u => u.id === id);
  }

  getByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  create(userData) {
    const newUser = {
      id: this.nextId++,
      nombre: userData.nombre,
      email: userData.email,
      clave_hash: userData.clave_hash, // Already hashed
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
      fecha_registro: new Date()
    };
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  update(id, updates) {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    Object.assign(user, this.normalizeUser(user));
    this.save();
    return user;
  }

  delete(id) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    this.save();
    return true;
  }
}

module.exports = new UserDatabase();
