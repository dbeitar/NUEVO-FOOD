const faqService = require('./faqService');
const platformAudit = require('./platformAuditService');
const { useRelationalStorage } = require('../utils/storageMode');
const { getPrisma } = require('../lib/prisma');

const STOP = new Set(['como', 'que', 'el', 'la', 'los', 'las', 'de', 'en', 'un', 'una', 'por', 'para', 'mi', 'me']);

function tokenize(q) {
  return String(q).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/).filter((w) => w.length > 2 && !STOP.has(w));
}

function searchFaq(modulo, query) {
  const direct = faqService.search(modulo, query);
  if (direct.length) return direct;
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const all = faqService.listItems({ modulo });
  return all
    .map((item) => {
      const text = `${item.pregunta} ${item.respuesta} ${(item.tags || []).join(' ')}`.toLowerCase();
      const score = tokens.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

async function ask(userId, modulo, query) {
  const matches = searchFaq(modulo, query);
  const best = matches[0] || null;
  const suggestions = matches.slice(0, 3).map((m) => ({ id: m.id, pregunta: m.pregunta }));

  const logRow = {
    user_id: userId || null,
    modulo,
    query,
    matched_faq_id: best?.id || null,
    escalated_whatsapp: false,
    created_at: new Date().toISOString(),
  };

  if (useRelationalStorage()) {
    try {
      await getPrisma().helpAssistantLog.create({
        data: {
          userId: userId || null,
          modulo,
          query,
          matchedFaqId: best?.id || null,
        },
      });
    } catch (e) {
      console.warn('[helpAssistant]', e.message);
    }
  }

  await platformAudit.log(userId, modulo, 'help.assistant.query', 'faq', best?.id, { query, matched: !!best });

  if (!best) {
    return {
      matched: false,
      answer: null,
      suggestions: faqService.listItems({ modulo }).slice(0, 5).map((i) => ({ id: i.id, pregunta: i.pregunta })),
      escalate_support: true,
    };
  }

  return {
    matched: true,
    answer: best.respuesta,
    faq_id: best.id,
    pregunta: best.pregunta,
    suggestions,
    related: matches.slice(1, 4).map((m) => ({ id: m.id, pregunta: m.pregunta, respuesta: m.respuesta })),
    escalate_support: false,
  };
}

async function logWhatsappEscalation(userId, modulo, query) {
  await platformAudit.log(userId, modulo, 'help.whatsapp.escalated', null, null, { query });
  if (useRelationalStorage()) {
    try {
      await getPrisma().helpAssistantLog.create({
        data: { userId, modulo, query, escalatedWhatsapp: true },
      });
    } catch { /* noop */ }
  }
}

module.exports = { ask, searchFaq, logWhatsappEscalation };
