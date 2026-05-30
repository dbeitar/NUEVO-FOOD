const axios = require('axios');
const { getPrisma } = require('../../lib/prisma');

const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || '').replace(/\/+$/, '');
const ollamaModel = (process.env.OLLAMA_MODEL || 'llama3.1:8b').trim();

const NICOLAS_TRAINER_EMAIL = (process.env.SPIRITUAL_NICOLAS_EMAIL || 'nicolasdelrio@foodplan.local').toLowerCase();

/** Visión teológica: formación espiritual centrada en Jesús, no religión denominacional. */
const SPIRITUAL_PERSONA = `Eres un guía de formación espiritual centrado en las enseñanzas de Jesús de Nazaret.
Enfoque: transformación interior, amor al prójimo, servicio, perdón, humildad, propósito y paz — NO dogma denominacional.
Evita: lenguaje religioso rígido, culpa, miedo, sectarismo, debates doctrinales.
Prioriza: evangelios sinópticos y Juan — Sermón del Monte, parábolas, mandamiento del amor, servicio, transformación del corazón.
Tono: cálido, profundo, accesible, aplicable al día a día (cuerpo, mente, hábitos, relaciones).
El contenido acompaña a la comunidad del entrenador Nicolas del Rio: integración de bienestar físico y formación del espíritu.
Responde SOLO JSON válido cuando se pida estructura. Español (Colombia/LATAM).`;

