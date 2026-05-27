/**
 * ESCENARIO 7 — Stress test (ramp to 10k VUs)
 * Stages: 100 → 500 → 1000 → 2500 → 5000 → 10000
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, PROFILE, jsonHeaders } from '../lib/config.js';
import { sessionUser } from '../lib/session.js';

const stagesFull = [
  { duration: '2m', target: 100 },
  { duration: '3m', target: 500 },
  { duration: '3m', target: 1000 },
  { duration: '4m', target: 2500 },
  { duration: '4m', target: 5000 },
  { duration: '4m', target: 10000 },
  { duration: '2m', target: 0 },
];

const stagesSmoke = [
  { duration: '30s', target: 50 },
  { duration: '1m', target: 200 },
  { duration: '1m', target: 500 },
  { duration: '30s', target: 0 },
];

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: PROFILE === 'smoke' ? stagesSmoke : stagesFull,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.25'],
  },
  tags: { scenario: '07-stress' },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`, { tags: { name: 'GET /health' } });
  check(res, { 'health ok': (r) => r.status === 200 });

  const token = sessionUser(__VU);
  if (token) {
    http.get(`${BASE_URL}/accounts/my-services`, {
      tags: { name: 'GET /accounts/my-services' },
      headers: jsonHeaders(token),
    });
  }
  sleep(0.15);
}
