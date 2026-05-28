/**
 * ESCENARIO 2 — Login + perfil + dashboard
 * 500 VUs, 10 min
 */
import { sleep } from 'k6';
import { scaleDuration, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowLoginDashboard } from '../lib/flows.js';

export const options = {
  scenarios: {
    login: {
      executor: 'constant-vus',
      vus: scaleVus(500),
      duration: scaleDuration(10),
    },
  },
  thresholds: {
    ...THRESHOLDS_DEFAULT,
    'http_req_duration{name:POST /auth/login}': ['p(95)<2000', 'p(99)<5000'],
  },
  tags: { scenario: '02-login' },
};

export default function () {
  flowLoginDashboard(__VU);
  sleep(0.5);
}
