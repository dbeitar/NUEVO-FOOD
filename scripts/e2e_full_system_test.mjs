#!/usr/bin/env node
/**
 * Prueba E2E real: creación de alimentos, rutina, plan nutricional, clase live, licencias.
 * Uso: node scripts/e2e_full_system_test.mjs [BASE_URL]
 */
const BASE = (process.argv[2] || process.env.API_BASE || 'http://localhost:3002/api').replace(/\/$/, '');
const PASS = process.env.SEED_PASSWORD || 'Demo!2026';

const results = [];
let failed = 0;

function ok(name) {
  results.push({ name, status: 'OK' });
  console.log(`✓ ${name}`);
}
function fail(name, detail) {
  failed += 1;
  results.push({ name, status: 'FAIL', detail });
  console.error(`✗ ${name}: ${detail}`);
}

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
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function login(email) {
  const { status, json } = await req('POST', '/auth/login', {
    body: { email, password: PASS },
  });
  if (status !== 200 || !json?.token) {
    throw new Error(`Login ${email}: ${status} ${JSON.stringify(json)}`);
  }
  return json.token;
}

async function main() {
  console.log(`\n=== E2E MVPFOOD @ ${BASE} ===\n`);

  const { status: h } = await req('GET', '/health');
  if (h !== 200) return fail('health', String(h));

  ok('health');

  const superTok = await login('admin@d28d.local');
  const foodTok = await login('food.admin@d28d.local');
  const coachTok = await login('coach.admin@d28d.local');
  const userTok = await login('final.d28d@d28d.local');

  // Licencias
  const lic = await req('GET', '/licenses/me', { token: userTok });
  if (lic.status === 200 && lic.json?.data?.module_access?.d28d) ok('licencias usuario final');
  else fail('licencias', JSON.stringify(lic.json));

  // Alimento
  const ts = Date.now();
  const food = await req('POST', '/foods', {
    token: foodTok,
    body: {
      nombre: `E2E Avena ${ts}`,
      categoria: 'Cereales',
      marca: 'E2E',
      cantidad: 100,
      unidad: 'g',
      calorias: 380,
      proteina: 13,
      carbohidratos: 66,
      grasas: 7,
    },
  });
  if (food.status === 201 || food.status === 200) ok('crear alimento');
  else fail('crear alimento', `${food.status} ${JSON.stringify(food.json)}`);

  // Plan nutricional (usuario final)
  const users = await req('GET', '/admin/users', { token: superTok });
  const finalUser = (users.json?.data || []).find((u) => u.email === 'final.d28d@d28d.local');
  const uid = finalUser?.id;
  if (!uid) fail('resolver user id', 'no final.d28d');
  else {
    const nutri = await req('PUT', `/plan/${uid}`, {
      token: coachTok,
      body: {
        calorias_objetivo: 2200,
        proteina_g: 150,
        carbohidratos_g: 220,
        grasas_g: 70,
        notas: `Plan E2E ${ts}`,
      },
    });
    if (nutri.status === 200) ok('plan nutricional asignado');
    else fail('plan nutricional', `${nutri.status} ${JSON.stringify(nutri.json)}`);

    const mine = await req('GET', '/plan/mine', { token: userTok });
    if (mine.status === 200) ok('usuario lee su plan (GET /plan/mine)');
    else fail('plan mine', String(mine.status));
  }

  // Rutina entrenamiento
  if (uid) {
    const routine = await req('POST', '/training/admin/plans', {
      token: coachTok,
      body: {
        user_id: uid,
        level: 'intermedio',
        method: 'hipertrofia',
        split_type: 'upper_lower',
        dias: [
          {
            dia: 1,
            nombre: 'E2E Día 1',
            ejercicios: [
              {
                exercise_name: 'Sentadilla E2E',
                sets: 4,
                reps: 10,
                rest_seconds: 90,
              },
            ],
          },
        ],
      },
    });
    if (routine.status === 201 && routine.json?.data?.id) {
      ok('crear rutina/plantilla entrenamiento');
      const planId = routine.json.data.id;
      const getP = await req('GET', `/training/admin/plans/${planId}`, { token: coachTok });
      if (getP.status === 200) ok('leer rutina creada');
      else fail('leer rutina', String(getP.status));
    } else fail('crear rutina', `${routine.status} ${JSON.stringify(routine.json)}`);
  }

  // Clase live (admin d28d)
  const d28dTok = await login('d28d.admin@d28d.local');
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();
  const live = await req('POST', '/live-classes/admin', {
    token: d28dTok,
    body: {
      title: `E2E Clase ${ts}`,
      zoom_link: 'https://zoom.us/j/e2etest',
      start_time: start,
      end_time: end,
      source_module: 'd28d',
      coach: 'Alejo',
      capacity: 40,
    },
  });
  if (live.status === 201) ok('crear clase en vivo D28D');
  else fail('crear clase live', `${live.status} ${JSON.stringify(live.json)}`);

  // Programas D28D
  const progs = await req('GET', '/programs', { token: d28dTok });
  if (progs.status === 200 && (progs.json?.data?.length || 0) > 0) ok('listar programas D28D');
  else fail('programas', String(progs.status));

  // Ciclos
  const cycles = await req('GET', '/cycles', { token: d28dTok });
  if (cycles.status === 200) ok('listar ciclos');
  else fail('ciclos', String(cycles.status));

  // Food log usuario
  const foodPayload = food.json?.data;
  const foodId = foodPayload?.id ?? (food.status === 201 || food.status === 200 ? foodPayload : null);
  if (foodId) {
    const today = new Date().toISOString().slice(0, 10);
    const fl = await req('POST', '/food-log', {
      token: userTok,
      body: {
        foodId: Number(foodId),
        cantidadConsumida: 50,
        comida: 'desayuno',
        fecha: today,
      },
    });
    if (fl.status === 201 || fl.status === 200) ok('registro diario alimentación');
    else fail('food log', `${fl.status} ${JSON.stringify(fl.json)}`);
  }

  // Payment links
  const pay = await req('GET', '/payment-links/public');
  if (pay.status === 200) ok('payment links public');

  // Fase 1 host
  try {
    const hostTok = await login('host.d28d@d28d.local');
    const hostLive = await req('GET', '/live-classes/admin', { token: hostTok });
    if (hostLive.status === 200) ok('entrenador_d28d ve clases');
    const hostCreate = await req('POST', '/live-classes/admin', {
      token: hostTok,
      body: { title: 'X', zoom_link: 'https://z', start_time: start, end_time: end },
    });
    if (hostCreate.status === 403) ok('entrenador_d28d no crea clases');
    else fail('entrenador_d28d create', String(hostCreate.status));
  } catch (e) {
    fail('entrenador_d28d', e.message);
  }

  console.log(`\n=== Resumen: ${results.length - failed}/${results.length} OK ===\n`);
  if (failed > 0) {
    console.table(results.filter((r) => r.status === 'FAIL'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
