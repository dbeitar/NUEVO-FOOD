import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Normal load
    { duration: '2m', target: 200 }, // Heavy load
    { duration: '2m', target: 500 }, // Stressing it
    { duration: '2m', target: 1000 },// Breaking point hunt
    { duration: '1m', target: 0 },   // Cool down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

export default function () {
  const res = http.get(`${BASE_URL}/foods`);
  check(res, {
    'is status 200': (r) => r.status === 200,
    'load time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(0.5);
}
