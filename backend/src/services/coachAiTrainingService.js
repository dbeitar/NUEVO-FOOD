/**
 * Asistente IA gratuito — motor experto en entrenamiento y clases virtuales.
 * Genera rutinas desde la galería del coach con estructura por día y guiones de cátedra.
 */
const { detectPlatform } = require('../utils/videoPlatform');

const SPECIALIST_PERSONA = `Eres un preparador físico senior y coach de clases virtuales en vivo.
Priorizas: técnica segura, progresión medible (RPE/RIR), calentamiento específico, trabajo cardiovascular con control de pulsaciones,
estiramiento final y comunicación clara para cámara (demostración → series → correcciones → descanso activo).
Nunca inventas ejercicios fuera de la galería del entrenador.`;

const LEVEL_RULES = {
  principiante: { minMain: 5, sets: 3, rest: 90, rpe: 7, cardioMin: 12, hrZone: '60-70% FC máx' },
  intermedio: { minMain: 6, sets: 4, rest: 105, rpe: 8, cardioMin: 15, hrZone: '65-75% FC máx' },
  avanzado: { minMain: 7, sets: 4, rest: 120, rpe: 8, cardioMin: 18, hrZone: '70-80% FC máx' },
};

function rpeToRir(rpe) {
  const n = Number(rpe);
  if (!Number.isFinite(n)) return null;
  // Aproximación estándar: RIR ≈ 10 - RPE
  const rir = Math.max(0, Math.round((10 - n) * 10) / 10);
  return rir;
}

function rirToRpe(rir) {
  const n = Number(rir);
  if (!Number.isFinite(n)) return null;
  const rpe = Math.min(10, Math.max(0, Math.round((10 - n) * 10) / 10));
  return rpe;
}

function restToMinutes(restSeconds) {
  const s = Number(restSeconds) || 0;
  if (!s) return '0 min';
  const min = s / 60;
  // 90s -> 1.5 min, 105s -> 1.75 min
  const rounded = Math.round(min * 4) / 4;
  return `${rounded} min`;
}

const SPLIT_TEMPLATES = {
  2: [
    { key: 'full_a', label: 'Full Body A', tags: ['legs', 'push', 'pull'], ratio: [0.35, 0.35, 0.3] },
    { key: 'full_b', label: 'Full Body B', tags: ['legs', 'pull', 'push'], ratio: [0.35, 0.35, 0.3] },
  ],
  3: [
    { key: 'push', label: 'Empuje + hombro', tags: ['push', 'shoulders', 'core'], ratio: [0.5, 0.3, 0.2] },
    { key: 'pull', label: 'Tirón + bíceps', tags: ['pull', 'arms', 'core'], ratio: [0.55, 0.25, 0.2] },
    { key: 'legs', label: 'Pierna completa', tags: ['legs', 'core', 'mobility'], ratio: [0.7, 0.2, 0.1] },
  ],
  4: [
    { key: 'upper_a', label: 'Tren superior A', tags: ['push', 'pull', 'shoulders'], ratio: [0.4, 0.4, 0.2] },
    { key: 'lower_a', label: 'Tren inferior A', tags: ['legs', 'core'], ratio: [0.85, 0.15] },
    { key: 'upper_b', label: 'Tren superior B', tags: ['pull', 'push', 'arms'], ratio: [0.45, 0.35, 0.2] },
    { key: 'lower_b', label: 'Tren inferior B', tags: ['legs', 'core'], ratio: [0.85, 0.15] },
  ],
  5: [
    { key: 'push', label: 'Empuje', tags: ['push', 'shoulders'], ratio: [0.7, 0.3] },
    { key: 'pull', label: 'Tirón', tags: ['pull', 'arms'], ratio: [0.75, 0.25] },
    { key: 'legs', label: 'Pierna', tags: ['legs'], ratio: [1] },
    { key: 'upper_acc', label: 'Superior accesorios', tags: ['shoulders', 'arms', 'push'], ratio: [0.35, 0.35, 0.3] },
    { key: 'conditioning', label: 'Condición + core', tags: ['core', 'legs'], ratio: [0.4, 0.6] },
  ],
  6: [
    { key: 'push', label: 'Empuje', tags: ['push', 'shoulders'], ratio: [0.75, 0.25] },
    { key: 'pull', label: 'Tirón', tags: ['pull', 'arms'], ratio: [0.8, 0.2] },
    { key: 'legs', label: 'Pierna', tags: ['legs'], ratio: [1] },
    { key: 'push2', label: 'Empuje II', tags: ['push', 'core'], ratio: [0.8, 0.2] },
    { key: 'pull2', label: 'Tirón II', tags: ['pull', 'shoulders'], ratio: [0.75, 0.25] },
    { key: 'legs2', label: 'Pierna II', tags: ['legs', 'core'], ratio: [0.85, 0.15] },
  ],
};

