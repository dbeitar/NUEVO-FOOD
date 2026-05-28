/**
 * ESCENARIO 11 — Auditoría (escrituras + lecturas)
 * 300 VUs, 10 min — logs, tracking, FAQ, asistente
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, scaleDuration, scaleVus, jsonHeaders } from '../lib/config.js';
import { sessionUser, sessionAdmin } from '../lib/session.js';

export const options = {
  scenarios: {
    audit: {
      executor: 'constant-vus',
      vus: scaleVus(300),
      duration: scaleDuration(10),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.08'],
    'http_req_duration{name:POST /help/ask}': ['p(95)<5000'],
    'http_req_duration{name:POST /communications/whatsapp/click}': ['p(95)<3000'],
  },
  tags: { scenario: '11-audit' },
};

export default function () {
  const userTok = sessionUser(__VU);
  const adminTok = sessionAdmin(__VU);

  if (userTok) {
    check(http.post(
      `${BASE_URL}/help/ask`,
      JSON.stringify({ modulo: 'd28d', query: `load test ${__ITER}` }),
      { tags: { name: 'POST /help/ask' }, headers: jsonHeaders(userTok) },
    ), { 'help ok': (r) => r.status === 200 });

    check(http.post(`${BASE_URL}/communications/whatsapp/click`, null, {
      tags: { name: 'POST /communications/whatsapp/click' },
      headers: jsonHeaders(userTok),
    }), { 'wa click ok': (r) => r.status >= 200 && r.status < 300 });

    check(http.get(`${BASE_URL}/d28d/progress/me`, {
      tags: { name: 'GET /d28d/progress/me' },
      headers: jsonHeaders(userTok),
    }), { 'progress ok': (r) => r.status === 200 || r.status === 403 });
  }

  if (adminTok) {
    check(http.get(`${BASE_URL}/communications/logs?limit=50`, {
      tags: { name: 'GET /communications/logs' },
      headers: jsonHeaders(adminTok),
    }), { 'comm logs ok': (r) => r.status === 200 });

    check(http.get(`${BASE_URL}/platform/audit?limit=50`, {
      tags: { name: 'GET /platform/audit' },
      headers: jsonHeaders(adminTok),
    }), { 'audit ok': (r) => r.status === 200 });
  }

  check(http.get(`${BASE_URL}/faq/d28d/search?q=clase`, {
    tags: { name: 'GET /faq/d28d/search' },
  }), { 'faq ok': (r) => r.status === 200 });

  sleep(0.8);
}
