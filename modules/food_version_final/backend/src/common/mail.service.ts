import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const host    = process.env.MAIL_HOST || 'mailhog';
    const port    = parseInt(process.env.MAIL_PORT) || 1025;
    const user    = process.env.MAIL_USER || '';
    const pass    = process.env.MAIL_PASS || '';
    const isRealSmtp = !!user && !!pass && host !== 'mailhog';

    if (isRealSmtp) {
      // Puerto 465 → SSL directo | Puerto 587 → STARTTLS
      const useSSL = port === 465;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: useSSL,
        requireTLS: !useSSL,   // fuerza STARTTLS en puerto 587
        tls: { minVersion: 'TLSv1.2' },
        auth: { user, pass },
      });
      this.logger.log(`✅ Mail SMTP real: ${host}:${port} (${useSSL ? 'SSL' : 'STARTTLS'}) — ${user}`);
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        ignoreTLS: true,
      });
      this.logger.log(`📬 Mail local — MailHog en ${host}:${port}`);
    }
  }

  private get from() {
    return process.env.MAIL_FROM || 'noreply@food-plan.com';
  }

  private baseTemplate(content: string) {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:linear-gradient(135deg,#13c918,#0f9e13);padding:30px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">🍎 Food Plan</h1>
        </div>
        <div style="background:#f8f9fa;padding:30px;border-radius:0 0 8px 8px">
          ${content}
          <p style="color:#999;font-size:13px;margin-top:24px">Food Plan Team</p>
        </div>
      </div>`;
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`📧 Email enviado a ${to} — ${subject}`);
    } catch (err) {
      this.logger.error(`❌ Error enviando email a ${to}: ${err.message}`);
    }
  }

  async sendWelcomeEmail(email: string, name: string, planName: string) {
    await this.send(
      email,
      '¡Bienvenido a Food Plan! 🏋️',
      this.baseTemplate(`
        <h2 style="color:#1B4F72">¡Hola, ${name}!</h2>
        <p>Tu cuenta ha sido creada exitosamente con el <strong>${planName}</strong>.</p>
        <p>Ya puedes iniciar sesión y comenzar tu camino fitness.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
           style="background:#13c918;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
          Iniciar Sesión →
        </a>`),
    );
  }

  async sendCredentialsEmail(email: string, name: string, password: string) {
    await this.send(
      email,
      'Tus credenciales de acceso - Food Plan',
      this.baseTemplate(`
        <h2 style="color:#1B4F72">Hola, ${name}</h2>
        <p>Tu cuenta ha sido creada. Aquí están tus credenciales:</p>
        <div style="background:white;border:1px solid #ddd;border-radius:6px;padding:16px;margin:16px 0">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Contraseña temporal:</strong>
            <code style="background:#f0f0f0;padding:4px 8px;border-radius:4px">${password}</code>
          </p>
        </div>
        <p style="color:#e74c3c">⚠️ Por seguridad, cambia tu contraseña al iniciar sesión.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
           style="background:#13c918;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
          Iniciar Sesión →
        </a>`),
    );
  }

  async sendPasswordResetEmail(email: string, name: string, tempPassword: string) {
    await this.send(
      email,
      '🔑 Nueva contraseña temporal - Food Plan',
      this.baseTemplate(`
        <h2 style="color:#1B4F72">Hola, ${name}</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <div style="background:white;border:1px solid #ddd;border-radius:6px;padding:16px;margin:16px 0;text-align:center">
          <p style="margin:0 0 8px"><strong>Tu nueva contraseña temporal:</strong></p>
          <code style="background:#f0f0f0;padding:8px 16px;border-radius:4px;font-size:18px">${tempPassword}</code>
        </div>
        <p style="color:#e74c3c">⚠️ Cambia esta contraseña después de iniciar sesión.</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login"
           style="background:#13c918;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
          Iniciar Sesión →
        </a>`),
    );
  }

  async sendReminderEmail(email: string, name: string, trainerName: string, message: string) {
    await this.send(
      email,
      '📊 Recordatorio nutricional de tu entrenador',
      this.baseTemplate(`
        <h2 style="color:#1B4F72">Hola, ${name}</h2>
        <p>Tu entrenador <strong>${trainerName}</strong> te envía este recordatorio:</p>
        <div style="background:#fff3cd;border-left:4px solid #f0ad4e;padding:16px;margin:16px 0;border-radius:4px">
          <p style="margin:0">${message}</p>
        </div>
        <p>Recuerda registrar tu alimentación diaria para alcanzar tus metas. 💪</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
           style="background:#27ae60;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
          Registrar Alimentos →
        </a>`),
    );
  }

  async sendMeetInviteEmail(
    email: string, name: string, trainerName: string, meetUrl: string,
    scheduledDate?: string, scheduledTime?: string, notes?: string,
  ) {
    const dateInfo = scheduledDate && scheduledTime
      ? `<div style="background:#e8f5e9;border-left:4px solid #13c918;padding:16px;margin:16px 0;border-radius:4px">
           <p style="margin:0;font-weight:bold">📅 Fecha y hora de la reunión:</p>
           <p style="margin:8px 0 0;font-size:18px;color:#1B4F72">${scheduledDate} a las ${scheduledTime}</p>
         </div>`
      : '';
    const notesInfo = notes
      ? `<div style="background:#fff3cd;border-left:4px solid #f0ad4e;padding:16px;margin:16px 0;border-radius:4px">
           <p style="margin:0">${notes}</p>
         </div>`
      : '';
    await this.send(
      email,
      `📹 Invitación a reunión - ${trainerName}`,
      this.baseTemplate(`
        <h2 style="color:#1B4F72">Hola, ${name}</h2>
        <p>Tu entrenador <strong>${trainerName}</strong> te ha enviado una invitación para una reunión virtual.</p>
        ${dateInfo}
        ${notesInfo}
        <div style="text-align:center;margin:24px 0">
          <a href="${meetUrl}" target="_blank"
             style="background:#00897B;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-size:16px;display:inline-block">
            📹 Unirse a Google Meet
          </a>
        </div>
        <p style="color:#666;font-size:13px">O copia este enlace: <code>${meetUrl}</code></p>`),
    );
  }

  async sendMeasurementReminderEmail(to: string, name: string) {
    await this.send(
      to,
      '📏 Recordatorio: Registra tus medidas corporales',
      this.baseTemplate(`
        <h2 style="color:#1B4F72">Hola, ${name} 👋</h2>
        <p>Es hora de registrar tus <strong>medidas corporales semanales</strong>.</p>
        <div style="background:#e8f5e9;border-left:4px solid #13c918;padding:16px;margin:16px 0;border-radius:4px">
          <p style="margin:0;font-weight:bold">📋 Puntos a medir:</p>
          <p style="margin:8px 0 0">Cuello · Pecho · Brazos · Antebrazos · Cintura · Cadera · Glúteo · Muslos · Pantorrillas</p>
        </div>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/measurements"
           style="background:#13c918;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
          Registrar mis medidas →
        </a>`),
    );
  }

  async sendNotificationEmail(to: string, firstName: string, subject: string, message: string, trainerName: string) {
    const html = this.baseTemplate(`
      <h2 style="color:#1f2937">Hola ${firstName} 👋</h2>
      <p style="color:#4b5563;line-height:1.6">${message.replace(/\n/g, '<br>')}</p>
      <div style="margin-top:20px;padding:15px;background:#f0fdf4;border-radius:8px;border-left:4px solid #13c918">
        <p style="margin:0;color:#166534;font-size:14px">💪 Sigue adelante con tu proceso nutricional.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px">Enviado por tu entrenador: ${trainerName}</p>
    `);
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  async sendPlanExpiryWarning(to: string, firstName: string, planName: string, daysLeft: number) {
    const isExpiring = daysLeft > 0;
    const subject = isExpiring
      ? `⚠️ Tu plan ${planName} vence en ${daysLeft} días`
      : `🔴 Tu plan ${planName} vence hoy`;

    const html = this.baseTemplate(`
      <h2 style="color:#1f2937">Hola ${firstName} 👋</h2>
      ${isExpiring ? `
        <p style="color:#4b5563;line-height:1.6">
          Te recordamos que tu <strong>${planName}</strong> vence en <strong>${daysLeft} días</strong>.
        </p>
        <p style="color:#4b5563;line-height:1.6">
          Para continuar disfrutando de todas las funcionalidades de Food Plan, renueva tu plan antes de que expire.
        </p>
      ` : `
        <p style="color:#ef4444;line-height:1.6;font-weight:bold">
          Tu ${planName} vence hoy.
        </p>
        <p style="color:#4b5563;line-height:1.6">
          A partir de mañana no podrás acceder a Food Plan. Renueva tu plan para continuar con tu proceso nutricional.
        </p>
      `}
      <div style="margin-top:24px;text-align:center">
        <a href="${process.env.FRONTEND_URL || 'https://foodplan.tech'}"
          style="background:#13c918;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
          ${isExpiring ? 'Renovar mi plan' : 'Renovar ahora'}
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px">Food Plan — Nutrición inteligente</p>
    `);
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }


  async sendRenewalRequest(adminEmail: string, userName: string, userEmail: string, planName: string) {
    const html = this.baseTemplate(`
      <h2 style="color:#1f2937">📋 Solicitud de Renovación de Plan</h2>
      <p style="color:#4b5563">Un usuario ha solicitado renovar su plan en Food Plan:</p>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:4px 0"><strong>Usuario:</strong> ${userName}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${userEmail}</p>
        <p style="margin:4px 0"><strong>Plan anterior:</strong> ${planName || 'Sin plan'}</p>
      </div>
      <p style="color:#4b5563">Por favor ingresa al panel de administración y activa el plan del usuario.</p>
    `);
    await this.transporter.sendMail({
      from: this.from,
      to: adminEmail,
      subject: `Solicitud de renovación — ${userName}`,
      html,
    });
  }
}