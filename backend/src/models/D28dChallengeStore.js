const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');

const store = new JsonStore('d28d_challenges.json', {
  challenges: [],
  entries: [],
  evidences: [],
  podiums: [],
  nextChallengeId: 1,
  nextEntryId: 1,
  nextEvidenceId: 1,
});

function mapChallenge(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    objetivo: row.objetivo || null,
    premio: row.premio || null,
    imagen_url: row.imagenUrl || row.imagen_url || null,
    program_id: row.programId || row.program_id || null,
    cycle_id: row.cycleId ?? row.cycle_id ?? null,
    fecha_inicio: row.fechaInicio || row.fecha_inicio,
    fecha_fin: row.fechaFin || row.fecha_fin,
    estado: row.estado || 'draft',
    reglas: row.reglas || null,
    cantidad_ganadores: row.cantidadGanadores ?? row.cantidad_ganadores ?? 3,
    visible: row.visible !== false,
    activo: row.activo !== false,
    creado_por_id: row.creadoPorId ?? row.creado_por_id,
    publicado_at: row.publicadoAt || row.publicado_at || null,
    created_at: row.createdAt || row.created_at,
    updated_at: row.updatedAt || row.updated_at,
  };
}

class D28dChallengeStore {
  constructor() {
    this._load();
  }

  _load() {
    const s = store.getAll();
    this.challenges = s.challenges || [];
    this.entries = s.entries || [];
    this.evidences = s.evidences || [];
    this.podiums = s.podiums || [];
    this.nextChallengeId = s.nextChallengeId || 1;
    this.nextEntryId = s.nextEntryId || 1;
    this.nextEvidenceId = s.nextEvidenceId || 1;
  }

  _persist() {
    if (useRelationalStorage()) return;
    store.setAll({
      challenges: this.challenges,
      entries: this.entries,
      evidences: this.evidences,
      podiums: this.podiums,
      nextChallengeId: this.nextChallengeId,
      nextEntryId: this.nextEntryId,
      nextEvidenceId: this.nextEvidenceId,
    });
  }

