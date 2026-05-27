/**
 * ESCENARIO 5 — Training
 * 1000 VUs, 15 min
 */
import { sleep } from 'k6';
import { scaleDuration, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowTraining } from '../lib/flows.js';

export const options = {
  scenarios: {
    training: {
      executor: 'constant-vus',
      vus: scaleVus(1000),
      duration: scaleDuration(15),
    },
  },
  thresholds: THRESHOLDS_DEFAULT,
  tags: { scenario: '05-training' },
};

export default function () {
  flowTraining(__VU);
  sleep(0.5);
}
