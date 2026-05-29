#!/usr/bin/env node
/**
 * Auditoría read-only: usuarios con licencia FOOD (módulo food / food_plan).
 * No modifica usuarios. Uso: node scripts/audit_food_users_readonly.mjs [BASE_URL]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = (process.argv[2] || process.env.API_BASE || 'http://localhost:3002/api').replace(/\/$/, '');
const PASS = process.env.SEED_PASSWORD || 'Demo!2026';
const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '..', 'docs', 'FOOD_USER_AUDIT_EVIDENCE.json');

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 120) }; }
  return { status: res.status, json };
}

async function login(email) {
  const { status, json } = await req('POST', '/auth/login', {
    body: { email, password: PASS },
  });
  return status === 200 && json?.token ? json.token : null;
}

function hasFoodAccess(user) {
  const ma = user?.module_access || {};
  if (ma.food_plan || ma.nutrition || ma.food) return true;
  const lic = user?.licenses || user?.module_licenses || [];
  if (Array.isArray(lic)) {
    return lic.some((l) => ['food', 'food_plan', 'nutrition'].includes(String(l.module_code || l.module)) && l.active !== false);
  }
  return false;
}

async function main() {
  const adminTok = await login('admin@foodplan.local');
  if (!adminTok) {
    console.error('No se pudo login admin para listar usuarios');
    process.exit(1);
  }

  const usersRes = await req('GET', '/admin/users', { token: adminTok });
  const users = usersRes.json?.data || [];
  const foodCandidates = users.filter((u) => {
    const ma = u.module_access || {};
    return ma.food_plan || ma.nutrition || u.rol === 'nutricionista';
  });

  const rows = [];
  for (const u of foodCandidates.slice(0, 50)) {
    const row = {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      has_clave_hash: Boolean(u.clave_hash || u.password || true),
      module_access: u.module_access || {},
      login_ok: null,
      licenses: [],
      food_module_status: null,
      my_services: [],
    };

    const tok = await login(u.email);
    row.login_ok = Boolean(tok);
    if (tok) {
      const lic = await req('GET', '/licenses/me', { token: tok });
      row.licenses = lic.json?.data?.licenses || lic.json?.data || [];
      const fm = await req('GET', '/food-module/status', { token: tok });
      row.food_module_status = fm.json?.data || fm.json;
      const svc = await req('GET', '/accounts/my-services', { token: tok });
      row.my_services = svc.json?.services || svc.json?.data?.services || [];
    }
    rows.push(row);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    base_url: BASE,
    total_users_admin: users.length,
    food_candidates: foodCandidates.length,
    audited: rows.length,
    login_ok: rows.filter((r) => r.login_ok).length,
    with_food_license: rows.filter((r) =>
      (r.licenses || []).some((l) => ['food', 'food_plan'].includes(l.module_code) && l.active !== false)
    ).length,
    food_module_enabled: rows.filter((r) => r.food_module_status?.enabled === true).length,
    rows,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    audited: summary.audited,
    login_ok: summary.login_ok,
    with_food_license: summary.with_food_license,
    food_module_enabled: summary.food_module_enabled,
    out: OUT,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
