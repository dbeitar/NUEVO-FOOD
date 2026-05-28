const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const accountsRepo = require('../db/repositories/accountsRepository');
const { DEFAULT_COMMERCIAL_PLANS } = require('../seed/seedCommercialPlans');

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

const DEFAULT_PLANES = DEFAULT_COMMERCIAL_PLANS;

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

    // Backfill defensivo de campos nuevos (para evitar drift entre seeds viejas y modelo actual).
    // No toca Food; solo normaliza planes/cuentas del core.
    let needsUpsert = false;
    this.planes = (Array.isArray(this.planes) ? this.planes : []).map((p) => {
      const kind = p.kind || 'd28d';
      const module_access = (p.module_access && typeof p.module_access === 'object') ? p.module_access : {};
      const precio_mensual_usd = typeof p.precio_mensual_usd === 'number' ? p.precio_mensual_usd : 0;
      const included_seats = Number(p.included_seats) || 1;
      const is_couple = !!p.is_couple;
      const cycle_ids = Array.isArray(p.cycle_ids) && p.cycle_ids.length
        ? p.cycle_ids
        : (kind === 'd28d' ? [7] : []);
      if (
        p.kind !== kind ||
        p.module_access !== module_access ||
        p.precio_mensual_usd !== precio_mensual_usd ||
        p.included_seats !== included_seats ||
        p.is_couple !== is_couple ||
        !Array.isArray(p.cycle_ids)
      ) {
        needsUpsert = true;
      }
      return {
        ...p,
        kind,
        module_access,
        precio_mensual_usd,
        included_seats,
        is_couple,
        cycle_ids,
      };
    });
    if (needsUpsert) {
      for (const p of this.planes) {
        await accountsRepo.upsertPlan(p);
      }
      const reloaded = await accountsRepo.loadState();
      this.planes = reloaded.planes;
      this.accounts = reloaded.accounts;
      this.nextId = reloaded.nextId;
    }

    const { DEFAULT_SUPPORT_PHONE, defaultMessageForPlan } = require('../utils/whatsappSupport');
    let needsSupportBackfill = false;
    this.planes = this.planes.map((p) => {
      if (p.support_whatsapp && String(p.support_whatsapp).trim()) return p;
      needsSupportBackfill = true;
      return {
        ...p,
        support_whatsapp: DEFAULT_SUPPORT_PHONE,
        support_name: p.support_name || 'Soporte D28D',
        support_message: defaultMessageForPlan(p),
        support_activo: p.support_activo !== false,
      };
    });
    if (needsSupportBackfill) {
      for (const p of this.planes) {
        await accountsRepo.upsertPlan(p);
      }
      const reloaded = await accountsRepo.loadState();
      this.planes = reloaded.planes;
    }

    const hasTraining = this.planes.some((p) => String(p.kind) === 'training');
    if (!hasTraining) {
      const trainingPlan = DEFAULT_PLANES.find((p) => p.kind === 'training');
      if (trainingPlan) {
        await accountsRepo.upsertPlan(trainingPlan);
        const reloaded = await accountsRepo.loadState();
        this.planes = reloaded.planes;
        this.accounts = reloaded.accounts;
        this.nextId = reloaded.nextId;
      }
    }

    try {
      const programInviteRepo = require('../db/repositories/programInviteRepository');
      await programInviteRepo.seedDefaultsIfEmpty();
    } catch (e) {
      console.warn('[AccountsDatabase] seed program invites:', e.message);
    }

    try {
      const { COMMERCIAL_D28D_PLANS } = require('../seed/seedCommercialPlans');
      for (const p of COMMERCIAL_D28D_PLANS) {
        await accountsRepo.upsertPlan(p);
      }
      const deprecated = ['D28D Vital - Bienestar', 'Pancitas Fit - Gestación'];
      for (const name of deprecated) {
        const old = this.planes.find((x) => x.nombre === name);
        if (old) await accountsRepo.upsertPlan({ ...old, activo: false, visible: false });
      }
      const synced = await accountsRepo.loadState();
      this.planes = synced.planes;
    } catch (e) {
      console.warn('[AccountsDatabase] sync commercial plans:', e.message);
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

  async create(accountData) {
    if (useRelationalStorage()) {
      const row = await accountsRepo.createAccount({
        ...accountData,
        activo: accountData.activo !== false,
        fecha_inicio: accountData.fecha_inicio || new Date(),
      });
      this.accounts = this.accounts.filter((a) => a.id !== row.id);
      this.accounts.push(row);
      if (row.id >= this.nextId) this.nextId = row.id + 1;
      return row;
    }
    const newAccount = {
      id: this.nextId++,
      ...accountData,
      activo: true,
      fecha_inicio: accountData.fecha_inicio || new Date(),
    };
    this.accounts.push(newAccount);
    this._persist();
    return newAccount;
  }

  async update(id, accountData) {
    if (useRelationalStorage()) {
      const row = await accountsRepo.updateAccount(id, accountData);
      const idx = this.accounts.findIndex((a) => a.id === id);
      if (idx >= 0) this.accounts[idx] = row;
      else this.accounts.push(row);
      return row;
    }
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    Object.assign(account, accountData, { activo: account.activo });
    this._persist();
    return account;
  }

  async delete(id) {
    if (useRelationalStorage()) {
      await accountsRepo.softDeleteAccount(id);
      const account = this.accounts.find((a) => a.id === id);
      if (account) account.activo = false;
      return !!account;
    }
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

  async addPlan(plan) {
    if (!plan || !plan.nombre) return null;
    if (this.getPlanByNombre(plan.nombre)) return null;
    const entry = {
      nombre: plan.nombre,
      program_id: plan.program_id || 'virtual_d28d',
      kind: plan.kind || 'd28d',
      descripcion: plan.descripcion || '',
      precio_mensual: plan.precio_mensual || 0,
      precio_mensual_usd: plan.precio_mensual_usd || 0,
      features: Array.isArray(plan.features) ? plan.features : [],
      max_usuarios: typeof plan.max_usuarios === 'number' ? plan.max_usuarios : 0,
      usuarios_activos: 0,
      module_access: plan.module_access && typeof plan.module_access === 'object' ? plan.module_access : {},
      is_couple: !!plan.is_couple,
      included_seats: Number(plan.included_seats) || 1,
      cycle_ids: Array.isArray(plan.cycle_ids) ? plan.cycle_ids : [],
      activo: plan.activo !== false,
      visible: plan.visible !== false,
      sort_order: Number(plan.sort_order) || 0,
      cycles_count: plan.cycles_count != null ? Number(plan.cycles_count) : null,
      support_whatsapp: plan.support_whatsapp || null,
      support_name: plan.support_name || null,
      support_message: plan.support_message || null,
      support_activo: plan.support_activo !== false,
    };
    if (useRelationalStorage()) {
      await accountsRepo.upsertPlan(entry);
      const reloaded = await accountsRepo.loadState();
      this.planes = reloaded.planes;
      return this.getPlanByNombre(plan.nombre);
    }
    this.planes.push(entry);
    this._persist();
    return this.getPlanByNombre(plan.nombre);
  }

  async updatePlan(nombre, updates) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return null;
    if (updates.nombre && updates.nombre !== nombre) {
      if (this.getPlanByNombre(updates.nombre)) return null;
      plan.nombre = updates.nombre;
    }
    if (typeof updates.descripcion !== 'undefined') plan.descripcion = updates.descripcion;
    if (typeof updates.precio_mensual !== 'undefined') plan.precio_mensual = updates.precio_mensual;
    if (typeof updates.precio_mensual_usd !== 'undefined') plan.precio_mensual_usd = updates.precio_mensual_usd;
    if (Array.isArray(updates.features)) plan.features = updates.features;
    if (typeof updates.max_usuarios === 'number') plan.max_usuarios = updates.max_usuarios;
    if (updates.program_id) plan.program_id = updates.program_id;
    if (updates.kind) plan.kind = updates.kind;
    if (updates.module_access && typeof updates.module_access === 'object') plan.module_access = updates.module_access;
    if (typeof updates.is_couple !== 'undefined') plan.is_couple = !!updates.is_couple;
    if (typeof updates.included_seats !== 'undefined') plan.included_seats = Number(updates.included_seats) || 1;
    if (Array.isArray(updates.cycle_ids)) plan.cycle_ids = updates.cycle_ids;
    if (typeof updates.activo !== 'undefined') plan.activo = !!updates.activo;
    if (typeof updates.visible !== 'undefined') plan.visible = !!updates.visible;
    if (typeof updates.sort_order !== 'undefined') plan.sort_order = Number(updates.sort_order) || 0;
    if (typeof updates.cycles_count !== 'undefined') {
      plan.cycles_count = updates.cycles_count != null ? Number(updates.cycles_count) : null;
    }
    if (typeof updates.support_whatsapp !== 'undefined') {
      plan.support_whatsapp = updates.support_whatsapp || null;
    }
    if (typeof updates.support_name !== 'undefined') {
      plan.support_name = updates.support_name || null;
    }
    if (typeof updates.support_message !== 'undefined') {
      plan.support_message = updates.support_message || null;
    }
    if (typeof updates.support_activo !== 'undefined') {
      plan.support_activo = updates.support_activo !== false;
    }
    if (useRelationalStorage()) {
      await accountsRepo.upsertPlan(plan);
      const reloaded = await accountsRepo.loadState();
      this.planes = reloaded.planes;
      return this.getPlanByNombre(plan.nombre);
    }
    this._persist();
    return plan;
  }

  async deletePlan(nombre) {
    const idx = this.planes.findIndex(p => p.nombre === nombre);
    if (idx === -1) return false;
    if (useRelationalStorage()) {
      await accountsRepo.deletePlan(nombre);
    }
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

  async incPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = (plan.usuarios_activos || 0) + 1;
    if (useRelationalStorage()) {
      await accountsRepo.adjustPlanUsers(nombre, 1);
    }
    this._persist();
    return true;
  }

  async decPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = Math.max(0, (plan.usuarios_activos || 0) - 1);
    if (useRelationalStorage()) {
      await accountsRepo.adjustPlanUsers(nombre, -1);
    }
    this._persist();
    return true;
  }
}

module.exports = new AccountsDatabase();
