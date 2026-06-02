#!/usr/bin/env node
/**
 * Limpia enlaces Zoom inválidos (seed demo: virtual-d28d-1, d28d-demo, etc.)
 * en live_classes (JSON o PostgreSQL).
 *
 * Uso: node scripts/d28d/fix_invalid_zoom_links.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const INVALID_PATTERN = /zoom\.us\/j\/(?!(\d{9,11})(?:\?|#|$))/i;

function isInvalidZoomLink(url) {
  const s = String(url || '').trim();
  if (!s) return false;
  if (!s.includes('zoom.us/j/')) return false;
  return INVALID_PATTERN.test(s) || !/^https:\/\/([\w-]+\.)?zoom\.us\/j\/\d{9,11}/i.test(s);
}

async function main() {
  const { useRelationalStorage } = require('../../backend/src/utils/storageMode');
  const { getPrisma } = require('../../backend/src/lib/prisma');
  let fixed = 0;

  if (useRelationalStorage()) {
    const prisma = getPrisma();
    const rows = await prisma.liveClass.findMany({ select: { id: true, zoomLink: true } });
    for (const row of rows) {
      if (!isInvalidZoomLink(row.zoomLink)) continue;
      await prisma.liveClass.update({
        where: { id: row.id },
        data: { zoomLink: '' },
      });
      console.log(`[PG] id=${row.id} zoom limpiado: ${row.zoomLink}`);
      fixed += 1;
    }
  } else {
    const fs = require('fs');
    const dataFile = path.join(__dirname, '../../backend/data/live_classes.json');
    if (!fs.existsSync(dataFile)) {
      console.log('Sin live_classes.json');
      return;
    }
    const rows = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    let changed = false;
    for (const row of rows) {
      if (!isInvalidZoomLink(row.zoom_link)) continue;
      console.log(`[JSON] id=${row.id} zoom limpiado: ${row.zoom_link}`);
      row.zoom_link = '';
      changed = true;
      fixed += 1;
    }
    if (changed) fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2));
  }

  console.log(`Listo. ${fixed} clase(s) con enlace inválido corregida(s). Regenera Zoom desde Admin → Clases en vivo.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
