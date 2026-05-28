import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders } from './config.js';
import { login, getProfile } from './auth.js';
import { pickUser } from './users.js';
import { sessionUser, sessionAdmin } from './session.js';

export function flowUsuarioFinal(vu) {
  const token = sessionUser(vu);
  if (!token) return { ok: false };

  check(http.get(`${BASE_URL}/accounts/my-services`, {
    tags: { name: 'GET /accounts/my-services' },
    headers: jsonHeaders(token),
  }), { 'my-services 200': (r) => r.status === 200 });

  check(http.get(`${BASE_URL}/d28d/progress/me`, {
    tags: { name: 'GET /d28d/progress/me' },
    headers: jsonHeaders(token),
  }), { 'progress 200': (r) => r.status === 200 || r.status === 403 });

  check(http.get(`${BASE_URL}/d28d/challenges`, {
    tags: { name: 'GET /d28d/challenges' },
    headers: jsonHeaders(token),
  }), { 'challenges 200': (r) => r.status === 200 });

  check(http.get(`${BASE_URL}/faq/d28d/search?q=reto`, {
    tags: { name: 'GET /faq/d28d/search' },
  }), { 'faq 200': (r) => r.status === 200 });

  check(http.post(
    `${BASE_URL}/help/ask`,
    JSON.stringify({ modulo: 'd28d', query: 'reto participar' }),
    { tags: { name: 'POST /help/ask' }, headers: jsonHeaders(token) },
  ), { 'help 200': (r) => r.status === 200 });

  check(getProfile(token), { 'profile 200': (r) => r.status === 200 });
  sleep(0.3);
  return { ok: true };
}

export function flowD28d(vu) {
  const token = sessionUser(vu);
  if (!token) return;

  check(http.get(`${BASE_URL}/live-classes`, {
    tags: { name: 'GET /live-classes' },
    headers: jsonHeaders(token),
  }), { 'live-classes 200': (r) => r.status === 200 });

  check(http.get(`${BASE_URL}/d28d/challenges`, {
    tags: { name: 'GET /d28d/challenges' },
    headers: jsonHeaders(token),
  }), { 'challenges 200': (r) => r.status === 200 });

  check(http.get(`${BASE_URL}/d28d/progress/me`, {
    tags: { name: 'GET /d28d/progress/me' },
    headers: jsonHeaders(token),
  }), { 'progress 200': (r) => r.status === 200 || r.status === 403 });

  check(http.get(`${BASE_URL}/ecosystem/overview`, {
    tags: { name: 'GET /ecosystem/overview' },
    headers: jsonHeaders(token),
  }), { 'overview 200': (r) => r.status === 200 });

  sleep(0.4);
}

export function flowTraining(vu) {
  const token = sessionUser(vu);
  if (!token) return;

  check(http.get(`${BASE_URL}/training/my-current-plan`, {
    tags: { name: 'GET /training/my-current-plan' },
    headers: jsonHeaders(token),
  }), { 'plan 200': (r) => r.status === 200 || r.status === 404 });

  check(http.get(`${BASE_URL}/training/gallery`, {
    tags: { name: 'GET /training/gallery' },
    headers: jsonHeaders(token),
  }), { 'gallery 200': (r) => r.status === 200 });

  check(http.get(`${BASE_URL}/training/progress/traffic-light/me`, {
    tags: { name: 'GET /training/progress/traffic-light/me' },
    headers: jsonHeaders(token),
  }), { 'traffic-light 200': (r) => r.status === 200 || r.status === 403 });

  check(http.get(`${BASE_URL}/ecosystem/overview`, {
    tags: { name: 'GET /ecosystem/overview' },
    headers: jsonHeaders(token),
  }), { 'overview 200': (r) => r.status === 200 });

  sleep(0.4);
}

export function flowCommunication(vu) {
  const userTok = sessionUser(vu);
  const adminTok = sessionAdmin(vu);
  if (!userTok) return;

  check(http.get(`${BASE_URL}/communications/support`, {
    tags: { name: 'GET /communications/support' },
    headers: jsonHeaders(userTok),
  }), { 'support 200': (r) => r.status === 200 });

  check(http.post(`${BASE_URL}/communications/whatsapp/click`, null, {
    tags: { name: 'POST /communications/whatsapp/click' },
    headers: jsonHeaders(userTok),
  }), { 'whatsapp click 200/204': (r) => r.status === 200 || r.status === 204 });

  if (adminTok) {
    check(http.get(`${BASE_URL}/communications/logs?limit=20`, {
      tags: { name: 'GET /communications/logs' },
      headers: jsonHeaders(adminTok),
    }), { 'comm logs 200': (r) => r.status === 200 });

    check(http.get(`${BASE_URL}/platform/audit?modulo=d28d&limit=10`, {
      tags: { name: 'GET /platform/audit' },
      headers: jsonHeaders(adminTok),
    }), { 'platform audit 200': (r) => r.status === 200 });
  }

  check(http.get(`${BASE_URL}/accounts/me`, {
    tags: { name: 'GET /accounts/me' },
    headers: jsonHeaders(userTok),
  }), { 'accounts me 200': (r) => r.status === 200 || r.status === 404 });

  sleep(0.5);
}

/** Scenario 2 — fresh login each iteration (auth path + rate limit) */
export function flowLoginDashboard(vu) {
  const fresh = login(pickUser(vu));
  if (!fresh) return;
  check(getProfile(fresh), { 'profile 200': (r) => r.status === 200 });
  check(http.get(`${BASE_URL}/ecosystem/overview`, {
    tags: { name: 'GET /ecosystem/overview' },
    headers: jsonHeaders(fresh),
  }), { 'overview 200': (r) => r.status === 200 });
  check(http.get(`${BASE_URL}/licenses/me`, {
    tags: { name: 'GET /licenses/me' },
    headers: jsonHeaders(fresh),
  }), { 'licenses 200': (r) => r.status === 200 });
  sleep(0.2);
}