  async hydrate() {
    if (!useRelationalStorage()) return;
    try {
      const prisma = getPrisma();
      if (!prisma.d28dChallenge) return;
      const rows = await prisma.d28dChallenge.findMany({ orderBy: { id: 'asc' } });
    if (!rows.length && this.challenges.length) {
      for (const c of this.challenges) {
        await this._upsertPrismaChallenge(c);
      }
      return;
    }
    this.challenges = rows.map(mapChallenge);
    const entries = await prisma.d28dChallengeEntry.findMany();
    this.entries = entries.map((e) => ({
      id: e.id,
      challenge_id: e.challengeId,
      user_id: e.userId,
      estado: e.estado,
      puntuacion: e.puntuacion != null ? Number(e.puntuacion) : null,
      comentario: e.comentario,
      enrolled_at: e.enrolledAt,
      withdrawn_at: e.withdrawnAt,
      submitted_at: e.submittedAt,
    }));
    const evs = await prisma.d28dChallengeEvidence.findMany();
    this.evidences = evs.map((e) => ({
      id: e.id,
      entry_id: e.entryId,
      tipo: e.tipo,
      url: e.url,
      contenido: e.contenido,
      mime: e.mime,
      size_bytes: e.sizeBytes,
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));
    const pods = await prisma.d28dChallengePodium.findMany();
    this.podiums = pods.map((p) => ({
      id: p.id,
      challenge_id: p.challengeId,
      lugar: p.lugar,
      entry_id: p.entryId,
    }));
    this.nextChallengeId = Math.max(0, ...this.challenges.map((c) => c.id)) + 1;
    this.nextEntryId = Math.max(0, ...this.entries.map((e) => e.id)) + 1;
    this.nextEvidenceId = Math.max(0, ...this.evidences.map((e) => e.id)) + 1;
    } catch (e) {
      console.warn('[D28dChallengeStore] hydrate:', e.message);
    }
  }

  async _upsertPrismaChallenge(c) {
    const prisma = getPrisma();
    await prisma.d28dChallenge.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        objetivo: c.objetivo,
        premio: c.premio,
        imagenUrl: c.imagen_url,
        programId: c.program_id,
        cycleId: c.cycle_id,
        fechaInicio: new Date(c.fecha_inicio),
        fechaFin: new Date(c.fecha_fin),
        estado: c.estado,
        reglas: c.reglas,
        cantidadGanadores: c.cantidad_ganadores,
        visible: c.visible,
        activo: c.activo,
        creadoPorId: c.creado_por_id,
        publicadoAt: c.publicado_at ? new Date(c.publicado_at) : null,
      },
      update: {
        nombre: c.nombre,
        descripcion: c.descripcion,
        objetivo: c.objetivo,
        premio: c.premio,
        imagenUrl: c.imagen_url,
        programId: c.program_id,
        cycleId: c.cycle_id,
        fechaInicio: new Date(c.fecha_inicio),
        fechaFin: new Date(c.fecha_fin),
        estado: c.estado,
        reglas: c.reglas,
        cantidadGanadores: c.cantidad_ganadores,
        visible: c.visible,
        activo: c.activo,
        publicadoAt: c.publicado_at ? new Date(c.publicado_at) : null,
      },
    });
  }

  list({ admin = false, programId = null, userId = null } = {}) {
    let list = [...this.challenges];
    if (!admin) {
      list = list.filter((c) => c.activo && c.visible && ['active', 'closed', 'published'].includes(c.estado));
    }
    if (programId) list = list.filter((c) => String(c.program_id) === String(programId));
    return list.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
  }

  getById(id) {
    return this.challenges.find((c) => Number(c.id) === Number(id)) || null;
  }

  async create(data) {
    const now = new Date().toISOString();
    const row = {
      id: this.nextChallengeId++,
      ...data,
      estado: data.estado || 'draft',
      visible: data.visible !== false,
      activo: data.activo !== false,
      cantidad_ganadores: data.cantidad_ganadores ?? 3,
      created_at: now,
      updated_at: now,
    };
    this.challenges.push(row);
    this._persist();
    if (useRelationalStorage()) {
      try {
        if (getPrisma().d28dChallenge) await this._upsertPrismaChallenge(row);
      } catch (e) {
        console.warn('[D28dChallengeStore] create prisma:', e.message);
      }
    }
    return row;
  }

  async update(id, patch) {
    const idx = this.challenges.findIndex((c) => Number(c.id) === Number(id));
    if (idx === -1) return null;
    this.challenges[idx] = { ...this.challenges[idx], ...patch, updated_at: new Date().toISOString() };
    this._persist();
    if (useRelationalStorage()) await this._upsertPrismaChallenge(this.challenges[idx]);
    return this.challenges[idx];
  }

  async duplicate(id, userId) {
    const src = this.getById(id);
    if (!src) return null;
    return this.create({
      nombre: `${src.nombre} (copia)`,
      descripcion: src.descripcion,
      objetivo: src.objetivo,
      premio: src.premio,
      imagen_url: src.imagen_url,
      program_id: src.program_id,
      cycle_id: src.cycle_id,
      fecha_inicio: src.fecha_inicio,
      fecha_fin: src.fecha_fin,
      estado: 'draft',
      reglas: src.reglas,
      cantidad_ganadores: src.cantidad_ganadores,
      visible: false,
      activo: true,
      creado_por_id: userId,
    });
  }

  getEntry(challengeId, userId) {
    return this.entries.find(
      (e) => Number(e.challenge_id) === Number(challengeId) && Number(e.user_id) === Number(userId),
    ) || null;
  }

  listEntries(challengeId) {
    return this.entries.filter((e) => Number(e.challenge_id) === Number(challengeId));
  }

  async enroll(challengeId, userId) {
    const existing = this.getEntry(challengeId, userId);
    if (existing && existing.estado !== 'withdrawn') return { error: 'Ya inscrito', status: 409 };
    if (existing?.estado === 'withdrawn') {
      existing.estado = 'registered';
      existing.withdrawn_at = null;
      existing.enrolled_at = new Date().toISOString();
      this._persist();
      return existing;
    }
    const row = {
      id: this.nextEntryId++,
      challenge_id: Number(challengeId),
      user_id: Number(userId),
      estado: 'registered',
      puntuacion: null,
      comentario: null,
      enrolled_at: new Date().toISOString(),
      withdrawn_at: null,
      submitted_at: null,
    };
    this.entries.push(row);
    this._persist();
    return row;
  }

  async withdraw(challengeId, userId) {
    const entry = this.getEntry(challengeId, userId);
    if (!entry) return { error: 'No inscrito', status: 404 };
    entry.estado = 'withdrawn';
    entry.withdrawn_at = new Date().toISOString();
    this._persist();
    return entry;
  }

  async addEvidence(entryId, data) {
    const row = {
      id: this.nextEvidenceId++,
      entry_id: Number(entryId),
      tipo: data.tipo,
      url: data.url || null,
      contenido: data.contenido || null,
      mime: data.mime || null,
      size_bytes: data.size_bytes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.evidences.push(row);
    const entry = this.entries.find((e) => Number(e.id) === Number(entryId));
    if (entry && entry.estado === 'registered') {
      entry.estado = 'submitted';
      entry.submitted_at = new Date().toISOString();
    }
    this._persist();
    return row;
  }

  updateEvidence(evidenceId, userId, patch) {
    const ev = this.evidences.find((e) => Number(e.id) === Number(evidenceId));
    if (!ev) return null;
    const entry = this.entries.find((e) => Number(e.id) === Number(ev.entry_id));
    if (!entry || Number(entry.user_id) !== Number(userId)) return { error: 'Sin permiso', status: 403 };
    Object.assign(ev, patch, { updated_at: new Date().toISOString() });
    this._persist();
    return ev;
  }

  listEvidences(entryId) {
    return this.evidences.filter((e) => Number(e.entry_id) === Number(entryId));
  }

  scoreEntry(entryId, puntuacion, comentario) {
    const entry = this.entries.find((e) => Number(e.id) === Number(entryId));
    if (!entry) return null;
    entry.puntuacion = puntuacion;
    entry.comentario = comentario || entry.comentario;
    entry.estado = 'reviewed';
    this._persist();
    return entry;
  }

  setPodium(challengeId, places) {
    this.podiums = this.podiums.filter((p) => Number(p.challenge_id) !== Number(challengeId));
    for (const [lugar, entryId] of Object.entries(places)) {
      if (!entryId) continue;
      this.podiums.push({
        id: this.podiums.length + 1,
        challenge_id: Number(challengeId),
        lugar: Number(lugar),
        entry_id: Number(entryId),
      });
    }
    this._persist();
    return this.podiums.filter((p) => Number(p.challenge_id) === Number(challengeId));
  }

  getRanking(challengeId) {
    return this.listEntries(challengeId)
      .filter((e) => e.puntuacion != null && e.estado !== 'withdrawn')
      .sort((a, b) => Number(b.puntuacion) - Number(a.puntuacion));
  }

  getPodium(challengeId) {
    return this.podiums
      .filter((p) => Number(p.challenge_id) === Number(challengeId))
      .sort((a, b) => a.lugar - b.lugar);
  }
}

module.exports = new D28dChallengeStore();
