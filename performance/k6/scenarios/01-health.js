/**
 * ESCENARIO 1 — Health check
 * 100 VUs, 5 min
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, scaleDuration, scaleVus, THRESHOLDS_HEALTH } from '../lib/config.js';

export const options = {
  scenarios: {
    health: {
      executor: 'constant-vus',
      vus: scaleVus(100),
      duration: scaleDuration(5),
    },
  },
  thresholds: THRESHOLDS_HEALTH,
  tags: { scenario: '01-health' },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`, { tags: { name: 'GET /health' } });
  check(res, {
    'status 200': (r) => r.status === 200,
    'body ok': (r) => {
      try {
        return r.json('status') === 'ok';
      } catch {
        return false;
      }
    },
  });
  sleep(0.1);
}
