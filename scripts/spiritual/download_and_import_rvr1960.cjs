#!/usr/bin/env node
/**
 * Descarga Reina-Valera 1960 (JSON público) e importa a PostgreSQL.
 * Uso: node scripts/spiritual/download_and_import_rvr1960.cjs
 *      npm run spiritual:import-bible-full
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const SOURCE_URL = process.env.SPIRITUAL_BIBLE_SOURCE_URL
  || 'https://raw.githubusercontent.com/dscottpi/bibles/master/RVR1960%20-%20Spanish.json';

const CACHE_DIR = path.join(__dirname, '../../backend/data/spiritual');
const CACHE_RAW = path.join(CACHE_DIR, 'rvr1960.source.json');
const CACHE_FLAT = path.join(CACHE_DIR, 'rvr1960.flat.json');

const BOOK_MAP = {
  'Génesis': { code: 'GEN', name: 'Génesis', testament: 'OT', orden: 1 },
  'Éxodo': { code: 'EXO', name: 'Éxodo', testament: 'OT', orden: 2 },
  'Levítico': { code: 'LEV', name: 'Levítico', testament: 'OT', orden: 3 },
  'Números': { code: 'NUM', name: 'Números', testament: 'OT', orden: 4 },
  'Deuteronomio': { code: 'DEU', name: 'Deuteronomio', testament: 'OT', orden: 5 },
  'Josué': { code: 'JOS', name: 'Josué', testament: 'OT', orden: 6 },
  'Jueces': { code: 'JDG', name: 'Jueces', testament: 'OT', orden: 7 },
  'Rut': { code: 'RUT', name: 'Rut', testament: 'OT', orden: 8 },
  '1 Samuel': { code: '1SA', name: '1 Samuel', testament: 'OT', orden: 9 },
  '2 Samuel': { code: '2SA', name: '2 Samuel', testament: 'OT', orden: 10 },
  '1 Reyes': { code: '1KI', name: '1 Reyes', testament: 'OT', orden: 11 },
  '2 Reyes': { code: '2KI', name: '2 Reyes', testament: 'OT', orden: 12 },
  '1 Crónicas': { code: '1CH', name: '1 Crónicas', testament: 'OT', orden: 13 },
  '2 Crónicas': { code: '2CH', name: '2 Crónicas', testament: 'OT', orden: 14 },
  'Esdras': { code: 'EZR', name: 'Esdras', testament: 'OT', orden: 15 },
  'Nehemías': { code: 'NEH', name: 'Nehemías', testament: 'OT', orden: 16 },
  'Ester': { code: 'EST', name: 'Ester', testament: 'OT', orden: 17 },
  'Job': { code: 'JOB', name: 'Job', testament: 'OT', orden: 18 },
  'Salmos': { code: 'PSA', name: 'Salmos', testament: 'OT', orden: 19 },
  'Proverbios': { code: 'PRO', name: 'Proverbios', testament: 'OT', orden: 20 },
  'Eclesiastés': { code: 'ECC', name: 'Eclesiastés', testament: 'OT', orden: 21 },
  'Cantares': { code: 'SNG', name: 'Cantares', testament: 'OT', orden: 22 },
  'Isaías': { code: 'ISA', name: 'Isaías', testament: 'OT', orden: 23 },
  'Jeremías': { code: 'JER', name: 'Jeremías', testament: 'OT', orden: 24 },
  'Lamentaciones': { code: 'LAM', name: 'Lamentaciones', testament: 'OT', orden: 25 },
  'Ezequiel': { code: 'EZK', name: 'Ezequiel', testament: 'OT', orden: 26 },
  'Daniel': { code: 'DAN', name: 'Daniel', testament: 'OT', orden: 27 },
  'Oseas': { code: 'HOS', name: 'Oseas', testament: 'OT', orden: 28 },
  'Joel': { code: 'JOL', name: 'Joel', testament: 'OT', orden: 29 },
  'Amós': { code: 'AMO', name: 'Amós', testament: 'OT', orden: 30 },
  'Abdías': { code: 'OBA', name: 'Abdías', testament: 'OT', orden: 31 },
  'Jonás': { code: 'JON', name: 'Jonás', testament: 'OT', orden: 32 },
  'Miqueas': { code: 'MIC', name: 'Miqueas', testament: 'OT', orden: 33 },
  'Nahúm': { code: 'NAH', name: 'Nahúm', testament: 'OT', orden: 34 },
  'Habacuc': { code: 'HAB', name: 'Habacuc', testament: 'OT', orden: 35 },
  'Sofonías': { code: 'ZEP', name: 'Sofonías', testament: 'OT', orden: 36 },
  'Hageo': { code: 'HAG', name: 'Hageo', testament: 'OT', orden: 37 },
  'Zacarías': { code: 'ZEC', name: 'Zacarías', testament: 'OT', orden: 38 },
  'Malaquías': { code: 'MAL', name: 'Malaquías', testament: 'OT', orden: 39 },
  'S. Mateo': { code: 'MAT', name: 'Mateo', testament: 'NT', orden: 40 },
  'S. Marcos': { code: 'MRK', name: 'Marcos', testament: 'NT', orden: 41 },
  'S. Lucas': { code: 'LUK', name: 'Lucas', testament: 'NT', orden: 42 },
  'S.Juan': { code: 'JHN', name: 'Juan', testament: 'NT', orden: 43 },
  'Hechos': { code: 'ACT', name: 'Hechos', testament: 'NT', orden: 44 },
  'Romanos': { code: 'ROM', name: 'Romanos', testament: 'NT', orden: 45 },
  '1 Corintios': { code: '1CO', name: '1 Corintios', testament: 'NT', orden: 46 },
  '2 Corintios': { code: '2CO', name: '2 Corintios', testament: 'NT', orden: 47 },
  'Gálatas': { code: 'GAL', name: 'Gálatas', testament: 'NT', orden: 48 },
  'Efesios': { code: 'EPH', name: 'Efesios', testament: 'NT', orden: 49 },
  'Filipenses': { code: 'PHP', name: 'Filipenses', testament: 'NT', orden: 50 },
  'Colosenses': { code: 'COL', name: 'Colosenses', testament: 'NT', orden: 51 },
  '1 Tesalonicenses': { code: '1TH', name: '1 Tesalonicenses', testament: 'NT', orden: 52 },
  '2 Tesalonicenses': { code: '2TH', name: '2 Tesalonicenses', testament: 'NT', orden: 53 },
  '1 Timoteo': { code: '1TI', name: '1 Timoteo', testament: 'NT', orden: 54 },
  '2 Timoteo': { code: '2TI', name: '2 Timoteo', testament: 'NT', orden: 55 },
  'Tito': { code: 'TIT', name: 'Tito', testament: 'NT', orden: 56 },
  'Filemón': { code: 'PHM', name: 'Filemón', testament: 'NT', orden: 57 },
  'Hebreos': { code: 'HEB', name: 'Hebreos', testament: 'NT', orden: 58 },
  'Santiago': { code: 'JAS', name: 'Santiago', testament: 'NT', orden: 59 },
  '1 Pedro': { code: '1PE', name: '1 Pedro', testament: 'NT', orden: 60 },
  '2 Pedro': { code: '2PE', name: '2 Pedro', testament: 'NT', orden: 61 },
  '1 Juan': { code: '1JN', name: '1 Juan', testament: 'NT', orden: 62 },
  '2 Juan': { code: '2JN', name: '2 Juan', testament: 'NT', orden: 63 },
  '3 Juan': { code: '3JN', name: '3 Juan', testament: 'NT', orden: 64 },
  'Judas': { code: 'JUD', name: 'Judas', testament: 'NT', orden: 65 },
  'Apocalipsis': { code: 'REV', name: 'Apocalipsis', testament: 'NT', orden: 66 },
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} al descargar biblia`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

function convertToFlat(raw) {
  const rows = [];
  for (const [bookName, chapters] of Object.entries(raw)) {
    if (bookName === 'lang' || typeof chapters !== 'object') continue;
    const meta = BOOK_MAP[bookName];
    if (!meta) {
      console.warn('[bible] Libro sin mapeo, omitido:', bookName);
      continue;
    }
    for (const [ch, verses] of Object.entries(chapters)) {
      const chapterNum = Number(ch);
      if (!chapterNum || typeof verses !== 'object') continue;
      for (const [vs, text] of Object.entries(verses)) {
        const verseNum = Number(vs);
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!verseNum || !clean) continue;
        rows.push({
          book: meta.code,
          book_name: meta.name,
          testament: meta.testament,
          orden: meta.orden,
          chapter: chapterNum,
          verse: verseNum,
          text: clean,
        });
      }
    }
  }
  return rows;
}

async function main() {
  const force = process.argv.includes('--force');
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  if (!fs.existsSync(CACHE_RAW) || force) {
    console.log('[bible] Descargando RVR1960…');
    await download(SOURCE_URL, CACHE_RAW);
    console.log('[bible] Guardado:', CACHE_RAW);
  } else {
    console.log('[bible] Usando caché local:', CACHE_RAW);
  }

  const raw = JSON.parse(fs.readFileSync(CACHE_RAW, 'utf8'));
  const flat = convertToFlat(raw);
  fs.writeFileSync(CACHE_FLAT, JSON.stringify(flat));
  console.log('[bible] Convertido:', flat.length, 'versículos →', CACHE_FLAT);

  const { importBibleFromJson } = require('../../backend/src/services/spiritual/bibleImportService');
  const out = await importBibleFromJson({
    filePath: CACHE_FLAT,
    versionCode: 'RVR1960',
    versionName: 'Reina-Valera 1960',
  });
  console.log('[bible] Importado en PostgreSQL:', out);

  const { getPrisma } = require('../../backend/src/lib/prisma');
  const prisma = getPrisma();
  const books = await prisma.spiritualBibleBook.count({
    where: { version: { code: 'RVR1960' } },
  });
  const verses = await prisma.spiritualBibleVerse.count();
  console.log('[bible] Verificación DB — libros:', books, 'versículos totales:', verses);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[bible] ERROR:', e.message);
  process.exit(1);
});
