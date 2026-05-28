const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');
const JsonStore = require('../utils/JsonStore');

const auditStore = new JsonStore('platform_audit_events.json', []);

async function log(userId, modulo, action, entity = null, entityId = null, metadata = null) {
  const row = {
    id: auditStore.getAll()?.length ? Math.max(...auditStore.getAll().map((r) => r.id || 0)) + 1 : 1,
    user_id: userId || null,
    modulo,
    action,
    entity,
    entity_id: entityId != null ? String(entityId) : null,
    metadata: metadata || null,
    created_at: new Date().toISOString(),
  };
  const all = auditStore.getAll() || [];
  all.push(row);
  auditStore.setAll(all);
  if (useRelationalStorage()) {
    try {
      await getPrisma().platformAuditEvent.create({
        data: {
          userId: userId || null,
          modulo,
          action,
          entity,
          entityId: entityId != null ? String(entityId) : null,
          metadata: metadata || undefined,
        },
      });
    } catch (e) {
      console.warn('[platformAudit]', e.message);
    }
  }
  return row;
}

async function list({ modulo = null, limit = 100 } = {}) {
  if (useRelationalStorage()) {
    try {
      const rows = await getPrisma().platformAuditEvent.findMany({
        where: modulo ? { modulo } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((r) => ({
        id: r.id,
        user_id: r.userId,
        modulo: r.modulo,
        action: r.action,
        entity: r.entity,
        entity_id: r.entityId,
        metadata: r.metadata,
        created_at: r.createdAt,
      }));
    } catch {
      /* fallback json */
    }
  }
  let list = auditStore.getAll() || [];
  if (modulo) list = list.filter((r) => r.modulo === modulo);
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

module.exports = { log, list };
