const nodemailer = require('nodemailer');
const axios = require('axios');

function mustEnv(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`Falta variable de entorno ${name}`);
  return v;
}

function getProvider() {
  return String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

function getFrom() {
  return String(process.env.MAIL_FROM || 'noreply@mvpfood.local').trim();
}

function buildSmtpTransport() {
  const host = mustEnv('MAIL_SMTP_HOST');
  const port = Number(process.env.MAIL_SMTP_PORT || 587);
  const user = String(process.env.MAIL_SMTP_USER || '').trim();
  const pass = String(process.env.MAIL_SMTP_PASS || '').trim();
  const secure = String(process.env.MAIL_SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const auth = user && pass ? { user, pass } : undefined;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
  });
}

async function sendWithSmtp({ to, subject, html, text }) {
  const transporter = buildSmtpTransport();
  const info = await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
  });
  return { provider: 'smtp', messageId: info.messageId || null, raw: info };
}

async function sendWithEthereal({ to, subject, html, text }) {
  const account = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
  const info = await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text,
    replyTo: process.env.MAIL_REPLY_TO || undefined,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  return { provider: 'ethereal', messageId: info.messageId || null, raw: { previewUrl } };
}

async function sendWithSendGrid({ to, subject, html, text }) {
  const key = mustEnv('SENDGRID_API_KEY');
  const from = getFrom();
  const res = await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        { type: 'text/html', value: html || (text ? `<pre>${text}</pre>` : '') },
      ],
    },
    {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 15000,
      validateStatus: () => true,
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`SendGrid error ${res.status}: ${JSON.stringify(res.data || {})}`);
  }
  return { provider: 'sendgrid', messageId: res.headers?.['x-message-id'] || null, raw: { status: res.status } };
}

async function sendWithResend({ to, subject, html, text }) {
  const key = mustEnv('RESEND_API_KEY');
  const from = getFrom();
  const res = await axios.post(
    'https://api.resend.com/emails',
    {
      from,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      reply_to: process.env.MAIL_REPLY_TO || undefined,
    },
    {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 15000,
      validateStatus: () => true,
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(res.data || {})}`);
  }
  return { provider: 'resend', messageId: res.data?.id || null, raw: res.data };
}

async function sendWithMailgun({ to, subject, html, text }) {
  const key = mustEnv('MAILGUN_API_KEY');
  const domain = mustEnv('MAILGUN_DOMAIN');
  const from = getFrom();
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const form = new URLSearchParams();
  form.set('from', from);
  form.set('to', to);
  form.set('subject', subject);
  if (text) form.set('text', text);
  if (html) form.set('html', html);
  const res = await axios.post(url, form, {
    auth: { username: 'api', password: key },
    timeout: 15000,
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Mailgun error ${res.status}: ${JSON.stringify(res.data || {})}`);
  }
  return { provider: 'mailgun', messageId: res.data?.id || null, raw: res.data };
}

async function sendMail({ to, subject, html, text }) {
  const provider = getProvider();
  if (!to) throw new Error('to requerido');
  if (!subject) throw new Error('subject requerido');
  if (!html && !text) throw new Error('html o text requerido');

  if (provider === 'ethereal') return sendWithEthereal({ to, subject, html, text });
  if (provider === 'sendgrid') return sendWithSendGrid({ to, subject, html, text });
  if (provider === 'resend') return sendWithResend({ to, subject, html, text });
  if (provider === 'mailgun') return sendWithMailgun({ to, subject, html, text });
  return sendWithSmtp({ to, subject, html, text });
}

module.exports = {
  sendMail,
  getProvider,
};

