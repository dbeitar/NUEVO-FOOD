const JsonStore = require('../src/utils/JsonStore');
const db = require('../src/config/dbClient');

async function cleanupJson() {
  const store = new JsonStore('foods.json', []);
  const original = store.getAll();
  const backupPath = store.backup('foods');
  const seen = new Set();
  const cleaned = [];
  let removedNoCode = 0;
  let removedDup = 0;
  for (const item of original) {
    const code = (item.barcode || item.codigo_barras || '').toString().trim();
    if (!code) {
      removedNoCode++;
      continue;
    }
    if (seen.has(code)) {
      removedDup++;
      continue;
    }
    seen.add(code);
    cleaned.push({ ...item, barcode: code });
  }
  store.setAll(cleaned);
  return { backupPath, removedNoCode, removedDup, kept: cleaned.length, total: original.length };
}

async function cleanupDB() {
  try {
    // Eliminar sin código
    await db.query(`DELETE FROM food_items WHERE codigo_barras IS NULL OR TRIM(codigo_barras) = ''`);
    // Eliminar duplicados por codigo_barras (conserva el menor id)
    await db.query(`
      WITH d AS (
        SELECT id, codigo_barras,
               ROW_NUMBER() OVER (PARTITION BY codigo_barras ORDER BY id) AS rn
        FROM food_items
        WHERE codigo_barras IS NOT NULL AND TRIM(codigo_barras) <> ''
      )
      DELETE FROM food_items f
      USING d
      WHERE f.id = d.id AND d.rn > 1
    `);
    return { dbCleaned: true };
  } catch (e) {
    return { dbCleaned: false, error: e && e.message };
  }
}

(async () => {
  const jsonRes = await cleanupJson();
  const dbRes = await cleanupDB();
  console.log(JSON.stringify({ json: jsonRes, db: dbRes }, null, 2));
})(); 