function normalizeText(v = '') {
  return String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function classifyExercise(ex) {
  const blob = normalizeText(`${ex.muscle_group} ${ex.name}`);
  const tags = new Set();
  if (/pantorrilla|tibial|soleo|gastrocnem/.test(blob)) tags.add('legs');
  if (/pierna|sentadilla|prensa|cuadricep|glute|isquio|cadera|abductor|aductor|lunge|hack|bulgara|empeje pierna|bisagra|empuje de cadera|empuje cadera|patada|buenos dias/.test(blob)) tags.add('legs');
  else if (/empuje|pectoral|pecho|tricep|press|fondos|apertura/.test(blob)) tags.add('push');
  if (/tiron|remo|jalon|dorsal|espalda|bicep|dominada/.test(blob)) tags.add('pull');
  if (/deltoid|hombro|elevacion lateral|elevacion frontal|abduccion/.test(blob)) tags.add('shoulders');
  if (/bicep|tricep|copa|curl|extension tricep/.test(blob)) tags.add('arms');
  if (/abdomen|core|crunch|plancha|oblicuo/.test(blob)) tags.add('core');
  if (/calentamiento|movilidad|activacion/.test(blob)) tags.add('mobility');
  if (/apertura/.test(blob)) tags.add('chest_iso');
  if (/press|empuje|banca|fondos/.test(blob)) tags.add('chest_press');
  if (/remo|jalon|dorsal|espalda/.test(blob)) tags.add('back');
  if (/curl|bicep/.test(blob)) tags.add('biceps');
  if (/tricep|copa|extension/.test(blob)) tags.add('triceps');
  if (/elevacion|deltoid|hombro|abduccion/.test(blob)) tags.add('shoulder');
  if (!tags.size) tags.add('push');
  return { ...ex, tags: [...tags] };
}

function repsForGoal(objetivo, nivel) {
  const o = normalizeText(objetivo);
  const n = normalizeText(nivel);
  if (o === 'fuerza') return n === 'principiante' ? '5-6' : '3-5';
  if (o === 'resistencia') return '12-20';
  if (o === 'mantenimiento') return '10-12';
  return n === 'avanzado' ? '6-10' : '8-12';
}

function warmupForDay(dayLabel, tags) {
  const focus = tags.includes('legs') ? 'cadera, tobillo y activación de glúteo'
    : tags.includes('pull') ? 'escápulas, dorsal y movilidad torácica'
    : 'hombros, muñecas y columna torácica';
  return {
    nombre: tags.includes('legs') ? 'Calentamiento tren inferior' : 'Calentamiento tren superior',
    series: '1',
    repeticiones: '6-8 min',
    descanso: '0s',
    observaciones: `Clase virtual: 2 min movilidad (${focus}) + 2 series ligeras del primer ejercicio principal. RPE/RIR 4-5. Explica postura a cámara.`,
    tempo: 'controlado',
    block_type: 'calentamiento',
  };
}

function cardioForDay(levelRule) {
  const bpm = levelRule.hrZone.includes('60') ? '110-130 lpm'
    : levelRule.hrZone.includes('65') ? '120-145 lpm'
      : '130-155 lpm';
  return {
    nombre: 'Cardio zona 2 + control de pulsaciones',
    series: '1',
    repeticiones: `${levelRule.cardioMin}-${levelRule.cardioMin + 5} min`,
    descanso: '0s',
    observaciones: `Zona 2: ${bpm} (referencia) o ${levelRule.hrZone}. Si no tienes pulsómetro: esfuerzo 5-6/10, puedes hablar en frases cortas.`,
    tempo: '—',
    block_type: 'cardio',
  };
}

function stretchForDay(dayLabel) {
  const isLower = /inferior|pierna|legs/i.test(String(dayLabel || ''));
  return {
    nombre: isLower ? 'Estiramiento tren inferior' : 'Estiramiento tren superior',
    series: '1',
    repeticiones: '5-8 min',
    descanso: '0s',
    observaciones: '20-40s por posición, sin rebote. Cierra la clase virtual recordando hidratación y sueño.',
    tempo: '—',
    block_type: 'estiramiento',
  };
}

function virtualClassBrief(day, exercises, params) {
  return `Día ${day.dia}: objetivo ${params.objetivo}, nivel ${params.nivel}.`;
}

const DAY_TAG_ALLOW = {
  push: ['push', 'shoulders'],
  push2: ['push', 'core'],
  pull: ['pull', 'arms'],
  pull2: ['pull', 'shoulders'],
  upper_a: ['push', 'pull', 'shoulders'],
  upper_b: ['pull', 'push', 'arms'],
  upper_acc: ['shoulders', 'arms', 'push'],
  legs: ['legs', 'core'],
  legs2: ['legs', 'core'],
  lower_a: ['legs', 'core'],
  lower_b: ['legs', 'core'],
  full_a: ['legs', 'push', 'pull', 'core'],
  full_b: ['legs', 'pull', 'push', 'core'],
  conditioning: ['core', 'legs'],
};

function exerciseAllowedForDay(dayKey, ex) {
  const allow = DAY_TAG_ALLOW[dayKey];
  if (!allow) return true;
  return ex.tags.some((t) => allow.includes(t));
}

function pickForTags(pool, tags, count, used, dayKey = null) {
  const candidates = pool.filter((ex) => {
    if (used.has(normalizeText(ex.name))) return false;
    if (dayKey && !exerciseAllowedForDay(dayKey, ex)) return false;
    return true;
  });
  const scored = candidates
    .map((ex) => {
      let score = 0;
      for (const t of tags) {
        if (ex.tags.includes(t)) score += 5;
      }
      if (ex.youtube_url) score += 1;
      return { ex, score };
    })
    .filter((s) => s.score >= 5)
    .sort((a, b) => b.score - a.score);

  const picked = [];
  for (const s of scored) {
    if (picked.length >= count) break;
    picked.push(s.ex);
    used.add(normalizeText(s.ex.name));
  }

  if (picked.length < count) {
    for (const t of tags) {
      if (picked.length >= count) break;
      for (const ex of candidates) {
        if (picked.length >= count) break;
        const k = normalizeText(ex.name);
        if (used.has(k) || !ex.tags.includes(t)) continue;
        picked.push(ex);
        used.add(k);
      }
    }
  }
  return picked;
}

function diversifyMainList(list, levelRule) {
  // Evita duplicar patrones muy similares en upper:
  // - máximo 1 de chest_iso (aperturas)
  // - máximo 1 de chest_press (press/empuje)
  // - máximo 1 de biceps
  // - asegura al menos 1 back si hay upper
  const out = [];
  let chestIso = 0;
  let chestPress = 0;
  let biceps = 0;
  for (const ex of list) {
    const isChestIso = ex.tags?.includes('chest_iso');
    const isChestPress = ex.tags?.includes('chest_press');
    const isBiceps = ex.tags?.includes('biceps');
    if (isChestIso && chestIso >= 1) continue;
    if (isChestPress && chestPress >= 1) continue;
    if (isBiceps && biceps >= 1) continue;
    if (isChestIso) chestIso += 1;
    if (isChestPress) chestPress += 1;
    if (isBiceps) biceps += 1;
    out.push(ex);
  }
  return out.slice(0, levelRule.minMain);
}

function distributeExercises(pool, daysCount, nivel) {
  const template = SPLIT_TEMPLATES[daysCount] || SPLIT_TEMPLATES[4];
  const levelRule = LEVEL_RULES[normalizeText(nivel)] || LEVEL_RULES.intermedio;
  const classified = pool.map(classifyExercise);
  const used = new Set();
  const dayPlans = [];

  template.forEach((dayTpl, idx) => {
    const counts = dayTpl.ratio.map((r) => Math.max(1, Math.round(levelRule.minMain * r)));
    let remaining = levelRule.minMain - counts.reduce((s, n) => s + n, 0);
    let i = 0;
    while (remaining > 0) {
      counts[i % counts.length] += 1;
      remaining -= 1;
      i += 1;
    }

    const mainExercises = [];
    const dayKey = dayTpl.key;

    // === Reglas de balance experto (evitar duplicidades) ===================
    // Upper days: 1 push + 1 pull + 1 shoulders. Arms máximo 1.
    // Lower days: prioriza legs, y core si aplica.
    const isUpper = dayKey.includes('upper') || ['push', 'pull', 'push2', 'pull2', 'upper_acc'].includes(dayKey);
    const isLower = dayKey.includes('lower') || ['legs', 'legs2'].includes(dayKey);
    const wantsCore = dayTpl.tags.includes('core') || dayKey.includes('conditioning');

    if (isUpper) {
      // 1 pecho (press o iso), 1 espalda (remo/jalón), 1 hombro, 1 bíceps opcional (máx 1)
      mainExercises.push(...pickForTags(classified, ['chest_press', 'chest_iso', 'push'], 1, used, dayKey));
      mainExercises.push(...pickForTags(classified, ['back', 'pull'], 1, used, dayKey));
      mainExercises.push(...pickForTags(classified, ['shoulder', 'shoulders'], 1, used, dayKey));
      if (dayTpl.tags.includes('arms')) {
        mainExercises.push(...pickForTags(classified, ['biceps', 'arms'], 1, used, dayKey));
      }
    } else if (isLower) {
      mainExercises.push(...pickForTags(classified, ['legs'], Math.min(3, levelRule.minMain - 1), used, dayKey));
      if (wantsCore) mainExercises.push(...pickForTags(classified, ['core'], 1, used, dayKey));
    } else {
      // Full body / conditioning: respetar tags pero limitar arms a 1
      const tags = dayTpl.tags.includes('arms')
        ? [...dayTpl.tags.filter((t) => t !== 'arms'), 'arms']
        : dayTpl.tags;
      tags.forEach((tag, ti) => {
        const need = tag === 'arms' ? 1 : (counts[ti] || 1);
        const picked = pickForTags(classified, [tag], need, used, dayKey);
        mainExercises.push(...picked);
      });
    }

    const safeTags = isUpper
      ? ['back', 'pull', 'shoulder', 'shoulders', 'core', 'triceps'] // evita llenar de push otra vez
      : dayTpl.tags.filter((t) => t !== 'arms');
    while (mainExercises.length < levelRule.minMain) {
      const extra = pickForTags(classified, safeTags.length ? safeTags : dayTpl.tags, 1, used, dayKey);
      if (!extra.length) break;
      mainExercises.push(...extra);
    }

    if (isUpper) {
      const diversified = diversifyMainList(mainExercises, levelRule);
      mainExercises.length = 0;
      mainExercises.push(...diversified);
      while (mainExercises.length < levelRule.minMain) {
        const extra = pickForTags(classified, safeTags, 1, used, dayKey);
        if (!extra.length) break;
        mainExercises.push(...extra);
      }
    }

    if (isUpper) {
      const armsIdx = mainExercises.map((e, i) => (e.tags.includes('arms') ? i : -1)).filter((i) => i >= 0);
      while (armsIdx.length > 1) {
        const drop = armsIdx.pop();
        mainExercises.splice(drop, 1);
      }
      while (mainExercises.length < levelRule.minMain) {
        const extra = pickForTags(classified, safeTags, 1, used, dayKey);
        if (!extra.length) break;
        mainExercises.push(...extra);
      }
    }

    dayPlans.push({
      dia: idx + 1,
      key: dayTpl.key,
      label: dayTpl.label,
      tags: dayTpl.tags,
      mainExercises: mainExercises.slice(0, levelRule.minMain),
    });
  });

  return { dayPlans, levelRule };
}

function toPlanExercise(ex, params, levelRule, blockType = 'principal') {
  const sets = blockType === 'principal' ? String(levelRule.sets) : '1';
  const intensityValue = blockType === 'principal' ? levelRule.rpe : 5;
  const rir = rpeToRir(intensityValue);
  return {
    exercise_name: ex.name,
    sets: Number.parseInt(sets, 10) || 3,
    reps: blockType === 'principal' ? repsForGoal(params.objetivo, params.nivel) : ex.repeticiones || '—',
    rest_seconds: blockType === 'principal' ? levelRule.rest : 0,
    rest_minutes: restToMinutes(blockType === 'principal' ? levelRule.rest : 0),
    intensity_mode: 'RPE', // UI puede alternar a RIR
    intensity_type: 'RPE',
    intensity_value: intensityValue,
    intensity_equiv: { RIR: rir, RPE: intensityValue },
    tempo: ex.tempo || '2-1-2-0',
    youtube_url: ex.youtube_url || null,
    notes: ex.observaciones || (ex.muscle_group ? `Grupo: ${ex.muscle_group}.` : ''),
    block_type: blockType,
  };
}

function buildDaysFromGallery(gallery, params) {
  const daysCount = Math.min(6, Math.max(2, Number(params.dias) || 4));
  const nivel = normalizeText(params.nivel) || 'intermedio';
  const levelRule = LEVEL_RULES[nivel] || LEVEL_RULES.intermedio;
  const withVideo = gallery.filter((g) => g.youtube_url);
  const pool = withVideo.length >= daysCount * levelRule.minMain ? withVideo : gallery;

  if (pool.length < daysCount * levelRule.minMain) {
    const err = new Error(
      `Galería insuficiente: necesitas al menos ${daysCount * levelRule.minMain} ejercicios y tienes ${pool.length}.`,
    );
    err.status = 400;
    throw err;
  }

  const { dayPlans } = distributeExercises(pool, daysCount, nivel);
  const dias = [];
  const blocks = [];

  dayPlans.forEach((dp) => {
    const dayNombre = `Día ${dp.dia} · ${dp.label}`;
    const warmupUpper = warmupForDay('Tren superior', ['push', 'pull', 'shoulders']);
    const warmupLower = warmupForDay('Tren inferior', ['legs']);
    const cardio = cardioForDay(levelRule);
    const stretchUpper = stretchForDay('Tren superior');
    const stretchLower = stretchForDay('Tren inferior');

    const ejercicios = [
      toPlanExercise({ name: warmupUpper.nombre, ...warmupUpper }, params, levelRule, 'calentamiento'),
      toPlanExercise({ name: warmupLower.nombre, ...warmupLower }, params, levelRule, 'calentamiento'),
      ...dp.mainExercises.map((ex) => toPlanExercise(ex, params, levelRule, 'principal')),
      toPlanExercise({ name: cardio.nombre, ...cardio }, params, levelRule, 'cardio'),
      toPlanExercise({ name: stretchUpper.nombre, ...stretchUpper }, params, levelRule, 'estiramiento'),
      toPlanExercise({ name: stretchLower.nombre, ...stretchLower }, params, levelRule, 'estiramiento'),
    ];

    const coach_brief = virtualClassBrief({ dia: dp.dia, nombre: dp.label }, ejercicios, params);

    dias.push({
      dia: dp.dia,
      nombre: dayNombre,
      completado: false,
      coach_brief,
      ejercicios,
    });

    const mkBlock = (phase, list, orden) => ({
      tipo: 'BLOQUE_LIBRE',
      orden,
      nombre: `D${dp.dia} · ${phase}`,
      exercises: list.map((ex, idx) => ({
        nombre: ex.exercise_name || ex.name,
        series: String(ex.sets || 3),
        repeticiones: String(ex.reps || ex.repeticiones || '10'),
        descanso: `${ex.rest_seconds || 0}s`,
        orden: idx,
        video_url: ex.youtube_url || null,
        observaciones: ex.notes || ex.observaciones || '',
        tempo: ex.tempo || '2-1-2-0',
      })),
    });

    blocks.push(mkBlock('Calentamiento', [ejercicios[0]], dp.dia * 10));
    blocks.push(mkBlock('Trabajo principal', ejercicios.filter((e) => e.block_type === 'principal'), dp.dia * 10 + 1));
    blocks.push(mkBlock('Cardio pulsaciones', ejercicios.filter((e) => e.block_type === 'cardio'), dp.dia * 10 + 2));
    blocks.push(mkBlock('Estiramiento', ejercicios.filter((e) => e.block_type === 'estiramiento'), dp.dia * 10 + 3));
  });

  const motivo = [
    `Plan generado por asistente experto (${daysCount} días, ${levelRule.minMain} ejercicios principales/día).`,
    `Objetivo: ${params.objetivo}. Nivel: ${params.nivel}.`,
    `Incluye calentamiento, bloque principal desde tu galería, cardio con pulsaciones y estiramiento.`,
    params.notas ? `Notas: ${params.notas}` : null,
  ].filter(Boolean).join(' ');

  return {
    dias,
    blocks,
    daysCount,
    levelRule,
    motivo,
    specialist_prompt: SPECIALIST_PERSONA,
    split: (SPLIT_TEMPLATES[daysCount] || SPLIT_TEMPLATES[4]).map((d) => d.label),
  };
}

function parseDayBlocks(routine) {
  const blocks = routine.blocks || [];
  const dayMap = new Map();
  const re = /^D(\d+)\s*·\s*(.+)$/i;

  for (const b of blocks) {
    const m = String(b.nombre || '').match(re);
    if (!m) continue;
    const dayNum = Number(m[1]);
    const phase = m[2].trim().toLowerCase();
    if (!dayMap.has(dayNum)) {
      dayMap.set(dayNum, { calentamiento: [], principal: [], cardio: [], estiramiento: [] });
    }
    const bucket = dayMap.get(dayNum);
    const list = (b.exercises || []).filter((e) => e.nombre);
    if (/calentamiento/.test(phase)) bucket.calentamiento.push(...list);
    else if (/cardio|pulsacion/.test(phase)) bucket.cardio.push(...list);
    else if (/estiramiento/.test(phase)) bucket.estiramiento.push(...list);
    else bucket.principal.push(...list);
  }

  return dayMap;
}

function buildPlanDaysFromStructuredRoutine(routine, diasCount, coachUser, galleryUrlForExercise) {
  const dayMap = parseDayBlocks(routine);
  if (!dayMap.size) return null;

  const dias = [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayNum, buckets]) => {
      const ordered = [
        ...buckets.calentamiento,
        ...buckets.principal,
        ...buckets.cardio,
        ...buckets.estiramiento,
      ];
      const ejercicios = ordered.map((ex) => {
        const isWarmup = buckets.calentamiento.includes(ex);
        const isCardio = buckets.cardio.includes(ex);
        const isStretch = buckets.estiramiento.includes(ex);
        const block_type = isWarmup ? 'calentamiento' : isCardio ? 'cardio' : isStretch ? 'estiramiento' : 'principal';
        return {
          exercise_name: ex.nombre,
          sets: Number.parseInt(ex.series, 10) || (block_type === 'principal' ? 3 : 1),
          reps: ex.repeticiones || '10',
          rest_seconds: Number.parseInt(String(ex.descanso || '').replace(/\D/g, ''), 10) || (block_type === 'principal' ? 90 : 0),
          intensity_type: 'RPE/RIR',
          intensity_value: block_type === 'principal' ? 8 : 5,
          tempo: ex.tempo || '2-1-2-0',
          youtube_url: ex.video_url || galleryUrlForExercise(ex.nombre, coachUser),
          notes: ex.observaciones || '',
          block_type,
        };
      });
      const mainNames = buckets.principal.map((e) => e.nombre).slice(0, 2).join(', ');
      return {
        dia: dayNum,
        nombre: `Día ${dayNum} · ${mainNames || 'Sesión'}`,
        completado: false,
        coach_brief: `Sesión estructurada: ${ejercicios.filter((e) => e.block_type === 'principal').length} ejercicios principales + calentamiento, cardio y estiramiento.`,
        ejercicios,
      };
    });

  return {
    routine,
    dias,
    split_type: `${dias.length} días / semana`,
    method: routine.objetivo || 'Plan coach IA',
    level: routine.nivel || 'intermedio',
  };
}

module.exports = {
  SPECIALIST_PERSONA,
  LEVEL_RULES,
  buildDaysFromGallery,
  buildPlanDaysFromStructuredRoutine,
  parseDayBlocks,
  classifyExercise,
};
