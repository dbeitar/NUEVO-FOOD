const fs = require('fs');
const path = require('path');
const { getPrisma } = require('../../lib/prisma');

const BOOK_ORDER = [
  { code: 'GEN', name: 'Génesis', testament: 'OT', orden: 1 },
  { code: 'EXO', name: 'Éxodo', testament: 'OT', orden: 2 },
  { code: 'MAT', name: 'Mateo', testament: 'NT', orden: 40 },
  { code: 'MRK', name: 'Marcos', testament: 'NT', orden: 41 },
  { code: 'LUK', name: 'Lucas', testament: 'NT', orden: 42 },
  { code: 'JHN', name: 'Juan', testament: 'NT', orden: 43 },
];

async function importBibleFromJson({ filePath, versionCode = 'RVR1960', versionName = 'Reina-Valera 1960' }) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`Archivo no encontrado: ${abs}`);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.verses || raw.data || [];
  if (!rows.length) throw new Error('JSON vacío o formato inválido');

  const prisma = getPrisma();
  let version = await prisma.spiritualBibleVersion.findUnique({ where: { code: versionCode } });
  if (!version) {
    version = await prisma.spiritualBibleVersion.create({
      data: { code: versionCode, name: versionName, language: 'es', active: true },
    });
  }

  const bookMap = new Map();
  for (const meta of BOOK_ORDER) {
    let book = await prisma.spiritualBibleBook.findFirst({
      where: { versionId: version.id, code: meta.code },
    });
    if (!book) {
      book = await prisma.spiritualBibleBook.create({
        data: { versionId: version.id, ...meta },
      });
    }
    bookMap.set(meta.code, book);
  }

  let imported = 0;
  for (const row of rows) {
    const bookCode = String(row.book || row.book_code || row.bookCode || '').toUpperCase();
    const chapterNum = Number(row.chapter || row.chapter_number);
    const verseNum = Number(row.verse || row.verse_number);
    const text = String(row.text || '').trim();
    if (!bookCode || !chapterNum || !verseNum || !text) continue;

    let book = bookMap.get(bookCode);
    if (!book) {
      book = await prisma.spiritualBibleBook.findFirst({
        where: { versionId: version.id, code: bookCode },
      });
      if (!book) {
        book = await prisma.spiritualBibleBook.create({
          data: {
            versionId: version.id,
            code: bookCode,
            name: row.book_name || bookCode,
            testament: row.testament || 'OT',
            orden: bookMap.size + 1,
          },
        });
      }
      bookMap.set(bookCode, book);
    }

    let chapter = await prisma.spiritualBibleChapter.findFirst({
      where: { bookId: book.id, chapterNumber: chapterNum },
    });
    if (!chapter) {
      chapter = await prisma.spiritualBibleChapter.create({
        data: { bookId: book.id, chapterNumber: chapterNum },
      });
    }

    await prisma.spiritualBibleVerse.upsert({
      where: { chapterId_verseNumber: { chapterId: chapter.id, verseNumber: verseNum } },
      create: { chapterId: chapter.id, verseNumber: verseNum, text },
      update: { text },
    });
    imported += 1;
  }

  await prisma.spiritualBibleVersion.update({
    where: { id: version.id },
    data: {
      importedAt: new Date(),
      sourceMeta: { file: path.basename(abs), rows: imported },
    },
  });

  return { versionId: version.id, code: versionCode, imported };
}

module.exports = { importBibleFromJson };
