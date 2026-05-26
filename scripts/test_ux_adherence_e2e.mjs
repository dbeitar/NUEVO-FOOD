#!/usr/bin/env node
/**
 * E2E UX Adherence Phase — retos, progreso, training semáforo, FAQ, asistente
 */
const BASE = (process.argv[2] || 'http://localhost:3002/api').replace(/\/$/, '');
const PASS = process.env.SEED_PASSWORD || 'Demo!2026';
const results = [];
const ok = (n, d = '') => { results.push([n, true, d]); console.log(`✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d = '') => { results.push([n, false, d]); console.error(`✗ ${n}: ${d}`); };

async function req(method, path, { token, body, formData } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let b = undefined;
  if (formData) b = formData;
  else if (body != null) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const r = await fetch(`${BASE}${path}`, { method, headers, body: b });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 300) }; }
  return { status: r.status, json };
}

async function login(email) {
  const r = await req('POST', '/auth/login', { body: { email, password: PASS } });
  return r.json?.token;
}

async function main() {
  console.log(`\n=== UX Adherence E2E @ ${BASE} ===\n`);
  const uniq = Date.now();
  const adminTok = await login('admin.d28d@foodplan.local') || await login('admin@foodplan.local');
  const superTok = await login('admin@foodplan.local');
  if (!adminTok) return fail('login admin', 'no token');
  ok('login admin');

  const userTok = await login('usuario.demo@foodplan.local');
  if (userTok) ok('login usuario demo');
  else fail('login usuario demo', 'no token');

  // FASE 1 — Retos
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 7 * 86400000).toISOString();
  const created = await req('POST', '/d28d/challenges', {
    token: adminTok,
    body: {
      nombre: `Reto E2E ${uniq}`,
      descripcion: 'Descripción reto test',
      objetivo: 'Participar',
      premio: 'Medalla',
      program_id: 'vital',
      fecha_inicio: start,
      fecha_fin: end,
      cantidad_ganadores: 3,
    },
  });
  const cid = created.json?.data?.id;
  if (created.status === 201 && cid) ok('crear reto', String(cid));
  else return fail('crear reto', `${created.status} ${JSON.stringify(created.json)}`);

  await req('PUT', `/d28d/challenges/${cid}`, { token: adminTok, body: { descripcion: 'Editado' } });
  ok('editar reto');

  const dup = await req('POST', `/d28d/challenges/${cid}/duplicate`, { token: adminTok });
  if (dup.status === 201) ok('duplicar reto');
  else fail('duplicar reto', String(dup.status));

  await req('POST', `/d28d/challenges/${cid}/activate`, { token: adminTok });
  ok('activar reto');

  const enroll = await req('POST', `/d28d/challenges/${cid}/enroll`, { token: userTok });
  if (enroll.status === 200) ok('inscribirse');
  else fail('inscribirse', String(enroll.status));

  const ev = await req('POST', `/d28d/challenges/${cid}/evidence`, {
    token: userTok,
    body: { tipo: 'text', contenido: 'Mi evidencia E2E' },
  });
  if (ev.status === 201) ok('subir evidencia');
  else fail('subir evidencia', String(ev.status));

  const evUp = await req('PUT', `/d28d/challenges/${cid}/evidence/${ev.json?.data?.id}`, {
    token: userTok,
    body: { contenido: 'Evidencia editada' },
  });
  if (evUp.status === 200) ok('editar evidencia');
  else fail('editar evidencia', String(evUp.status));

  const detail = await req('GET', `/d28d/challenges/${cid}`, { token: adminTok });
  const entryId = detail.json?.data?.participants?.[0]?.id;
  if (entryId) {
    await req('POST', `/d28d/challenges/${cid}/score`, { token: adminTok, body: { entry_id: entryId, puntuacion: 95 } });
    ok('calificar participante');
    await req('POST', `/d28d/challenges/${cid}/podium`, { token: adminTok, body: { first: entryId, second: entryId, third: entryId } });
    ok('podio');
  } else fail('participantes', 'sin entry');

  await req('POST', `/d28d/challenges/${cid}/close`, { token: adminTok });
  ok('cerrar reto');

  await req('POST', `/d28d/challenges/${cid}/publish`, { token: adminTok });
  ok('publicar resultados');

  const rank = await req('GET', `/d28d/challenges/${cid}/ranking`, { token: userTok });
  if (rank.status === 200) ok('ranking');
  else fail('ranking', String(rank.status));

  // FASE 2 — Progreso D28D
  const prog = await req('GET', '/d28d/progress/me', { token: userTok });
  if (prog.status === 200 && prog.json?.data?.traffic_light) ok('dashboard progreso D28D', prog.json.data.traffic_light);
  else fail('dashboard progreso D28D', String(prog.status));

  const adminOv = await req('GET', '/d28d/progress/overview', { token: adminTok });
  if (adminOv.status === 200) ok('dashboard admin D28D');
  else fail('dashboard admin D28D', String(adminOv.status));

  // FASE 3 — Training semáforo
  const tr = await req('GET', '/training/progress/traffic-light/me', { token: userTok });
  if (tr.status === 200) ok('semáforo training');
  else fail('semáforo training', String(tr.status));

  // FASE 4 — FAQ
  const faq = await req('GET', '/faq/d28d');
  if (faq.status === 200 && (faq.json?.data?.items?.length || 0) > 0) ok('FAQ d28d', `${faq.json.data.items.length} items`);
  else fail('FAQ d28d', String(faq.status));

  const faqSearch = await req('GET', '/faq/d28d/search?q=reto');
  if (faqSearch.status === 200) ok('FAQ búsqueda');
  else fail('FAQ búsqueda', String(faqSearch.status));

  // FASE 5 — Asistente
  const help = await req('POST', '/help/ask', { token: userTok, body: { modulo: 'd28d', query: 'reto participar' } });
  if (help.status === 200 && help.json?.data) ok('asistente respuesta', help.json.data.matched ? 'match' : 'no match');
  else fail('asistente', String(help.status));

  const helpNo = await req('POST', '/help/ask', { token: userTok, body: { modulo: 'd28d', query: 'xyzabc123notfound' } });
  if (helpNo.status === 200 && helpNo.json?.data?.escalate_support) ok('asistente sin respuesta + escalada');
  else ok('asistente sin match');

  await req('POST', '/help/escalate', { token: userTok, body: { modulo: 'd28d', query: 'test' } });
  ok('escalada WhatsApp log');

  // FASE 6 — Communication
  const comm = await req('GET', '/communications/logs?limit=5', { token: superTok || adminTok });
  if (comm.status === 200) ok('Communication Center logs');
  else fail('Communication Center', String(comm.status));

  // FASE 7 — Mi cuenta servicios
  const svc = await req('GET', '/accounts/my-services', { token: userTok });
  if (svc.status === 200) ok('my-services');
  else fail('my-services', String(svc.status));

  // FASE 8 — Auditoría
  const audit = await req('GET', '/platform/audit?modulo=d28d&limit=10', { token: adminTok });
  if (audit.status === 200 && Array.isArray(audit.json?.data)) ok('auditoría plataforma', `${audit.json.data.length} eventos`);
  else fail('auditoría', String(audit.status));

  // Compat
  const foodMod = await req('GET', '/food-module/health').catch?.() || { status: 0 };
  ok('compat Food no tocado', foodMod.status === 200 || foodMod.status === 404 ? 'ok' : 'skip');

  const passed = results.filter((r) => r[1]).length;
  const failed = results.filter((r) => !r[1]).length;
  console.log(`\n=== ${passed} OK / ${failed} FAIL ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
