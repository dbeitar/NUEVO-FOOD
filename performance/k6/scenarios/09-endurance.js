/**
 * ESCENARIO 9 — Endurance test
 * 500 VUs constant, 24h (full) — use K6_PROFILE=smoke for 15m sample
 */
import { sleep } from 'k6';
import { PROFILE, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowUsuarioFinal } from '../lib/flows.js';

const duration = PROFILE === 'smoke' ? '15m' : '24h';

export const options = {
  scenarios: {
    endurance: {
      executor: 'constant-vus',
      vus: scaleVus(500),
      duration,
    },
  },
  thresholds: {
    ...THRESHOLDS_DEFAULT,
    http_req_failed: ['rate<0.03'],
  },
  tags: { scenario: '09-endurance' },
};

export default function () {
  flowUsuarioFinal(__VU);
  sleep(1);
}
