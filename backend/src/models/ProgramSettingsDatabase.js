const fs = require('fs');
const path = require('path');
const JsonStore = require('../utils/JsonStore');

const DATA_FILE = path.join(__dirname, '../../data/program_settings.json');

// Las contraseñas Zoom NUNCA se almacenan en el JSON ni en el código.
// Se leen desde variables de entorno y solo están disponibles en backend.
// Si una variable no está definida, la credencial queda vacía y el endpoint
// que la consume debe degradar a "no disponible".
const ZOOM_PASSWORD_ENV = {
  vital: 'D28D_ZOOM_PASSWORD_VITAL',
  pancitas: 'D28D_ZOOM_PASSWORD_PANCITAS',
  // Para virtual_d28d hay 2 cuentas; cada una usa su propia env var.
  virtual_d28d_1: 'D28D_ZOOM_PASSWORD_VIRTUAL_1',
  virtual_d28d_2: 'D28D_ZOOM_PASSWORD_VIRTUAL_2',
};

const DEFAULT_ZOOM_EMAILS = {
  vital: 'D28dvital@gmail.com',
  pancitas: 'Pancitasfitbyd28d@gmail.com',
  virtual_d28d_1: 'D28dzoom1@gmail.com',
  virtual_d28d_2: 'd28dzoom2@gmail.com',
};

const INITIAL_DATA = [
  {
    id: 'vital',
    name: 'Vital D28D',
    zoom_email: process.env.D28D_ZOOM_EMAIL_VITAL || DEFAULT_ZOOM_EMAILS.vital,
    color: '#ec4899',
    active: true,
    active_cycle_id: 7,
  },
  {
    id: 'pancitas',
    name: 'Pancitas Fit',
    zoom_email: process.env.D28D_ZOOM_EMAIL_PANCITAS || DEFAULT_ZOOM_EMAILS.pancitas,
    color: '#8b5cf6',
    active: true,
    active_cycle_id: 7,
  },
  {
    id: 'virtual_d28d',
    name: 'Virtual D28D',
    zoom_accounts: [
      {
        id: 'virtual_d28d_1',
        label: 'Virtual · Cuenta 1',
        email: process.env.D28D_ZOOM_EMAIL_VIRTUAL_1 || DEFAULT_ZOOM_EMAILS.virtual_d28d_1,
      },
      {
        id: 'virtual_d28d_2',
        label: 'Virtual · Cuenta 2',
        email: process.env.D28D_ZOOM_EMAIL_VIRTUAL_2 || DEFAULT_ZOOM_EMAILS.virtual_d28d_2,
      },
    ],
    color: '#10b981',
    active: true,
    active_cycle_id: 7,
  },
];

const programStore = new JsonStore('program_settings.json', INITIAL_DATA);
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');

let programsCache = null;

class ProgramSettingsDatabase {
  constructor() {
    this.ensureFile();
    const current = programStore.getAll();
    if (!current || !Array.isArray(current) || current.length === 0) {
      programStore.setAll(INITIAL_DATA);
    }
  }

