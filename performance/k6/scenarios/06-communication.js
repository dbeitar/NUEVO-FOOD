/**
 * ESCENARIO 6 — Communication Center
 * 500 VUs, 10 min
 */
import { sleep } from 'k6';
import { scaleDuration, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowCommunication } from '../lib/flows.js';

export const options = {
  scenarios: {
    communication: {
      executor: 'constant-vus',
      vus: scaleVus(500),
      duration: scaleDuration(10),
    },
  },
  thresholds: {
    ...THRESHOLDS_DEFAULT,
    'http_req_duration{name:GET /communications/logs}': ['p(95)<4000'],
  },
  tags: { scenario: '06-communication' },
};

export default function () {
  flowCommunication(__VU);
  sleep(0.7);
}
