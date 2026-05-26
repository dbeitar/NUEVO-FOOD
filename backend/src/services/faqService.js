const JsonStore = require('../utils/JsonStore');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');
const platformAudit = require('./platformAuditService');

const catStore = new JsonStore('faq_categories.json', []);
const itemStore = new JsonStore('faq_items.json', []);

const DEFAULT_FAQ = [
  { modulo: 'd28d', cat: 'Clases', pregunta: '¿Cómo me uno a una clase en vivo?', respuesta: 'Entra a D28D → Clases en vivo y selecciona la sesión programada.', tags: ['clases', 'live'] },
  { modulo: 'd28d', cat: 'Retos', pregunta: '¿Cómo participo en un reto?', respuesta: 'Ve a D28D → Retos, elige un reto activo, inscríbete y sube tu evidencia.', tags: ['retos'] },
  { modulo: 'training', cat: 'Rutinas', pregunta: '¿Dónde veo mi rutina?', respuesta: 'En el módulo Training → Mi plan encontrarás las rutinas asignadas por tu coach.', tags: ['rutinas'] },
  { modulo: 'platform', cat: 'Pagos', pregunta: '¿Cómo renuevo mi plan?', respuesta: 'En Mi Cuenta puedes ver tus servicios activos y contactar soporte para renovar.', tags: ['pagos', 'licencias'] },
  { modulo: 'platform', cat: 'Soporte', pregunta: '¿Cómo contacto soporte?', respuesta: 'Usa el botón WhatsApp en Mi Cuenta o en tu servicio activo.', tags: ['whatsapp', 'soporte'] },
];

let categories = [];
let items = [];
let nextCatId = 1;
let nextItemId = 1;

function load() {
  categories = catStore.getAll() || [];
  items = itemStore.getAll() || [];
  nextCatId = categories.length ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
  nextItemId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}
load();

function persist() {
  catStore.setAll(categories);
  itemStore.setAll(items);
}

function seedIfEmpty() {
  if (items.length) return;
  for (const row of DEFAULT_FAQ) {
    let cat = categories.find((c) => c.modulo === row.modulo && c.nombre === row.cat);
    if (!cat) {
      cat = { id: nextCatId++, modulo: row.modulo, nombre: row.cat, orden: categories.length, activo: true };
      categories.push(cat);
    }
    items.push({
      id: nextItemId++,
      category_id: cat.id,
      pregunta: row.pregunta,
      respuesta: row.respuesta,
      tags: row.tags,
      orden: 0,
      activo: true,
      util_count: 0,
    });
  }
  persist();
}
seedIfEmpty();

function listCategories(modulo) {
  return categories.filter((c) => c.modulo === modulo && c.activo).sort((a, b) => a.orden - b.orden);
}

function listItems({ modulo, categoryId = null, q = null, activoOnly = true } = {}) {
  const catIds = categories.filter((c) => c.modulo === modulo && (!activoOnly || c.activo)).map((c) => c.id);
  let list = items.filter((i) => catIds.includes(i.category_id) && (!activoOnly || i.activo));
  if (categoryId) list = list.filter((i) => Number(i.category_id) === Number(categoryId));
  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(
      (i) => i.pregunta.toLowerCase().includes(term)
        || i.respuesta.toLowerCase().includes(term)
        || (i.tags || []).some((t) => t.includes(term)),
    );
  }
  return list.sort((a, b) => a.orden - b.orden);
}

function scoreItem(item, query) {
  const term = String(query).toLowerCase();
  let score = 0;
  if (item.pregunta.toLowerCase().includes(term)) score += 3;
  if (item.respuesta.toLowerCase().includes(term)) score += 2;
  for (const t of item.tags || []) {
    if (term.includes(t) || t.includes(term)) score += 1;
  }
  return score;
}

function search(modulo, query) {
  const list = listItems({ modulo, q: query });
  return list
    .map((i) => ({ ...i, score: scoreItem(i, query) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function createCategory(data) {
  const row = { id: nextCatId++, ...data, activo: data.activo !== false, orden: data.orden || 0 };
  categories.push(row);
  persist();
  return row;
}

function createItem(data) {
  const row = {
    id: nextItemId++,
    category_id: data.category_id,
    pregunta: data.pregunta,
    respuesta: data.respuesta,
    tags: data.tags || [],
    orden: data.orden || 0,
    activo: data.activo !== false,
    util_count: 0,
  };
  items.push(row);
  persist();
  return row;
}

function updateItem(id, patch) {
  const idx = items.findIndex((i) => Number(i.id) === Number(id));
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  persist();
  return items[idx];
}

function deleteItem(id) {
  const before = items.length;
  items = items.filter((i) => Number(i.id) !== Number(id));
  persist();
  return items.length < before;
}

function rateUseful(id) {
  const item = items.find((i) => Number(i.id) === Number(id));
  if (!item) return null;
  item.util_count = (item.util_count || 0) + 1;
  persist();
  return item;
}

module.exports = {
  listCategories,
  listItems,
  search,
  createCategory,
  createItem,
  updateItem,
  deleteItem,
  rateUseful,
  seedIfEmpty,
};
