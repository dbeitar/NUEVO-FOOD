/**
 * Creación de reuniones Zoom (Server-to-Server OAuth).
 * Cuentas por programa: emails en program_settings; contraseñas solo en .env.
 */
const axios = require('axios');
const ProgramSettingsDatabase = require('../models/ProgramSettingsDatabase');

const ZOOM_EMAIL_ENV = {
  vital: 'D28D_ZOOM_EMAIL_VITAL',
  pancitas: 'D28D_ZOOM_EMAIL_PANCITAS',
  virtual_d28d_1: 'D28D_ZOOM_EMAIL_VIRTUAL_1',
  virtual_d28d_2: 'D28D_ZOOM_EMAIL_VIRTUAL_2',
};

const ZOOM_PASSWORD_ENV = {
  vital: 'D28D_ZOOM_PASSWORD_VITAL',
  pancitas: 'D28D_ZOOM_PASSWORD_PANCITAS',
  virtual_d28d_1: 'D28D_ZOOM_PASSWORD_VIRTUAL_1',
  virtual_d28d_2: 'D28D_ZOOM_PASSWORD_VIRTUAL_2',
};

const ZOOM_PMI_ENV = {
  vital: 'D28D_ZOOM_PMI_VITAL',
  pancitas: 'D28D_ZOOM_PMI_PANCITAS',
  virtual_d28d_1: 'D28D_ZOOM_PMI_VIRTUAL_1',
  virtual_d28d_2: 'D28D_ZOOM_PMI_VIRTUAL_2',
};

let tokenCache = { token: null, expiresAt: 0 };

function resolveZoomAccountKey(programId, zoomAccountId = null) {
  if (programId === 'virtual_d28d') {
    return zoomAccountId === 'virtual_d28d_2' ? 'virtual_d28d_2' : 'virtual_d28d_1';
  }
  if (programId === 'vital' || programId === 'pancitas') return programId;
  return null;
}

function getZoomHostEmail(programId, zoomAccountId = null) {
  const key = resolveZoomAccountKey(programId, zoomAccountId);
  if (!key) return '';
  const envKey = ZOOM_EMAIL_ENV[key];
  if (envKey && process.env[envKey]) return String(process.env[envKey]).trim();
  const program = ProgramSettingsDatabase.getById(programId);
  if (!program) return '';
  if (programId === 'virtual_d28d' && Array.isArray(program.zoom_accounts)) {
    const acc = program.zoom_accounts.find((a) => a.id === key);
    return acc?.email || '';
  }
  return program.zoom_email || '';
}

function isZoomPasswordConfigured(programId, zoomAccountId = null) {
  const key = resolveZoomAccountKey(programId, zoomAccountId);
  if (!key) return false;
  const envKey = ZOOM_PASSWORD_ENV[key];
  return Boolean(envKey && String(process.env[envKey] || '').length > 0);
}

function isZoomS2SConfigured() {
  return Boolean(
    process.env.ZOOM_S2S_ACCOUNT_ID
    && process.env.ZOOM_S2S_CLIENT_ID
    && process.env.ZOOM_S2S_CLIENT_SECRET,
  );
}

async function getS2SToken() {
  if (!isZoomS2SConfigured()) return null;
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const credentials = Buffer.from(
    `${process.env.ZOOM_S2S_CLIENT_ID}:${process.env.ZOOM_S2S_CLIENT_SECRET}`,
  ).toString('base64');
  const accountId = process.env.ZOOM_S2S_ACCOUNT_ID;
  const res = await axios.post(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {},
    { headers: { Authorization: `Basic ${credentials}` } },
  );
  tokenCache = {
    token: res.data.access_token,
    expiresAt: Date.now() + Math.max(0, (res.data.expires_in || 3600) - 120) * 1000,
  };
  return tokenCache.token;
}

