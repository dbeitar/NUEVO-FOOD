import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp-up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 },  // Ramp-down to 0 users
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

export default function () {
  // Simular flujo de usuario: Inicio -> Buscar Alimentos -> Ver Categorías
  const responses = http.batch([
    ['GET', `${BASE_URL}/health`],
    ['GET', `${BASE_URL}/foods/categories`],
    ['GET', `${BASE_URL}/foods/search?query=pollo`],
  ]);

  check(responses[0], { 'status is 200': (r) => r.status === 200 });
  
  sleep(1);
}
