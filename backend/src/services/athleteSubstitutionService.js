/**
 * Sustituciones gratuitas (sin APIs externas) para el usuario final.
 * Usa la galería del entrenador asignado (trainer_id).
 */
const { classifyExercise } = require('./coachAiTrainingService');

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

const CAUSE_HINTS = [
  { re: /hombro|manguito|deltoide|press|empuje|pecho|apertura/i, prefer: ['pull', 'legs'], avoid: ['push', 'shoulders'], note: 'Menos estrés de hombro; prioriza variantes más seguras.' },
  { re: /rodilla|menisco|cuadricep|sentadilla|prensa|zancada/i, prefer: ['pull', 'push'], avoid: ['legs'], note: 'Reduce carga en rodilla; busca patrones con menor shear.' },
  { re: /lumbar|espalda baja|columna|peso muerto|bisagra/i, prefer: ['push', 'core'], avoid: ['legs'], note: 'Protege zona lumbar; evita bisagra pesada ese día.' },
  { re: /codo|bicep|tricep|curl|copa/i, prefer: ['legs', 'push'], avoid: ['arms'], note: 'Descansa flexores/extensores de codo.' },
  { re: /equipo|maquina|ocupad|smith|polea/i, prefer: [], avoid: [], note: 'Busca variante con implemento distinto (mancuerna, polea, máquina).' },
  { re: /fatiga|cansancio|sueño|energia/i, prefer: [], avoid: [], note: 'Misma zona muscular con menor demanda técnica o más estable.' },
  { re: /tiempo|rapido|prisa/i, prefer: [], avoid: [], note: 'Ejercicio más directo, menos montaje.' },
];

function parseCause(cause = '') {
  const text = normalize(cause);
  const hints = CAUSE_HINTS.filter((h) => h.re.test(text));
  return { text, hints };
}

function tokenOverlap(a, b) {
  const ta = new Set(normalize(a).split(' ').filter((w) => w.length > 2));
  const tb = new Set(normalize(b).split(' ').filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.max(ta.size, tb.size);
}

function scoreCandidate(original, candidate, hints) {
  if (normalize(original.name) === normalize(candidate.name)) return -999;

  let score = 0;
  const sharedTags = original.tags.filter((t) => candidate.tags.includes(t));
  score += sharedTags.length * 8;

  if (original.tags.includes('push') && candidate.tags.includes('push')) score += 4;
  if (original.tags.includes('pull') && candidate.tags.includes('pull')) score += 4;
  if (original.tags.includes('legs') && candidate.tags.includes('legs')) score += 4;

  score += tokenOverlap(original.name, candidate.name) * 6;
  if (original.muscle_group && candidate.muscle_group) {
    score += tokenOverlap(original.muscle_group, candidate.muscle_group) * 4;
  }

  if (candidate.youtube_url) score += 3;

  for (const h of hints) {
    for (const p of h.prefer || []) {
      if (candidate.tags.includes(p)) score += 2;
    }
    for (const a of h.avoid || []) {
      if (candidate.tags.includes(a)) score -= 5;
    }
  }

  const origMachine = /maquina|smith|polea|hack|banca/i.test(original.name);
  const candMachine = /maquina|smith|polea|hack|banca/i.test(candidate.name);
  if (origMachine !== candMachine) score += 1;

  return score;
}

function buildReason(original, chosen, cause, hints) {
  const parts = [
    `Sustitución gratuita (motor local, sin costo de API).`,
    `Mantiene enfoque ${(chosen.tags.filter((t) => original.tags.includes(t))[0] || 'similar')}.`,
  ];
  if (hints.length && hints[0].note) parts.push(hints[0].note);
  if (cause?.trim()) parts.push(`Motivo reportado: ${cause.trim()}.`);
  if (chosen.muscle_group) parts.push(`Grupo: ${chosen.muscle_group}.`);
  return parts.join(' ');
}

function suggestSubstitutions({ galleryItems, exerciseName, cause = '', limit = 3 }) {
  const name = String(exerciseName || '').trim();
  if (!name) {
    const err = new Error('Nombre de ejercicio requerido');
    err.status = 400;
    throw err;
  }
  if (!galleryItems?.length) {
    const err = new Error('Tu entrenador aún no tiene ejercicios en la galería para sugerir alternativas.');
    err.status = 404;
    throw err;
  }

  const { hints } = parseCause(cause);
  const original = classifyExercise({
    name,
    muscle_group: galleryItems.find((g) => normalize(g.name) === normalize(name))?.muscle_group || '',
    youtube_url: null,
  });

  const pool = galleryItems.map((g) => classifyExercise({
    name: g.name,
    muscle_group: g.muscle_group || '',
    youtube_url: g.youtube_url || null,
    notes: g.notes || '',
  }));

  const ranked = pool
    .map((c) => ({ candidate: c, score: scoreCandidate(original, c, hints) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, limit);
  if (!top.length) {
    const err = new Error('No encontramos una alternativa adecuada en la galería de tu entrenador.');
    err.status = 404;
    throw err;
  }

  const best = top[0].candidate;
  const reps = original.tags.includes('legs') ? '8-12' : '10-12';

  return {
    primary: {
      exercise_name: best.name,
      sets: 3,
      reps,
      youtube_url: best.youtube_url || null,
      muscle_group: best.muscle_group || '',
      intensity_type: 'RPE/RIR',
      intensity_value: 7,
      reason: buildReason(original, best, cause, hints),
      match_score: top[0].score,
    },
    alternatives: top.map((t) => ({
      exercise_name: t.candidate.name,
      youtube_url: t.candidate.youtube_url || null,
      muscle_group: t.candidate.muscle_group || '',
      match_score: t.score,
      reason: buildReason(original, t.candidate, cause, hints),
    })),
    meta: {
      engine: 'local_free',
      original: name,
      tags_original: original.tags,
    },
  };
}

module.exports = {
  suggestSubstitutions,
  parseCause,
};