const FALLBACK_VERSES = [
  { reference: 'Mateo 5:3-4', text: 'Bienaventurados los pobres en espíritu… Bienaventurados los que lloran, porque ellos recibirán consolación.' },
  { reference: 'Marcos 12:30-31', text: 'Amarás al Señor tu Dios… y a tu prójimo como a ti mismo.' },
  { reference: 'Juan 13:34', text: 'Un mandamiento nuevo os doy: Que os améis unos a otros.' },
  { reference: 'Lucas 6:31', text: 'Y como queréis que hagan los hombres con vosotros, haced vosotros también de la misma manera con ellos.' },
  { reference: 'Mateo 6:33', text: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' },
  { reference: 'Juan 8:32', text: 'Y conoceréis la verdad, y la verdad os hará libres.' },
  { reference: 'Mateo 11:28', text: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.' },
];

async function ollamaAvailable() {
  if (!ollamaBaseUrl) return false;
  try {
    await axios.get(`${ollamaBaseUrl}/api/tags`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function chatJson(prompt, fallback) {
  if (!ollamaBaseUrl) return fallback();
  try {
    const response = await axios.post(
      `${ollamaBaseUrl}/api/chat`,
      {
        model: ollamaModel,
        stream: false,
        messages: [
          { role: 'system', content: SPIRITUAL_PERSONA },
          { role: 'user', content: prompt },
        ],
        options: { temperature: 0.65 },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 90000 },
    );
    const text = response.data?.message?.content || '';
    const match = String(text).match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return fallback(text);
  } catch (e) {
    console.warn('[spiritual.ai]', e.message);
    return fallback();
  }
}

async function findNicolasTrainer() {
  const prisma = getPrisma();
  const row = await prisma.trainer.findFirst({
    where: {
      activo: true,
      OR: [
        { email: { equals: NICOLAS_TRAINER_EMAIL, mode: 'insensitive' } },
        { nombre: { contains: 'Nicolas del Rio', mode: 'insensitive' } },
        { nombre: { contains: 'Nicolás del Rio', mode: 'insensitive' } },
      ],
    },
  });
  return row;
}

async function pickRandomVerseFromDb() {
  const prisma = getPrisma();
  const count = await prisma.spiritualBibleVerse.count();
  if (!count) return null;
  const skip = Math.floor(Math.random() * count);
  const v = await prisma.spiritualBibleVerse.findFirst({
    skip,
    include: { chapter: { include: { book: true } } },
  });
  if (!v) return null;
  return {
    verse_id: v.id,
    reference: `${v.chapter.book.name} ${v.chapter.chapterNumber}:${v.verseNumber}`,
    text: v.text,
  };
}

function fallbackVerseDay() {
  const v = FALLBACK_VERSES[Math.floor(Math.random() * FALLBACK_VERSES.length)];
  return {
    custom_text: v.text,
    reflection: 'Hoy dejamos que esta enseñanza de Jesús oriente nuestras decisiones: amor concreto, servicio y paz interior.',
    theme: 'Enseñanzas de Jesús',
    reference: v.reference,
  };
}

async function generateVerseOfDay(options = {}) {
  const theme = options.theme || 'enseñanzas de Jesús para la vida diaria';
  const dbVerse = await pickRandomVerseFromDb();
  const prompt = dbVerse
    ? `Genera reflexión espiritual (NO religiosa/denominacional) para:
Versículo: ${dbVerse.reference} — "${dbVerse.text}"
Tema: ${theme}
JSON: {"reflection":"2-3 oraciones profundas y aplicables","challenge":"1 acción concreta hoy","theme":"string"}`
    : `Elige una enseñanza central de Jesús (Sermón del Monte o parábola) y devuelve JSON:
{"reference":"Mateo X:Y","custom_text":"texto del versículo en español","reflection":"...","challenge":"...","theme":"..."}`;

  const data = await chatJson(prompt, fallbackVerseDay);
  return {
    verse_id: dbVerse?.verse_id || null,
    custom_text: data.custom_text || dbVerse?.text || fallbackVerseDay().custom_text,
    reflection: data.reflection || fallbackVerseDay().reflection,
    challenge: data.challenge || 'Practica una acción de servicio anónimo hoy.',
    theme: data.theme || theme,
    reference: data.reference || dbVerse?.reference || null,
    ai: Boolean(ollamaBaseUrl),
  };
}

function fallbackDevotionalDay(dayIndex, total) {
  const themes = [
    ['Humildad del corazón', 'Reconoce una área donde puedes soltar el orgullo.', 'Señor, enséñame a servir sin esperar reconocimiento.', 'Haz un acto de servicio discreto.'],
    ['Amor al prójimo', 'Jesús une cuerpo y espíritu: cuida de alguien hoy.', 'Dame ojos para ver necesidad real, no apariencia.', 'Escribe un mensaje de ánimo a alguien.'],
    ['Perdón y libertad', 'Soltar resentimiento libera energía para transformarte.', 'Ayúdame a perdonar como quiero ser perdonado.', 'Libera una ofensa en oración o journaling.'],
    ['Propósito y paz', 'Busca primero lo esencial; el resto encuentra su lugar.', 'Ordéname en tu paz, no en la ansiedad.', '10 minutos de silencio sin pantallas.'],
    ['Verdad y autenticidad', 'La verdad interior alinea hábitos y relaciones.', 'Que mi vida refleje coherencia, no máscaras.', 'Identifica una verdad que evades y nómbrala en voz baja.'],
    ['Gratitud', 'La gratitud transforma la mirada sobre el cuerpo y el camino.', 'Gracias por este día y por quienes caminan conmigo.', 'Lista 5 gratitudes antes de entrenar o comer.'],
    ['Descanso en Jesús', 'Venid a mí los cargados: el descanso también es formación.', 'Recibo tu descanso más allá del rendimiento.', 'Duerme 30 min antes o reduce una carga innecesaria.'],
  ];
  const t = themes[(dayIndex - 1) % themes.length];
  return {
    day_index: dayIndex,
    reflection: `${t[0]}: ${t[1]}`,
    prayer: t[2],
    challenge: t[3],
  };
}

async function generateDevotionalPlan({ durationDays = 7, title = null, theme = 'enseñanzas de Jesús' } = {}) {
  const days = Number(durationDays);
  if (![7, 21, 30, 40].includes(days)) throw new Error('Duración debe ser 7, 21, 30 o 40');

  const prompt = `Crea un plan devocional de ${days} días centrado en las enseñanzas de Jesús (formación espiritual, NO religión denominacional).
Título sugerido: ${title || `Formación · ${days} días con Jesús`}
Tema: ${theme}
Comunidad: entrenador Nicolas del Rio (bienestar integral).
JSON array de ${days} objetos: [{"day_index":1,"reflection":"...","prayer":"...","challenge":"..."}, ...]
Cada reflexión 2-3 oraciones. Oración en 1ª persona. Desafío accionable en 1 línea.`;

  const data = await chatJson(prompt, () => ({
    days: Array.from({ length: days }, (_, i) => fallbackDevotionalDay(i + 1, days)),
    title: title || `Formación espiritual · ${days} días`,
  }));

  const planDays = Array.isArray(data) ? data : (data.days || []);
  const normalized = [];
  for (let i = 1; i <= days; i += 1) {
    const row = planDays.find((d) => Number(d.day_index || d.dayIndex) === i) || fallbackDevotionalDay(i, days);
    normalized.push({
      day_index: i,
      reflection: row.reflection || fallbackDevotionalDay(i, days).reflection,
      prayer: row.prayer || fallbackDevotionalDay(i, days).prayer,
      challenge: row.challenge || fallbackDevotionalDay(i, days).challenge,
    });
  }

  return {
    title: (Array.isArray(data) ? null : data.title) || title || `Comunidad Nicolas del Rio · ${days} días con Jesús`,
    description: `Devocional de formación espiritual centrado en las enseñanzas de Jesús. Comunidad Nicolas del Rio.`,
    duration_days: days,
    days: normalized,
    ai: Boolean(ollamaBaseUrl),
  };
}

async function generateStudy({ topic = 'El Sermón del Monte aplicado a la vida diaria' } = {}) {
  const prompt = `Crea un estudio bíblico espiritual (NO denominacional) sobre: ${topic}
Enfoque enseñanzas de Jesús. Para comunidad Nicolas del Rio.
JSON: {"title":"...","description":"3-4 oraciones","tags":["jesus","formacion"],"sections":[{"heading":"...","body":"..."}]}`;

  const data = await chatJson(prompt, () => ({
    title: 'El amor activo en las enseñanzas de Jesús',
    description: 'Exploramos cómo el mandamiento del amor transforma hábitos, relaciones y entrenamiento consciente.',
    tags: ['jesus', 'amor', 'formacion', 'nicolas-del-rio'],
    sections: [
      { heading: 'Lectura', body: 'Marcos 12:30-31 — amar a Dios y al prójimo como a uno mismo.' },
      { heading: 'Reflexión', body: 'Jesús no separa lo espiritual de lo cotidiano: cuidar el cuerpo y servir al otro son el mismo camino.' },
      { heading: 'Aplicación', body: 'Esta semana, une tu rutina de entrenamiento con un acto de servicio concreto.' },
    ],
  }));

  const bodyText = (data.sections || [])
    .map((s) => `## ${s.heading}\n${s.body}`)
    .join('\n\n');

  return {
    title: data.title || 'Estudio espiritual',
    description: data.description || bodyText.slice(0, 300),
    tags: data.tags || ['jesus', 'formacion'],
    media_type: 'text',
    media_url: '',
    content_text: bodyText,
    ai: Boolean(ollamaBaseUrl),
  };
}

module.exports = {
  SPIRITUAL_PERSONA,
  ollamaAvailable,
  findNicolasTrainer,
  generateVerseOfDay,
  generateDevotionalPlan,
  generateStudy,
  NICOLAS_TRAINER_EMAIL,
};
