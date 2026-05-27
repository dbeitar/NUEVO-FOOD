import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, jsonHeaders, PASSWORD } from './config.js';

export function login(email, password = PASSWORD) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { tags: { name: 'POST /auth/login' }, headers: jsonHeaders() },
  );
  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        return !!r.json('token');
      } catch {
        return false;
      }
    },
  });
  if (!ok) return null;
  return res.json('token');
}

export function getProfile(token) {
  return http.get(`${BASE_URL}/auth/profile`, {
    tags: { name: 'GET /auth/profile' },
    headers: jsonHeaders(token),
  });
}

export function logout(token) {
  return http.post(`${BASE_URL}/auth/logout`, null, {
    tags: { name: 'POST /auth/logout' },
    headers: jsonHeaders(token),
  });
}
