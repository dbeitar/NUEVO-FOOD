import api from '../services/api';

export function isTrainingExternal() {
  return String(import.meta.env.VITE_TRAINING_EXTERNAL || '').toLowerCase() === 'true';
}

export function getTrainingModulePublicUrl() {
  const url = import.meta.env.VITE_TRAINING_MODULE_URL || import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5175';
  return String(url).replace(/\/$/, '');
}

export const TRAINING_LEGACY_VIEWS = new Set([
  'training',
  'admintraining',
  'admingallery',
  'progress',
]);

export function isTrainingLegacyView(viewId) {
  return TRAINING_LEGACY_VIEWS.has(viewId);
}

/** Launch training: SSO interno (panel shell) o externo futuro. */
export async function openTrainingModule(returnPath = '/dashboard') {
  try {
    const returnUrl = returnPath.startsWith('http')
      ? returnPath
      : `${window.location.origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`;
    const { data } = await api.get('/training-module/launch', { params: { return_url: returnUrl } });
    const payload = data?.data;
    if (!payload) throw new Error('Sin datos launch');

    if (payload.mode === 'external' && payload.url) {
      window.location.href = payload.url;
      return payload;
    }

    if (payload.branding) {
      sessionStorage.setItem('shellTrainingBranding', JSON.stringify(payload.branding));
      const b = payload.branding;
      if (b.primary_color) document.documentElement.style.setProperty('--brand-primary', b.primary_color);
      if (b.secondary_color) document.documentElement.style.setProperty('--brand-secondary', b.secondary_color);
    }
    sessionStorage.setItem('shellTrainingLaunch', JSON.stringify({
      destinationView: payload.destinationView || 'training',
      token: payload.token,
      at: Date.now(),
    }));
    return payload;
  } catch (e) {
    console.warn('[training] launch:', e.response?.data?.error || e.message);
    throw e;
  }
}

export function consumeTrainingLaunch(navigate, setOpenServicePanel, setCurrentView) {
  const raw = sessionStorage.getItem('shellTrainingLaunch');
  if (!raw) return false;
  try {
    const { destinationView, at } = JSON.parse(raw);
    if (Date.now() - at > 120000) {
      sessionStorage.removeItem('shellTrainingLaunch');
      return false;
    }
    sessionStorage.removeItem('shellTrainingLaunch');
    if (destinationView?.startsWith('service:')) {
      const panel = destinationView.split(':')[1];
      setOpenServicePanel(panel);
      setCurrentView('servicePanel');
    } else if (typeof navigate === 'function') {
      navigate(destinationView || 'training');
    }
    return true;
  } catch {
    return false;
  }
}
