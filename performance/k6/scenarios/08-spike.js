/**
 * ESCENARIO 8 — Spike test (100 → 5000 in <60s)
 * Simula apertura de ciclo D28D
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, PROFILE, jsonHeaders } from '../lib/config.js';
import { sessionUser } from '../lib/session.js';

const spikeFull = [
  { duration: '30s', target: 100 },
  { duration: '30s', target: 5000 },
  { duration: '5m', target: 5000 },
  { duration: '2m', target: 100 },
  { duration: '1m', target: 0 },
];

const spikeSmoke = [
  { duration: '15s', target: 50 },
  { duration: '15s', target: 500 },
  { duration: '1m', target: 500 },
  { duration: '30s', target: 0 },
];

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: PROFILE === 'smoke' ? spikeSmoke : spikeFull,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.20'],
  },
  tags: { scenario: '08-spike' },
};

export default function () {
  const token = sessionUser(__VU);
  check(http.get(`${BASE_URL}/live-classes`, {
    tags: { name: 'GET /live-classes' },
    headers: jsonHeaders(token),
  }), { 'live 200': (r) => r.status === 200 || r.status === 401 });

  check(http.get(`${BASE_URL}/d28d/challenges`, {
    tags: { name: 'GET /d28d/challenges' },
    headers: jsonHeaders(token),
  }), { 'challenges 200': (r) => r.status === 200 || r.status === 401 });

  sleep(0.2);
}
