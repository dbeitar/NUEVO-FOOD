import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 50 },  // Ramp-up
    { duration: '2h', target: 50 },  // Soak for 2 hours
    { duration: '5m', target: 0 },   // Ramp-down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api';

export default function () {
  // Enfocado en endpoints que devuelven listas grandes de datos (posible fuga de memoria en procesamiento)
  const responses = http.batch([
    ['GET', `${BASE_URL}/foods?pageSize=50`],
    ['GET', `${BASE_URL}/recipes`],
    ['GET', `${BASE_URL}/training/plans`],
  ]);

  check(responses[0], { 'foods loaded': (r) => r.status === 200 });
  
  sleep(5); // Espera más larga entre ciclos para monitorear el GC (Garbage Collector)
}
