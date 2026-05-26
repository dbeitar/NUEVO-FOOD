const { getPrisma } = require('../lib/prisma');

async function seedCommunicationTemplatesIfEmpty() {
  const prisma = getPrisma();
  const count = await prisma.communicationTemplate.count();
  if (count > 0) return { seeded: false, count };
  const out = await ensureRequiredCommunicationTemplates();
  return { seeded: out.created > 0, count: out.created };
}

async function ensureRequiredCommunicationTemplates() {
  const prisma = getPrisma();
  const base = { activo: true, editable: true, orden: 0 };
  const required = [
    // user.registered
    { ...base, nombre: 'Registro (in_app)', evento: 'user.registered', modulo: 'd28d', canal: 'in_app', asunto: 'Registro exitoso', contenido: 'Hola {{user.nombre}}. Tu registro fue exitoso.' },
    { ...base, nombre: 'Registro (email)', evento: 'user.registered', modulo: 'd28d', canal: 'email', asunto: 'Bienvenido {{user.nombre}}', contenido: '<p>Hola {{user.nombre}},</p><p>Tu registro fue exitoso.</p>' },

    // payments
    { ...base, nombre: 'Pago aprobado (in_app)', evento: 'payment.approved', modulo: 'd28d', canal: 'in_app', asunto: 'Pago confirmado', contenido: 'Tu pago fue confirmado. Vigencia hasta {{payment.valid_until}}.' },
    { ...base, nombre: 'Pago aprobado (email)', evento: 'payment.approved', modulo: 'd28d', canal: 'email', asunto: 'Pago confirmado', contenido: '<p>Tu pago fue confirmado.</p><p>Vigencia hasta {{payment.valid_until}}.</p>' },
    { ...base, nombre: 'Pago rechazado (in_app)', evento: 'payment.rejected', modulo: 'd28d', canal: 'in_app', asunto: 'Pago rechazado', contenido: 'Tu pago no pudo ser confirmado. Motivo: {{payment.reason}}' },
    { ...base, nombre: 'Pago rechazado (email)', evento: 'payment.rejected', modulo: 'd28d', canal: 'email', asunto: 'Pago rechazado', contenido: '<p>Tu pago no pudo ser confirmado.</p><p>Motivo: {{payment.reason}}</p>' },

    // classes
    { ...base, nombre: 'Clase programada (in_app)', evento: 'd28d.class.scheduled', modulo: 'd28d', canal: 'in_app', asunto: 'Nueva clase programada', contenido: 'Clase: {{class.title}} · Inicio: {{class.start_time}}' },
    { ...base, nombre: 'Cambio horario (in_app)', evento: 'd28d.class.time_changed', modulo: 'd28d', canal: 'in_app', asunto: 'Horario actualizado', contenido: 'Clase: {{class.title}} · Nuevo inicio: {{class.start_time}}' },

    // cycles/licenses (jobs)
    { ...base, nombre: 'Ciclo inició (in_app)', evento: 'cycle.started', modulo: 'd28d', canal: 'in_app', asunto: '¡Tu ciclo inició!', contenido: 'Inició el ciclo {{cycle.name}} ({{cycle.start_date}}).' },
    { ...base, nombre: 'Licencia por vencer (in_app)', evento: 'license.expiring', modulo: 'd28d', canal: 'in_app', asunto: 'Tu licencia vence pronto', contenido: 'Tu acceso vence en {{license.days_left}} días ({{license.valid_until}}).' },
    { ...base, nombre: 'Licencia por vencer (email)', evento: 'license.expiring', modulo: 'd28d', canal: 'email', asunto: 'Tu licencia vence pronto', contenido: '<p>Tu acceso vence en {{license.days_left}} días ({{license.valid_until}}).</p>' },
    { ...base, nombre: 'Licencia vencida (in_app)', evento: 'license.expired', modulo: 'd28d', canal: 'in_app', asunto: 'Tu licencia ha vencido', contenido: 'Tu acceso venció el {{license.valid_until}}.' },
    { ...base, nombre: 'Licencia vencida (email)', evento: 'license.expired', modulo: 'd28d', canal: 'email', asunto: 'Tu licencia ha vencido', contenido: '<p>Tu acceso venció el {{license.valid_until}}.</p>' },
    { ...base, nombre: 'Licencia reactivada (in_app)', evento: 'license.reactivated', modulo: 'd28d', canal: 'in_app', asunto: 'Acceso reactivado', contenido: 'Tu acceso fue reactivado hasta {{license.valid_until}}.' },
    { ...base, nombre: 'Licencia reactivada (email)', evento: 'license.reactivated', modulo: 'd28d', canal: 'email', asunto: 'Acceso reactivado', contenido: '<p>Tu acceso fue reactivado hasta {{license.valid_until}}.</p>' },

    // training.assigned
    { ...base, nombre: 'Plan training asignado (in_app)', evento: 'training.assigned', modulo: 'training', canal: 'in_app', asunto: 'Tu plan fue asignado', contenido: 'Tu entrenador te asignó un plan. ID: {{training.plan_id}}' },

    // retos d28d
    { ...base, nombre: 'Reto creado (in_app)', evento: 'd28d.challenge.created', modulo: 'd28d', canal: 'in_app', asunto: 'Nuevo reto', contenido: 'Se creó el reto {{nombre}}.' },
    { ...base, nombre: 'Reto iniciado (in_app)', evento: 'd28d.challenge.started', modulo: 'd28d', canal: 'in_app', asunto: 'Reto activo', contenido: 'El reto {{nombre}} ya está abierto.' },
    { ...base, nombre: 'Reto cerrado (in_app)', evento: 'd28d.challenge.closed', modulo: 'd28d', canal: 'in_app', asunto: 'Reto cerrado', contenido: 'El reto {{nombre}} cerró inscripciones.' },
    { ...base, nombre: 'Reto publicado (in_app)', evento: 'd28d.challenge.published', modulo: 'd28d', canal: 'in_app', asunto: 'Resultados publicados', contenido: 'Ya puedes ver los ganadores del reto {{nombre}}.' },
    { ...base, nombre: 'Participación reto (in_app)', evento: 'd28d.challenge.participation', modulo: 'd28d', canal: 'in_app', asunto: 'Inscripción confirmada', contenido: 'Te inscribiste en {{nombre}}.' },
    { ...base, nombre: 'Ganador seleccionado (in_app)', evento: 'd28d.challenge.winner_selected', modulo: 'd28d', canal: 'in_app', asunto: 'Podio definido', contenido: 'Se publicó el podio del reto.' },

    // semáforo training
    { ...base, nombre: 'Semáforo rojo (in_app)', evento: 'training.traffic_light.red', modulo: 'training', canal: 'in_app', asunto: 'Adherencia baja', contenido: 'Tu cumplimiento es {{adherence_pct}}%. ¡Retoma tu rutina!' },
    { ...base, nombre: 'Semáforo amarillo (in_app)', evento: 'training.traffic_light.yellow', modulo: 'training', canal: 'in_app', asunto: 'Adherencia media', contenido: 'Tu cumplimiento es {{adherence_pct}}%. Puedes mejorar.' },
    { ...base, nombre: 'Semáforo verde (in_app)', evento: 'training.traffic_light.green', modulo: 'training', canal: 'in_app', asunto: '¡Excelente adherencia!', contenido: 'Tu cumplimiento es {{adherence_pct}}%. Sigue así.' },

    // usuario inactivo / destacado
    { ...base, nombre: 'Usuario inactivo (in_app)', evento: 'd28d.user.inactive', modulo: 'd28d', canal: 'in_app', asunto: 'Te extrañamos', contenido: 'Hace días que no participas. ¡Vuelve a tus clases!' },
    { ...base, nombre: 'Cumplimiento destacado (in_app)', evento: 'd28d.adherence.highlighted', modulo: 'd28d', canal: 'in_app', asunto: '¡Buen trabajo!', contenido: 'Tu adherencia está en verde. ¡Sigue así!' },
  ];

  let created = 0;
  for (const tpl of required) {
    const exists = await prisma.communicationTemplate.findFirst({
      where: { evento: tpl.evento, modulo: tpl.modulo, canal: tpl.canal, nombre: tpl.nombre },
      select: { id: true },
    });
    if (!exists) {
      await prisma.communicationTemplate.create({ data: tpl });
      created += 1;
    }
  }
  return { created };
}

module.exports = { seedCommunicationTemplatesIfEmpty, ensureRequiredCommunicationTemplates };

