const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function cleanTextLocal(value = '') {
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(name = '') {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function resolveExcelPath(customPath) {
  if (customPath && fs.existsSync(customPath)) return path.resolve(customPath);

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    path.join(home, 'Downloads', 'SOLO BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx'),
    path.join(home, 'Descargas', 'SOLO BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx'),
    path.join(__dirname, '../../../docs/BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx'),
    path.join(__dirname, '../../../docs/SOLO BIBLIOTECA PLANTILLA HOMBRES NICO.xlsx'),
  ];

  const found = candidates
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ p: path.resolve(p), stat: fs.statSync(p) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  return found[0]?.p || null;
}

function cellHyperlink(ws, r, c) {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell?.l?.Target || cell?.l?.target || '';
}

function rowHyperlink(ws, r, colCount = 26) {
  let url = '';
  for (let c = 0; c < colCount; c += 1) {
    url = url || cellHyperlink(ws, r, c);
  }
  return url;
}

/** Fila de bloque principal (EMPUJES PIERNA, GLÚTEO, etc.) sin ejercicio en col C */
function isMajorSectionRow(b, c) {
  if (!b || c) return false;
  if (/^CATEGOR/i.test(b)) return false;
  const upper = b === b.toUpperCase();
  const looksCategory = /VARIANTE|ANALÍTICO|AVANZADAS|CALENTAMIENTO/i.test(b);
  return upper && !looksCategory && b.length > 3;
}

function isHeaderRow(b, c) {
  return /^CATEGOR/i.test(b) && /^EJERCICIO/i.test(c);
}

function parseGalleryWorkbook(filePath) {
  const stat = fs.statSync(filePath);
  const wb = XLSX.readFile(filePath, { cellStyles: true });
  const exercises = [];
  const categories = new Set();
  const sections = new Set();
  const errors = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let currentSection = sheetName;
    let currentCategory = '';

    for (let r = 0; r < rows.length; r += 1) {
      const row = rows[r];
      const cells = row.map((x) => cleanTextLocal(x));
      const b = cells[1] || '';
      const c = cells[2] || '';
      const notes = cells[3] || cells[4] || '';

      if (isHeaderRow(b, c)) continue;

      if (isMajorSectionRow(b, c)) {
        currentSection = b;
        sections.add(b);
        continue;
      }

      if (!b && !c) continue;

      if (!c || c === 'EJERCICIO') continue;

      if (b && !/^CATEGOR/i.test(b)) currentCategory = b;

      const url = rowHyperlink(ws, r);
      const muscleGroup = currentCategory
        ? (currentSection && currentSection !== currentCategory
          ? `${currentSection} · ${currentCategory}`
          : currentCategory)
        : currentSection;

      if (muscleGroup) categories.add(muscleGroup);

      exercises.push({
        sheet: sheetName,
        row: r + 1,
        exercise_name: c,
        muscle_group: muscleGroup,
        video_url: url,
        notes,
        section: currentSection,
        category: currentCategory,
      });
    }
  }

  const byKey = new Map();
  for (const ex of exercises) {
    const key = normalizeKey(ex.exercise_name);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, ex);
      continue;
    }
    const pick = (a, b) => {
      if (a.video_url && !b.video_url) return a;
      if (b.video_url && !a.video_url) return b;
      if (a.muscle_group && !b.muscle_group) return a;
      return b;
    };
    const chosen = pick(prev, ex);
    const other = chosen === prev ? ex : prev;
    if (other.row !== chosen.row) {
      errors.push({
        type: 'duplicate_merged',
        exercise_name: ex.exercise_name,
        kept_row: chosen.row,
        dropped_row: other.row,
      });
    }
    byKey.set(key, {
      ...chosen,
      video_url: chosen.video_url || other.video_url,
      notes: chosen.notes || other.notes,
      muscle_group: chosen.muscle_group || other.muscle_group,
    });
  }

  const deduped = [...byKey.values()].sort((a, b) =>
    a.exercise_name.localeCompare(b.exercise_name, 'es'),
  );

  return {
    filePath,
    fileStat: { size: stat.size, mtime: stat.mtime.toISOString() },
    sheetNames: wb.SheetNames,
    exercises: deduped,
    categories: [...categories].sort(),
    sections: [...sections].sort(),
    errors,
    stats: {
      raw_rows: exercises.length,
      unique: deduped.length,
      with_url: deduped.filter((e) => e.video_url).length,
      without_url: deduped.filter((e) => !e.video_url).length,
    },
  };
}

module.exports = {
  resolveExcelPath,
  parseGalleryWorkbook,
  normalizeKey,
};
