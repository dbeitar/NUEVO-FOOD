/**
 * ESCENARIO 3 — Usuario final (flujo real)
 * 1000 VUs, 15 min
 */
import { sleep } from 'k6';
import { scaleDuration, scaleVus, THRESHOLDS_DEFAULT } from '../lib/config.js';
import { flowUsuarioFinal } from '../lib/flows.js';

export const options = {
  scenarios: {
    usuario_final: {
      executor: 'constant-vus',
      vus: scaleVus(1000),
      duration: scaleDuration(15),
    },
  },
  thresholds: THRESHOLDS_DEFAULT,
  tags: { scenario: '03-usuario-final' },
};

export default function () {
  flowUsuarioFinal(__VU);
  sleep(0.6);
}
