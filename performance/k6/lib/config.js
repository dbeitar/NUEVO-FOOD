/** Shared K6 configuration — no business logic, load-test only */
export const BASE_URL = (__ENV.BASE_URL || 'http://host.docker.internal:3002/api').replace(/\/$/, '');
export const PASSWORD = __ENV.K6_PASSWORD || 'Demo!2026';
export const PROFILE = __ENV.K6_PROFILE || 'full'; // full | smoke
export const USER_TOKEN = __ENV.K6_TOKEN_USER || '';
export const ADMIN_TOKEN = __ENV.K6_TOKEN_ADMIN || '';

export function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Scale duration/stages for smoke runs (still real metrics, shorter wall time) */
export function scaleDuration(minutes) {
  if (PROFILE === 'smoke') return `${Math.max(1, Math.ceil(minutes / 5))}m`;
  return `${minutes}m`;
}

export function scaleVus(n) {
  if (PROFILE === 'smoke') return Math.max(5, Math.ceil(n / 10));
  return n;
}

export const THRESHOLDS_DEFAULT = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<3000', 'p(99)<8000'],
};

export const THRESHOLDS_HEALTH = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
};
