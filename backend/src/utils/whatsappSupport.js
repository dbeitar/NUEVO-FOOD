/** Número global de soporte (Colombia). Sin APIs externas — solo wa.me */
const DEFAULT_SUPPORT_PHONE = process.env.SUPPORT_WHATSAPP_DEFAULT || '573192635819';

const DEFAULT_MESSAGES = {
  vital: 'Hola, necesito ayuda con mi programa Vital D28D.',
  pancitas: 'Hola, necesito ayuda con Pancitas Fit.',
  virtual_d28d: 'Hola, necesito ayuda con mi programa D28D Virtual.',
  d28d: 'Hola, necesito ayuda con mi programa D28D.',
  food: 'Hola, necesito ayuda con mi plan de alimentación.',
  training: 'Hola, necesito soporte de mi cuenta de entrenador.',
};

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizePhone(phone) {
  const d = digitsOnly(phone);
  if (!d) return DEFAULT_SUPPORT_PHONE;
  if (d.length === 10 && d.startsWith('3')) return `57${d}`;
  return d;
}

function defaultMessageForPlan(plan = {}) {
  const programId = String(plan.program_id || '').toLowerCase();
  const kind = String(plan.kind || 'd28d').toLowerCase();
  if (plan.support_message && String(plan.support_message).trim()) {
    return String(plan.support_message).trim();
  }
  if (DEFAULT_MESSAGES[programId]) return DEFAULT_MESSAGES[programId];
  if (DEFAULT_MESSAGES[kind]) return DEFAULT_MESSAGES[kind];
  return DEFAULT_MESSAGES.d28d;
}

function buildWaMeUrl(phone, message) {
  const num = normalizePhone(phone);
  const text = encodeURIComponent(String(message || '').trim());
  return `https://wa.me/${num}${text ? `?text=${text}` : ''}`;
}

function resolvePlanSupport(plan) {
  if (!plan) {
    return {
      support_whatsapp: DEFAULT_SUPPORT_PHONE,
      support_name: 'Soporte D28D',
      support_message: DEFAULT_MESSAGES.d28d,
      support_activo: true,
      wa_url: buildWaMeUrl(DEFAULT_SUPPORT_PHONE, DEFAULT_MESSAGES.d28d),
    };
  }
  const active = plan.support_activo !== false;
  const phone = active
    ? normalizePhone(plan.support_whatsapp || DEFAULT_SUPPORT_PHONE)
    : DEFAULT_SUPPORT_PHONE;
  const message = defaultMessageForPlan(plan);
  const name = plan.support_name || 'Soporte';
  return {
    support_whatsapp: phone,
    support_name: name,
    support_message: message,
    support_activo: active,
    wa_url: buildWaMeUrl(phone, message),
  };
}

module.exports = {
  DEFAULT_SUPPORT_PHONE,
  DEFAULT_MESSAGES,
  normalizePhone,
  defaultMessageForPlan,
  buildWaMeUrl,
  resolvePlanSupport,
};
