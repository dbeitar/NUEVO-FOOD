/**
 * ESCENARIO 4 — D28D
 * 1000 VUs, 15 min
 */
import { sleep } from 'k6';
import { scaleDuration, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowD28d } from '../lib/flows.js';

export const options = {
  scenarios: {
    d28d: {
      executor: 'constant-vus',
      vus: scaleVus(1000),
      duration: scaleDuration(15),
    },
  },
  thresholds: THRESHOLDS_DEFAULT,
  tags: { scenario: '04-d28d' },
};

export default function () {
  flowD28d(__VU);
  sleep(0.5);
}
