#!/usr/bin/env node
/**
 * E2E Communication Center — ejecutar con backend en :3002
 * node scripts/test_communication_e2e.mjs
 */
const BASE = (process.argv[2] || process.env.API_BASE || 'http://localhost:3002/api').replace(/\/$/, '');
const PASS = process.env.SEED_PASSWORD || 'Demo!2026';

const results = [];

function ok(name, detail = '') {
  results.push({ name, status: 'OK', detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, status: 'FAIL', detail });
  console.error(`✗ ${name}: ${detail}`);
}

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

async function main() {
  console.log(`\n=== Communication E2E @ ${BASE} ===\n`);

  const sa = await req('POST', '/auth/login', { body: { email: 'admin@foodplan.local', password: PASS } });
  const saTok = sa.json?.token;
  if (sa.status !== 200 || !saTok) return fail('login super_admin', String(sa.status));

  ok('login super_admin');

  const uniq = Date.now();

  // Registro D28D
  const regD = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E D28D',
      email: `e2e.d28d.${uniq}@foodplan.local`,
      password: PASS,
      module_access: { d28d: true, live_classes: true, d28d_program: 'virtual_d28d' },
    },
  });
  if (regD.status === 201) ok('register D28D', String(regD.status));
  else fail('register D28D', `${regD.status} ${JSON.stringify(regD.json)}`);
  const d28dUserId = regD.json?.user?.id;

  const regF = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Food',
      email: `e2e.food.${uniq}@foodplan.local`,
      password: PASS,
      module_access: { food_plan: true, nutrition: true },
    },
  });
  if (regF.status === 201) ok('register Food', String(regF.status));
  else fail('register Food', `${regF.status}`);

  const regT = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Training',
      email: `e2e.train.${uniq}@foodplan.local`,
      password: PASS,
      module_access: { training: true },
    },
  });
  if (regT.status === 201) ok('register Training', String(regT.status));
  else fail('register Training', `${regT.status}`);

  const lReg = await req('GET', '/communications/logs?evento=user.registered', { token: saTok });
  if (lReg.status === 200 && (lReg.json?.data?.total || 0) > 0) {
    ok('event user.registered', `total=${lReg.json.data.total}`);
  } else {
    fail('event user.registered', `total=${lReg.json?.data?.total}`);
  }

  // Templates API
  const gt = await req('GET', '/communications/templates', { token: saTok });
  if (gt.status === 200) ok('GET templates', String(gt.status));
  else fail('GET templates', String(gt.status));

  const pt = await req('POST', '/communications/templates', {
    token: saTok,
    body: {
      nombre: `E2E TPL ${uniq}`,
      evento: 'payment.approved',
      modulo: 'd28d',
      canal: 'in_app',
      contenido: 'Pago OK',
      activo: true,
    },
  });
  if (pt.status === 201) ok('POST template', String(pt.status));
  else fail('POST template', String(pt.status));

  // Plantilla email para registro (prueba MailService real)
  await req('POST', '/communications/templates', {
    token: saTok,
    body: {
      nombre: `E2E EMAIL REGISTER ${uniq}`,
      evento: 'user.registered',
      modulo: 'd28d',
      canal: 'email',
      asunto: 'Bienvenido {{user.nombre}}',
      contenido: '<p>Hola {{user.nombre}}, tu registro fue exitoso.</p><p>Fecha: {{now}}</p>',
      activo: true,
    },
  });

  // WhatsApp plan persist
  const waPut = await req('PUT', '/accounts/plans/Entrenadores%20Pro', {
    token: saTok,
    body: {
      support_whatsapp: '573192635819',
      support_name: 'Soporte Entrenadores',
      support_message: 'Hola, necesito soporte de mi cuenta de entrenador.',
      support_activo: true,
    },
  });
  const plans = await req('GET', '/accounts/plans?kind=training');
  const p0 = Array.isArray(plans.json) ? plans.json[0] : null;
  if (waPut.status === 200 && p0?.support_whatsapp) {
    ok('WhatsApp plan persist', p0.support_whatsapp);
  } else {
    fail('WhatsApp plan persist', `${waPut.status} wa=${p0?.support_whatsapp}`);
  }

  // Payment approved — create pending account first via register + accounts
  const buyer = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Buyer',
      email: `e2e.buyer.${uniq}@foodplan.local`,
      password: PASS,
      module_access: { d28d: true },
    },
  });
  let buyerTok = null;
  if (buyer.status === 201) {
    const bl = await req('POST', '/auth/login', {
      body: { email: `e2e.buyer.${uniq}@foodplan.local`, password: PASS },
    });
    buyerTok = bl.json?.token;
    const acc = await req('POST', '/accounts', {
      token: buyerTok,
      body: {
        plan: 'Entrenadores Pro',
        metodoPago: 'pago_sede',
        module_code: 'training',
      },
    });
    if (acc.status === 201) {
      const accId = acc.json?.account?.id;
      const pay = await req('POST', `/payment-admin/confirm/${accId}`, {
        token: saTok,
        body: { days: 30, module_code: 'training' },
      });
      if (pay.status === 200) ok('payment.approved', String(pay.status));
      else fail('payment.approved', `${pay.status} ${JSON.stringify(pay.json)}`);

      const buyer2 = await req('POST', '/auth/register', {
        body: {
          nombre: 'E2E Reject',
          email: `e2e.reject.${uniq}@foodplan.local`,
          password: PASS,
          module_access: { food_plan: true },
        },
      });
      if (buyer2.status === 201) {
        const bl2 = await req('POST', '/auth/login', {
          body: { email: `e2e.reject.${uniq}@foodplan.local`, password: PASS },
        });
        const acc2 = await req('POST', '/accounts', {
          token: bl2.json?.token,
          body: { plan: 'Entrenadores Pro', metodoPago: 'pago_sede', module_code: 'training' },
        });
        const acc2Id = acc2.json?.account?.id;
        if (acc2Id) {
          const rej = await req('POST', `/payment-admin/reject/${acc2Id}`, {
            token: saTok,
            body: { module_code: 'training', reason: 'e2e test reject' },
          });
          if (rej.status === 200) ok('payment.rejected', String(rej.status));
          else fail('payment.rejected', String(rej.status));
        }
      }
    } else {
      fail('create pending account', `${acc.status} ${JSON.stringify(acc.json)}`);
    }
  }

  const lPayRej = await req('GET', '/communications/logs?evento=payment.rejected', { token: saTok });
  if (lPayRej.status === 200 && (lPayRej.json?.data?.total || 0) > 0) {
    ok('log payment.rejected', `total=${lPayRej.json.data.total}`);
  } else {
    fail('log payment.rejected', `total=${lPayRej.json?.data?.total}`);
  }

  // Registro pareja (titular activo + redeem)
  await req('PUT', '/accounts/plans/Entrenadores%20Pro', {
    token: saTok,
    body: { is_couple: true },
  });
  const regP1 = await req('POST', '/auth/register', {
    body: {
      nombre: 'E2E Pareja Titular',
      email: `e2e.couple1.${uniq}@foodplan.local`,
      password: PASS,
      module_access: { food_plan: true },
    },
  });
  if (regP1.status === 201) {
    const p1Login = await req('POST', '/auth/login', {
      body: { email: `e2e.couple1.${uniq}@foodplan.local`, password: PASS },
    });
    const p1Tok = p1Login.json?.token;
    const p1Acc = await req('POST', '/accounts', {
      token: p1Tok,
      body: { plan: 'Entrenadores Pro', metodoPago: 'transferencia', module_code: 'training' },
    });
    const coupleCode = p1Acc.json?.account?.couple_invite_code;
    const regP2 = await req('POST', '/auth/register', {
      body: {
        nombre: 'E2E Pareja Invitado',
        email: `e2e.couple2.${uniq}@foodplan.local`,
        password: PASS,
        module_access: { food_plan: true },
      },
    });
    if (regP2.status === 201 && coupleCode) {
      const p2Login = await req('POST', '/auth/login', {
        body: { email: `e2e.couple2.${uniq}@foodplan.local`, password: PASS },
      });
      const redeem = await req('POST', '/accounts/couple/redeem', {
        token: p2Login.json?.token,
        body: { couple_code: coupleCode },
      });
      if (redeem.status === 201) ok('register pareja redeem', String(redeem.status));
      else fail('register pareja redeem', `${redeem.status} ${JSON.stringify(redeem.json)}`);
    } else {
      fail('register pareja', `code=${coupleCode} reg2=${regP2.status}`);
    }
  } else {
    fail('register pareja titular', String(regP1.status));
  }
  await req('PUT', '/accounts/plans/Entrenadores%20Pro', {
    token: saTok,
    body: { is_couple: false },
  });

  const lPay = await req('GET', '/communications/logs?evento=payment.approved', { token: saTok });
  if (lPay.status === 200 && (lPay.json?.data?.total || 0) > 0) {
    ok('log payment.approved', `total=${lPay.json.data.total}`);
  } else {
    fail('log payment.approved', `total=${lPay.json?.data?.total}`);
  }

  // Class scheduled + time_changed
  const d28 = await req('POST', '/auth/login', {
    body: { email: 'admin.d28d@foodplan.local', password: PASS },
  });
  const d28Tok = d28.json?.token;
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 90000000).toISOString();
  const cls = await req('POST', '/live-classes/admin', {
    token: d28Tok,
    body: {
      title: `E2E Class ${uniq}`,
      zoom_link: 'https://zoom.us/j/e2e',
      start_time: start,
      end_time: end,
      source_module: 'd28d',
      program_id: 'virtual_d28d',
      coach: 'Coach',
      capacity: 40,
    },
  });
  const classId = cls.json?.data?.id;
  if (cls.status === 201) ok('class scheduled', String(cls.status));
  else fail('class scheduled', String(cls.status));

  if (classId) {
    const start2 = new Date(Date.now() + 86500000).toISOString();
    const end2 = new Date(Date.now() + 90100000).toISOString();
    await req('PUT', `/live-classes/admin/${classId}`, {
      token: d28Tok,
      body: { start_time: start2, end_time: end2 },
    });
    const lTc = await req('GET', '/communications/logs?evento=d28d.class.time_changed', { token: saTok });
    if (lTc.status === 200 && (lTc.json?.data?.total || 0) > 0) {
      ok('d28d.class.time_changed', `total=${lTc.json.data.total}`);
    } else {
      fail('d28d.class.time_changed', `total=${lTc.json?.data?.total}`);
    }
  }

  const waClick = await req('POST', '/communications/whatsapp/click', {
    token: saTok,
    body: { plan_nombre: 'D28D Virtual - Básico', whatsapp: '573192635819', message: 'Hola' },
  });
  if (waClick.status === 200) ok('whatsapp click', String(waClick.status));
  else fail('whatsapp click', String(waClick.status));

  const support = await req('GET', '/communications/support', { token: saTok });
  if (support.status === 200 && support.json?.data?.wa_url?.includes('wa.me')) {
    ok('wa.me url', support.json.data.wa_url);
  } else {
    fail('wa.me url', JSON.stringify(support.json));
  }

  // Email test (requiere provider configurado)
  const testTo = process.env.TEST_EMAIL_TO;
  if (testTo) {
    const tmail = await req('POST', '/communications/email/test', {
      token: saTok,
      body: { to: testTo, evento: 'user.registered', modulo: 'd28d' },
    });
    if (tmail.status === 200) ok('email test sent', String(tmail.status));
    else fail('email test sent', `${tmail.status} ${JSON.stringify(tmail.json)}`);
  } else {
    ok('email test skipped', 'set TEST_EMAIL_TO to validate provider delivery');
  }

  // Jobs diarios: forzar una licencia a expirar en 7 días y ejecutar job
  if (d28dUserId) {
    const until7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const putLic = await req('PUT', `/licenses/user/${d28dUserId}`, {
      token: saTok,
      body: {
        module_access: { d28d: true, live_classes: true, d28d_program: 'virtual_d28d' },
        license_meta: { d28d: { valid_until: until7 } },
      },
    });
    if (putLic.status === 200) ok('set license valid_until+7', until7);
    else fail('set license valid_until+7', `${putLic.status} ${JSON.stringify(putLic.json)}`);

    const runJobs = await req('POST', '/communications/jobs/run', { token: saTok });
    if (runJobs.status === 200) ok('run daily jobs', String(runJobs.status));
    else fail('run daily jobs', `${runJobs.status} ${JSON.stringify(runJobs.json)}`);

    const exp = await req('GET', '/communications/logs?evento=license.expiring&limit=5', { token: saTok });
    if (exp.status === 200 && (exp.json?.data?.total || 0) > 0) ok('event license.expiring', `total=${exp.json.data.total}`);
    else fail('event license.expiring', `total=${exp.json?.data?.total}`);
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log(`\n=== ${results.length - failed.length}/${results.length} OK ===\n`);
  if (failed.length) {
    console.table(failed);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