/** Enlaces tipo https://zoom.us/j/12345678901 (rechaza slugs demo del seed). */
function isValidZoomJoinUrl(url) {
  const s = String(url || '').trim();
  if (!s) return false;
  const m = s.match(/^https:\/\/([\w-]+\.)?zoom\.us\/j\/([^/?#]+)/i);
  if (!m) return false;
  const meetingRef = m[2];
  return /^\d{9,11}$/.test(meetingRef);
}

function getFallbackJoinUrl(programId, zoomAccountId) {
  const key = resolveZoomAccountKey(programId, zoomAccountId);
  const pmi = key && ZOOM_PMI_ENV[key] ? process.env[ZOOM_PMI_ENV[key]] : '';
  const trimmed = pmi ? String(pmi).trim() : '';
  if (trimmed && isValidZoomJoinUrl(trimmed)) return trimmed;
  return '';
}

/** Enlace demo cuando no hay S2S ni PMI (solo dev o D28D_ZOOM_ALLOW_PLACEHOLDER=1). */
function getPlaceholderJoinUrl() {
  if (process.env.D28D_ZOOM_ALLOW_PLACEHOLDER === '0') return '';
  const explicit = String(process.env.D28D_ZOOM_PLACEHOLDER_URL || '').trim();
  if (explicit.startsWith('http')) return explicit;
  // Evitar enlaces demo inválidos (ej. /j/d28d-demo) que confunden en pruebas.
  // Si no hay S2S ni PMI, exige un placeholder real explícito.
  return '';
}

function resolveOfflineJoinUrl(programId, zoomAccountId) {
  return getFallbackJoinUrl(programId, zoomAccountId) || getPlaceholderJoinUrl();
}

async function createScheduledMeeting({
  programId,
  zoomAccountId = null,
  topic,
  startTime,
  endTime,
  alternativeHostEmail = '',
}) {
  const hostEmail = getZoomHostEmail(programId, zoomAccountId);
  if (!hostEmail) {
    return { ok: false, error: 'NO_ZOOM_EMAIL', message: 'No hay cuenta Zoom configurada para este programa.' };
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = Math.max(15, Math.round((end - start) / 60000) || 60);

  const token = await getS2SToken();
  if (!token) {
    const fallback = resolveOfflineJoinUrl(programId, zoomAccountId);
    if (fallback && isValidZoomJoinUrl(fallback)) {
      const isPlaceholder = fallback === getPlaceholderJoinUrl();
      return {
        ok: true,
        mode: isPlaceholder ? 'placeholder' : 'pmi_fallback',
        join_url: fallback,
        start_url: fallback,
        host_email: hostEmail,
        zoom_account_id: resolveZoomAccountKey(programId, zoomAccountId),
        alternative_host: alternativeHostEmail || null,
        message: isPlaceholder
          ? 'Enlace demo (configura ZOOM_S2S_* o D28D_ZOOM_PMI_* para reuniones reales).'
          : 'Enlace PMI (configura ZOOM_S2S_* para crear reuniones nuevas por API).',
      };
    }
    const alt = String(alternativeHostEmail || '').trim();
    return {
      ok: false,
      error: 'ZOOM_S2S_NOT_CONFIGURED',
      message: [
        `No hay API Zoom S2S ni PMI válido para crear la reunión en ${hostEmail}.`,
        alt ? `Anfitrión D28D (alternativo): ${alt}.` : 'Asigna un entrenador D28D para anfitrión alternativo.',
        'Configura ZOOM_S2S_ACCOUNT_ID, ZOOM_S2S_CLIENT_ID y ZOOM_S2S_SECRET en backend/.env',
        '(las cuentas del maestro de programas ya están en program_settings; la app S2S debe pertenecer a la misma cuenta Zoom empresarial).',
      ].join(' '),
      host_email: hostEmail,
      alternative_host: alt || null,
      zoom_account_id: resolveZoomAccountKey(programId, zoomAccountId),
    };
  }

  const altHosts = String(alternativeHostEmail || '').trim();
  const body = {
    topic: topic || 'Clase D28D',
    type: 2,
    start_time: start.toISOString(),
    duration: durationMinutes,
    timezone: process.env.D28D_ZOOM_TIMEZONE || 'America/Mexico_City',
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      waiting_room: true,
      approval_type: 2,
      alternative_hosts: altHosts,
    },
  };

  try {
    const userId = encodeURIComponent(hostEmail);
    const res = await axios.post(
      `https://api.zoom.us/v2/users/${userId}/meetings`,
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return {
      ok: true,
      mode: 'api',
      join_url: res.data.join_url,
      start_url: res.data.start_url,
      meeting_id: res.data.id,
      password: res.data.password || null,
      host_email: hostEmail,
      zoom_account_id: resolveZoomAccountKey(programId, zoomAccountId),
      alternative_host: altHosts || null,
      message: altHosts
        ? `Reunión creada en ${hostEmail}; anfitrión alternativo: ${altHosts}.`
        : `Reunión creada en ${hostEmail}.`,
    };
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.error('[Zoom] create meeting failed:', detail, 'host:', hostEmail);
    const fallback = resolveOfflineJoinUrl(programId, zoomAccountId);
    if (fallback && isValidZoomJoinUrl(fallback)) {
      const isPlaceholder = fallback === getPlaceholderJoinUrl();
      return {
        ok: true,
        mode: isPlaceholder ? 'placeholder' : 'pmi_fallback',
        join_url: fallback,
        start_url: fallback,
        host_email: hostEmail,
        zoom_account_id: resolveZoomAccountKey(programId, zoomAccountId),
        alternative_host: altHosts || null,
        warning: detail,
        message: isPlaceholder ? 'Enlace demo (falló API Zoom).' : `PMI de respaldo (falló API: ${detail})`,
      };
    }
    return {
      ok: false,
      error: 'ZOOM_API_ERROR',
      message: `Zoom API (${hostEmail}): ${detail}`,
      host_email: hostEmail,
      alternative_host: altHosts || null,
      zoom_account_id: resolveZoomAccountKey(programId, zoomAccountId),
    };
  }
}

function listProgramZoomAccounts() {
  const programs = ProgramSettingsDatabase.getAll();
  return programs.map((p) => {
    if (p.id === 'virtual_d28d' && Array.isArray(p.zoom_accounts)) {
      return {
        program_id: p.id,
        program_name: p.name,
        accounts: p.zoom_accounts.map((acc) => ({
          id: acc.id,
          label: acc.id === 'virtual_d28d_1' ? 'Virtual · Cuenta 1' : 'Virtual · Cuenta 2',
          email: acc.email || getZoomHostEmail(p.id, acc.id),
          password_configured: isZoomPasswordConfigured(p.id, acc.id),
        })),
      };
    }
    return {
      program_id: p.id,
      program_name: p.name,
      accounts: [{
        id: p.id,
        label: p.id === 'pancitas' ? 'P · Pancitas' : p.id === 'vital' ? 'V · Vital' : p.name,
        email: p.zoom_email || getZoomHostEmail(p.id),
        password_configured: isZoomPasswordConfigured(p.id),
      }],
    };
  });
}

module.exports = {
  resolveZoomAccountKey,
  getZoomHostEmail,
  isZoomPasswordConfigured,
  isZoomS2SConfigured,
  isValidZoomJoinUrl,
  createScheduledMeeting,
  listProgramZoomAccounts,
};
