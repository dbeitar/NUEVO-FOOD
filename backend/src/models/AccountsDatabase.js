// Base de datos en memoria para cuentas/suscripciones
class AccountsDatabase {
  constructor() {
    this.accounts = [
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
    this.nextId = 3;
    
    // Planes disponibles
    this.planes = [
      {
        nombre: 'basico',
        descripcion: 'Acceso a calculadora y food log',
        precio_mensual: 99000,
        features: ['Calculadora Nutricional', 'Food Log', 'Historial de alimentos'],
        max_usuarios: 1000,
        usuarios_activos: 0,
      },
      {
        nombre: 'premium',
        descripcion: 'Acceso completo + entrenador personal',
        precio_mensual: 299000,
        features: ['Todos del plan básico', 'Entrenador personal', 'Recomendaciones IA', '2 sesiones/semana'],
        max_usuarios: 500,
        usuarios_activos: 0,
      },
      {
        nombre: 'elite',
        descripcion: 'Plan completo personalizado',
        precio_mensual: 499000,
        features: ['Todos del plan premium', 'Nutricionista incluido', '4 sesiones/semana', 'Análisis corporal'],
        max_usuarios: 100,
        usuarios_activos: 0,
      },
    ];
    // Recalcular usuarios activos por plan según cuentas iniciales
    this.accounts.forEach(a => {
      const p = this.planes.find(pl => pl.nombre === a.plan);
      if (p) p.usuarios_activos = (p.usuarios_activos || 0) + 1;
    });
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
    return newAccount;
  }

  update(id, accountData) {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return null;
    
    Object.assign(account, accountData, { activo: account.activo });
    return account;
  }

  delete(id) {
    const account = this.accounts.find(a => a.id === id);
    if (!account) return false;
    
    account.activo = false;
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
      descripcion: plan.descripcion || '',
      precio_mensual: plan.precio_mensual || 0,
      features: Array.isArray(plan.features) ? plan.features : [],
      max_usuarios: typeof plan.max_usuarios === 'number' ? plan.max_usuarios : 0,
      usuarios_activos: 0,
    });
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
    return plan;
  }

  deletePlan(nombre) {
    const idx = this.planes.findIndex(p => p.nombre === nombre);
    if (idx === -1) return false;
    this.planes.splice(idx, 1);
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
    
    return account;
  }

  incPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = (plan.usuarios_activos || 0) + 1;
    return true;
    }

  decPlanUsers(nombre) {
    const plan = this.getPlanByNombre(nombre);
    if (!plan) return false;
    plan.usuarios_activos = Math.max(0, (plan.usuarios_activos || 0) - 1);
    return true;
  }
}

module.exports = new AccountsDatabase();
