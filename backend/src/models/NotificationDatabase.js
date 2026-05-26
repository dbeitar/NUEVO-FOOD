const JsonStore = require('../utils/JsonStore');

const store = new JsonStore('notifications.json', []);
let rows = store.getAll();
if (!Array.isArray(rows)) rows = [];
let nextId = rows.length > 0 ? Math.max(...rows.map((r) => r.id || 0)) + 1 : 1;

const NotificationDatabase = {
  getByUserId(userId, { unreadOnly = false } = {}) {
    let list = rows.filter((n) => Number(n.user_id) === Number(userId));
    if (unreadOnly) list = list.filter((n) => !n.leida);
    return list.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  },

  create({ user_id, tipo, mensaje, meta = {} }) {
    const row = {
      id: nextId++,
      user_id: Number(user_id),
      tipo: tipo || 'info',
      mensaje: String(mensaje || ''),
      meta,
      leida: false,
      creado_en: new Date().toISOString(),
    };
    rows.push(row);
    store.setAll(rows);
    return row;
  },

  markRead(id, userId) {
    const item = rows.find((n) => n.id === Number(id) && Number(n.user_id) === Number(userId));
    if (!item) return null;
    item.leida = true;
    store.setAll(rows);
    return item;
  },
};

module.exports = NotificationDatabase;
