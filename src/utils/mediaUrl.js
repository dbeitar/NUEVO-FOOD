import { API_BASE } from '../services/api';

/** URL absoluta para imágenes del API (/uploads/...) o URLs externas. */
export function resolveMediaUrl(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('data:')) return s;
  const origin = API_BASE.replace(/\/api\/?$/i, '');
  return `${origin}${s.startsWith('/') ? s : `/${s}`}`;
}
