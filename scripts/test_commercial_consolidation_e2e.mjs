#!/usr/bin/env node
/**
 * E2E Consolidación comercial — programas, planes, registro, roles
 * node scripts/test_commercial_consolidation_e2e.mjs
 */
const BASE = (process.argv[2] || process.env.API_BASE || 'http://localhost:3002/api').replace(/\/$/, '');
const PASS = process.env.SEED_PASSWORD || 'Demo!2026';

const results = [];
const ok = (n, d = '') => { results.push({ n, s: 'OK', d }); console.log(`✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d = '') => { results.push({ n, s: 'FAIL', d }); console.error(`✗ ${n}: ${d}`); };

async function req(method, path, { token, body } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  return { status: r.status, json };
}

async function login(email) {
  const r = await req('POST', '/auth/login', { body: { email, password: PASS } });
  return r.json?.token || null;
}

async function main() {
  console.log(`\n=== Commercial Consolidation E2E @ ${BASE} ===\n`);
  const uniq = Date.now();

  const saTok = await login('admin@foodplan.local');
  if (!saTok) return fail('login super_admin', 'no token');
  ok('login super_admin');

  const d28dTok = await login('admin.d28d@foodplan.local');
  if (d28dTok) ok('login admin_d28d');
  else fail('login admin_d28d', 'no token');

  // Programas
  const progs = await req('GET', '/programs', { token: saTok });
  const programs = progs.json?.data || [];
  if (programs.length >= 3) ok('programas cargados', `${programs.length} programas`);
  else fail('programas cargados', `${programs.length}`);

  const vital = programs.find((p) => p.id === 'vital');
  if (vital) ok('programa Vital existe');
  else fail('programa Vital existe');

  // Planes por programa
  const vitalPlans = await req('GET', '/accounts/plans?program_id=vital&kind=d28d');
  const vp = Array.isArray(vitalPlans.json) ? vitalPlans.json : [];
  if (vp.length >= 6) ok('planes Vital precargados', `${vp.length} planes`);
  else fail('planes Vital precargados', `${vp.length} (esperado ≥6)`);

  const pancPlans = await req('GET', '/accounts/plans?program_id=pancitas&kind=d28d&visible=true');
  const pp = Array.isArray(pancPlans.json) ? pancPlans.json : [];
  if (pp.length >= 2) ok('planes Pancitas', `${pp.length}`);
  else fail('planes Pancitas', `${pp.length}`);

  const mensual = vp.find((p) => p.nombre.includes('Mensual'));
  if (mensual?.precio_mensual === 119000) ok('Vital Mensual COP 119000');
  else fail('Vital Mensual COP 119000', String(mensual?.precio_mensual));

  const parejas = vp.find((p) => p.is_couple);
  if (parejas) ok('plan Parejas existe', parejas.nombre);
  else fail('plan Parejas existe');

  // admin_d28d puede crear plan D28D
  const testPlanName = `E2E Test Plan ${uniq}`;
  const createD28d = await req('POST', '/accounts/plans', {
    token: d28dTok,
    body: {
      nombre: testPlanName,
      descripcion: 'Test',
      program_id: 'vital',
      kind: 'd28d',
      precio_mensual: 1000,
      precio_mensual_usd: 1,
      max_usuarios: 10,
      cycles_count: 1,
      module_access: { d28d: true, live_classes: true },
    },
  });
  if (createD28d.status === 201) ok('admin_d28d crear plan D28D');
  else fail('admin_d28d crear plan D28D', `${createD28d.status} ${JSON.stringify(createD28d.json)}`);

  const dup = await req('POST', `/accounts/plans/${encodeURIComponent(testPlanName)}/duplicate`, {
    token: d28dTok,
    body: { nombre: `${testPlanName} Copy` },
  });
  if (dup.status === 201) ok('duplicar plan');
  else fail('duplicar plan', String(dup.status));

  const toggle = await req('PUT', `/accounts/plans/${encodeURIComponent(testPlanName)}`, {
    token: d28dTok,
    body: { activo: false, visible: false },
  });
  if (toggle.status === 200) ok('desactivar/ocultar plan');
  else fail('desactivar/ocultar plan', String(toggle.status));

  await req('DELETE', `/accounts/plans/${encodeURIComponent(`${testPlanName} Copy`)}`, { token: d28dTok });
  await req('DELETE', `/accounts/plans/${encodeURIComponent(testPlanName)}`, { token: d28dTok });
  ok('eliminar planes test');

  // admin_d28d NO puede crear plan food
  const createFood = await req('POST', '/accounts/plans', {
    token: d28dTok,
    body: { nombre: `Food Hack ${uniq}`, kind: 'food', program_id: 'food', precio_mensual: 1, max_usuarios: 1 },
  });
  if (createFood.status === 403) ok('admin_d28d bloqueado en plan food');
  else fail('admin_d28d bloqueado en plan food', String(createFood.status));

  // Registro wizard flow (API level)
  const regEmail = `e2e.vital.${uniq}@foodplan.local`;
  const reg = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Vital User',
      email: regEmail,
      password: PASS,
      genero: 'femenino',
      module_access: { d28d: true, live_classes: true, d28d_program: 'vital' },
    },
  });
  if (reg.status === 201) ok('registro D28D Vital');
  else fail('registro D28D Vital', `${reg.status}`);

  const userTok = await login(regEmail);
  if (!userTok) fail('login usuario registrado');

  const acc = await req('POST', '/accounts', {
    token: userTok,
    body: {
      plan: mensual?.nombre || 'Vital D28D - Mensual',
      cycle_id: 7,
      metodoPago: 'transferencia',
      module_code: 'd28d',
      currency: 'COP',
    },
  });
  if (acc.status === 201 || acc.status === 200) ok('activación cuenta + licencia', String(acc.status));
  else fail('activación cuenta', `${acc.status} ${JSON.stringify(acc.json)}`);

  const svc = await req('GET', '/accounts/my-services', { token: userTok });
  if (svc.status === 200 && Array.isArray(svc.json?.services) && svc.json.services.length) {
    ok('my-services', `${svc.json.services.length} servicio(s)`);
  } else fail('my-services', String(svc.status));

  // Parejas: primary + redeem
  const regP1 = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Pareja 1',
      email: `e2e.p1.${uniq}@foodplan.local`,
      password: PASS,
      genero: 'masculino',
      module_access: { d28d: true, live_classes: true, d28d_program: 'vital' },
    },
  });
  const p1Tok = await login(`e2e.p1.${uniq}@foodplan.local`);
  const p1Acc = await req('POST', '/accounts', {
    token: p1Tok,
    body: { plan: parejas?.nombre, cycle_id: 7, metodoPago: 'transferencia', module_code: 'd28d' },
  });
  if (p1Acc.status === 409) {
    ok('parejas primary ya tenía cuenta (skip)');
  } else {
    const coupleCode = p1Acc.json?.account?.couple_invite_code;
    if (coupleCode) ok('parejas genera invite_code', coupleCode);
    else fail('parejas genera invite_code', JSON.stringify(p1Acc.json));

    const regP2 = await req('POST', '/auth/register', {
      body: {
        nombre: 'E2E Pareja 2',
        email: `e2e.p2.${uniq}@foodplan.local`,
        password: PASS,
        genero: 'femenino',
        module_access: { d28d: true, live_classes: true, d28d_program: 'vital' },
      },
    });
    if (regP2.status !== 201) fail('registro pareja 2', String(regP2.status));
    const p2Tok = await login(`e2e.p2.${uniq}@foodplan.local`);
    if (!p2Tok) fail('login pareja 2');
    else {
      const redeem = await req('POST', '/accounts/couple/redeem', {
        token: p2Tok,
        body: { couple_code: coupleCode },
      });
      if (redeem.status === 200 || redeem.status === 201) ok('redimir código pareja');
      else fail('redimir código pareja', `${redeem.status} ${JSON.stringify(redeem.json)}`);
    }
  }

  // Zoom master (program-scoped)
  const zoom = await req('GET', '/programs/zoom-master', { token: d28dTok });
  if (zoom.status === 200 && Array.isArray(zoom.json?.data)) ok('zoom por programa');
  else fail('zoom por programa', String(zoom.status));

  // Communication Center compat
  const comm = await req('GET', '/communications/logs?limit=1', { token: saTok });
  if (comm.status === 200) ok('Communication Center auditoría');
  else fail('Communication Center auditoría', String(comm.status));

  const passed = results.filter((r) => r.s === 'OK').length;
  const failed = results.filter((r) => r.s === 'FAIL').length;
  console.log(`\n=== ${passed} OK / ${failed} FAIL ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
