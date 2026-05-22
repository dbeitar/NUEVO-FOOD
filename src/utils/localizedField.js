/** Elige campo ES o *_en según idioma activo. */
export function pickLocalized(obj, field, lang, fallback = '') {
  if (!obj || typeof obj !== 'object') return fallback;
  if (lang === 'en') {
    const enVal = obj[`${field}_en`];
    if (enVal != null && String(enVal).trim()) return String(enVal).trim();
  }
  const val = obj[field];
  if (val != null && String(val).trim()) return String(val).trim();
  return fallback;
}
