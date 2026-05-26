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

function getFallbackJoinUrl(programId, zoomAccountId) {
  const key = resolveZoomAccountKey(programId, zoomAccountId);
  const pmi = key && ZOOM_PMI_ENV[key] ? process.env[ZOOM_PMI_ENV[key]] : '';
  if (pmi && String(pmi).startsWith('http')) return String(pmi).trim();
  return '';
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
    const fallback = getFallbackJoinUrl(programId, zoomAccountId);
    if (fallback) {
      return {
        ok: true,
        mode: 'pmi_fallback',
        join_url: fallback,
        start_url: fallback,
        host_email: hostEmail,
        alternative_host: alternativeHostEmail || null,
        message: 'Enlace PMI (configura ZOOM_S2S_* para crear reuniones nuevas por API).',
      };
    }
    return {
      ok: false,
      error: 'ZOOM_S2S_NOT_CONFIGURED',
      message: 'Falta app Server-to-Server Zoom (ZOOM_S2S_ACCOUNT_ID, CLIENT_ID, CLIENT_SECRET) o enlace PMI en .env.',
      host_email: hostEmail,
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
      alternative_host: altHosts || null,
    };
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.error('[Zoom] create meeting failed:', detail);
    const fallback = getFallbackJoinUrl(programId, zoomAccountId);
    if (fallback) {
      return {
        ok: true,
        mode: 'pmi_fallback',
        join_url: fallback,
        start_url: fallback,
        host_email: hostEmail,
        warning: detail,
      };
    }
    return { ok: false, error: 'ZOOM_API_ERROR', message: detail, host_email: hostEmail };
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
  createScheduledMeeting,
  listProgramZoomAccounts,
};