  ensureFile() {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2));
    }
  }

  // Devuelve los programas SIN contraseñas. Apto para enviar al frontend.
  getAll() {
    try {
      const programs = this._readRaw();
      return programs.map((p) => this._stripSecrets(p));
    } catch (error) {
      return [];
    }
  }

  getById(id) {
    return this.getAll().find((p) => p.id === id);
  }

  // Uso interno (servidor) cuando se necesita arrancar una sesión Zoom.
  // NUNCA retornar este resultado al cliente.
  getZoomCredentialsForProgram(programId, accountId = null) {
    const emailEnv = {
      vital: 'D28D_ZOOM_EMAIL_VITAL',
      pancitas: 'D28D_ZOOM_EMAIL_PANCITAS',
      virtual_d28d_1: 'D28D_ZOOM_EMAIL_VIRTUAL_1',
      virtual_d28d_2: 'D28D_ZOOM_EMAIL_VIRTUAL_2',
    };
    if (programId === 'vital' || programId === 'pancitas') {
      const program = this.getById(programId);
      return {
        email: process.env[emailEnv[programId]] || program?.zoom_email || '',
        password: process.env[ZOOM_PASSWORD_ENV[programId]] || '',
      };
    }
    if (programId === 'virtual_d28d') {
      const target = accountId || 'virtual_d28d_1';
      const program = this.getById(programId);
      const acc = Array.isArray(program?.zoom_accounts)
        ? program.zoom_accounts.find((a) => a.id === target)
        : null;
      return {
        email: process.env[emailEnv[target]] || acc?.email || '',
        password: process.env[ZOOM_PASSWORD_ENV[target]] || '',
      };
    }
    return { email: '', password: '' };
  }

  update(id, updates) {
    const programs = this._readRaw();
    const index = programs.findIndex((p) => p.id === id);
    if (index === -1) return null;
    // Defensa: no permitir nunca persistir contraseñas en el JSON.
    const safeUpdates = this._stripSecretFields(updates);
    programs[index] = { ...programs[index], ...safeUpdates };
    this._writeRaw(programs);
    return this._stripSecrets(programs[index]);
  }

  // Crea un nuevo programa. El `id` se deriva del `name` (slug) si no se
  // pasa. Nunca se persisten contraseñas: las credenciales Zoom viven
  // en variables de entorno y se inyectan solo cuando un endpoint
  // interno arranca una sesión.
  create(payload) {
    const programs = this._readRaw();
    const safe = this._stripSecretFields(payload || {});
    const baseId = safe.id || this._slugify(safe.name || '');
    if (!baseId) return { error: 'name (o id) es requerido' };
    if (programs.find((p) => p.id === baseId)) {
      return { error: `Ya existe un programa con id "${baseId}"` };
    }
    const program = {
      id: baseId,
      name: safe.name || baseId,
      color: safe.color || '#64748b',
      active: safe.active !== false,
      active_cycle_id: Number(safe.active_cycle_id) || 1,
      zoom_email: safe.zoom_email || '',
      ...(Array.isArray(safe.zoom_accounts) ? { zoom_accounts: safe.zoom_accounts } : {}),
    };
    programs.push(program);
    this._writeRaw(programs);
    return { data: this._stripSecrets(program) };
  }

  delete(id) {
    const programs = this._readRaw();
    const index = programs.findIndex((p) => p.id === id);
    if (index === -1) return { error: 'Programa no encontrado', status: 404 };
    const removed = programs.splice(index, 1)[0];
    this._writeRaw(programs);
    return { data: this._stripSecrets(removed) };
  }

  _slugify(s) {
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  }

  async hydrate() {
    if (!useRelationalStorage()) return;
    const rows = await getPrisma().programSetting.findMany();
    if (!rows.length) {
      for (const p of INITIAL_DATA) {
        await getPrisma().programSetting.create({
          data: {
            id: p.id,
            name: p.name,
            color: p.color,
            active: p.active !== false,
            activeCycleId: p.active_cycle_id || 1,
            zoomEmail: p.zoom_email || '',
            zoomAccounts: p.zoom_accounts || null,
          },
        });
      }
      programsCache = INITIAL_DATA;
    } else {
      programsCache = rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        active: r.active,
        active_cycle_id: r.activeCycleId,
        zoom_email: r.zoomEmail,
        zoom_accounts: r.zoomAccounts,
      }));
    }
  }

  _readRaw() {
    try {
      if (useRelationalStorage() && programsCache) return programsCache;
      let data = programStore.getAll();
      if (!data || !Array.isArray(data) || data.length === 0) {
        if (fs.existsSync(DATA_FILE)) {
          data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
          programStore.setAll(data);
        } else {
          data = INITIAL_DATA;
          programStore.setAll(data);
        }
      }
      return data;
    } catch (error) {
      return [];
    }
  }

  _writeRaw(programs) {
    programsCache = programs;
    if (useRelationalStorage()) {
      (async () => {
        for (const p of programs) {
          await getPrisma().programSetting.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            name: p.name,
            color: p.color || '#64748b',
            active: p.active !== false,
            activeCycleId: p.active_cycle_id || 1,
            zoomEmail: p.zoom_email,
            zoomAccounts: p.zoom_accounts,
          },
          update: {
            name: p.name,
            color: p.color,
            active: p.active !== false,
            activeCycleId: p.active_cycle_id || 1,
            zoomEmail: p.zoom_email,
            zoomAccounts: p.zoom_accounts,
          },
        });
        }
      })().catch((e) => console.error('[ProgramSettings]', e.message));
    } else {
      programStore.setAll(programs);
    }
  }

  _stripSecrets(program) {
    if (!program || typeof program !== 'object') return program;
    const { zoom_password: _zp, ...rest } = program;
    if (Array.isArray(rest.zoom_accounts)) {
      rest.zoom_accounts = rest.zoom_accounts.map((acc) => {
        const { password: _p, ...accRest } = acc;
        return accRest;
      });
    }
    return rest;
  }

  _stripSecretFields(updates) {
    if (!updates || typeof updates !== 'object') return updates;
    const { zoom_password: _zp, ...rest } = updates;
    if (Array.isArray(rest.zoom_accounts)) {
      rest.zoom_accounts = rest.zoom_accounts.map((acc) => {
        const { password: _p, ...accRest } = acc;
        return accRest;
      });
    }
    return rest;
  }
}

module.exports = new ProgramSettingsDatabase();
