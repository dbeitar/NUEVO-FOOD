const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const accountsRepo = require('../db/repositories/accountsRepository');

const DEFAULT_ACCOUNTS = [
      {
        id: 1,
        user_id: 1,
        plan: 'premium',
        gym_id: 1,
        trainer_id: 1,
        fecha_inicio: new Date('2026-02-01'),
        fecha_vencimiento: new Date('2026-05-01'),
        estado: 'activo',
        sesiones_restantes: 12,
        sesiones_totales: 24,
        precio_mensual: 299000,
        metodoPago: 'tarjeta_crédito',
        activo: true,
      },
      {
        id: 2,
        user_id: 2,
        plan: 'basico',
        gym_id: 1,
        trainer_id: null,
        fecha_inicio: new Date('2026-02-10'),
        fecha_vencimiento: new Date('2026-03-10'),
        estado: 'activo',
        sesiones_restantes: 0,
        sesiones_totales: 0,
        precio_mensual: 99000,
        metodoPago: 'transferencia',
        activo: true,
      },
];

const DEFAULT_PLANES = [
      {
        nombre: 'D28D Virtual - Básico',
        program_id: 'virtual_d28d',
        descripcion: 'Acceso a clases grabadas y comunidad',
        precio_mensual: 99000,
        features: ['Clases grabadas', 'Comunidad Virtual', 'Soporte vía App'],
        max_usuarios: 1000,
        usuarios_activos: 0,
      },
      {
        nombre: 'D28D Virtual - Premium',
        program_id: 'virtual_d28d',
        descripcion: 'Acceso completo + Clases en vivo',
        precio_mensual: 199000,
        features: ['Clases en vivo', 'Todo el contenido grabado', 'Chat con coach'],
        max_usuarios: 500,
        usuarios_activos: 0,
      },
      {
        nombre: 'Pancitas Fit - Gestación',
        program_id: 'pancitas',
        descripcion: 'Plan especial para el embarazo',
        precio_mensual: 249000,
        features: ['Ejercicios seguros', 'Guía nutricional gestacional', 'Clases en vivo exclusivas'],
        max_usuarios: 200,
        usuarios_activos: 0,
      },
      {
        nombre: 'D28D Vital - Bienestar',
        program_id: 'vital',
        descripcion: 'Plan de salud y longevidad',
        precio_mensual: 159000,
        features: ['Yoga y Movilidad', 'Mindfulness', 'Webinars de salud'],
        max_usuarios: 300,
        usuarios_activos: 0,
      },
];

const DEFAULT_STATE = {
  accounts: DEFAULT_ACCOUNTS,
  planes: DEFAULT_PLANES,
  nextId: 3,
};

// Cuentas y planes de suscripción (persistidos vía JsonStore / PostgreSQL)
class AccountsDatabase {
  constructor() {
    this.accounts = [];
    this.planes = [];
    this.nextId = 1;
    if (!useRelationalStorage()) {
      this.store = new JsonStore('accounts_state.json', DEFAULT_STATE);
      const state = this.store.getAll();
      if (state?.accounts) {
        this.accounts = state.accounts;
        this.planes = state.planes || DEFAULT_PLANES;
        this.nextId = state.nextId || 3;
      } else {
        this.accounts = [...DEFAULT_ACCOUNTS];
        this.planes = [...DEFAULT_PLANES];
        this.nextId = 3;
      }
    }
  }

  async hydrate() {
    if (!useRelationalStorage()) return;
    const state = await accountsRepo.loadState();
    if (!state.planes.length) {
      for (const p of DEFAULT_PLANES) await accountsRepo.upsertPlan(p);
      const reloaded = await accountsRepo.loadState();
      this.planes = reloaded.planes;
      this.accounts = reloaded.accounts;
      this.nextId = reloaded.nextId;
    } else {
      this.planes = state.planes;
      this.accounts = state.accounts;
      this.nextId = state.nextId;
    }
  }

  _persist() {
    if (!useRelationalStorage()) {
      this.store.setAll({ accounts: this.accounts, planes: this.planes, nextId: this.nextId });
    }
  }

  getAll() {
    return this.accounts.filter(a => a.activo);
  }

  getById(id) {
    return this.accounts.find(a => a.id === id && a.activo);
  }

  getByUserId(userId) {
    return this.accounts.find(a => a.user_id === userId && a.activo);
  }

  create(accountData) {
    const newAccount = {
      id: this.nextId++,
      ...accountData,
      activo: true,
      fecha_inicio: new Date(),
    };
    this.accounts.push(newAccount);
    this._persist();
    return newAccount;
  }

  update(id, accountData) {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    
    Object.assign(account, accountData, { activo: account.activo });
    this._persist();
    return account;
  }

  delete(id) {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return false;
    
    account.activo = false;
    this._persist();
    return true;
  }

  getPlanes() {
    return this.planes;
  }

  getPlanByNombre(nombre) {
    return this.planes.find(p => p.nombre === nombre);
  }

  addPlan(plan) {
    if (!plan || !plan.nombre) return null;
    if (this.getPlanByNombre(plan.nombre)) return null;
    this.planes.push({
      nombre: plan.nombre,
      program_id: plan.program_id || 'virtual_d28d',
      descripcion: plan.descripcion || '',
      precio_mensual: plan.precio_mensual || 0,
      features: Array.isArray(plan.features) ? plan.features : [],
      max_usuarios: typeof plan.max_usuarios === 'number' ? plan.max_usuarios : 0,
      usuarios_activos: 0,
    });
    this._persist();
    return this.getPlanByNombre(plan.nombre);
  }

  updatePlan(nombre, updates) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return null;
    if (updates.nombre && updates.nombre !== nombre) {
      // Prevent duplicate names
      if (this.getPlanByNombre(updates.nombre)) return null;
      plan.nombre = updates.nombre;
    }
    if (typeof updates.descripcion !== 'undefined') plan.descripcion = updates.descripcion;
    if (typeof updates.precio_mensual !== 'undefined') plan.precio_mensual = updates.precio_mensual;
    if (Array.isArray(updates.features)) plan.features = updates.features;
    if (typeof updates.max_usuarios === 'number') plan.max_usuarios = updates.max_usuarios;
    if (updates.program_id) plan.program_id = updates.program_id;
    this._persist();
    return plan;
  }

  deletePlan(nombre) {
    const idx = this.planes.findIndex(p => p.nombre === nombre);
    if (idx === -1) return false;
    this.planes.splice(idx, 1);
    this._persist();
    return true;
  }

  getByGymId(gymId) {
    return this.accounts.filter(a => a.activo && a.gym_id === gymId);
  }

  getExpiringSoon() {
    const hoy = new Date();
    const proximosMesT = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return this.accounts.filter(a => 
      a.activo && 
      a.fecha_vencimiento >= hoy && 
      a.fecha_vencimiento <= proximosMesT &&
      a.estado === 'activo'
    );
  }

  renovarPlan(id, nuevosPlan) {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    
    const plan = this.getPlanByNombre(nuevosPlan);
    if (!plan) return null;
    
    account.plan = nuevosPlan;
    account.precio_mensual = plan.precio_mensual;
    account.fecha_inicio = new Date();
    account.fecha_vencimiento = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000);
    account.estado = 'activo';
    this._persist();
    return account;
  }

  incPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = (plan.usuarios_activos || 0) + 1;
    this._persist();
    return true;
  }

  decPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = Math.max(0, (plan.usuarios_activos || 0) - 1);
    this._persist();
    return true;
  }
}

module.exports = new AccountsDatabase();
