import api from '../services/api';

/** UI legacy del monolito (TrainingModule, AdminTrainingManager en Dashboard). Por defecto OFF. */
export function isTrainingLegacyMode() {
  return String(import.meta.env.VITE_TRAINING_LEGACY || '').toLowerCase() === 'true';
}

/** Módulo entrenadores embebido (/training-module), paridad con Food Plan. */
export function isTrainingExternal() {
  return !isTrainingLegacyMode();
}

export function getTrainingModulePublicUrl() {
  const url = import.meta.env.VITE_TRAINING_MODULE_URL
    || import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '')
    || 'http://localhost:5175';
  return String(url).replace(/\/$/, '');
}

export const TRAINING_LEGACY_VIEWS = new Set([
  'training',
  'admintraining',
  'coachroutines',
  'admingallery',
  'progress',
]);

export function isTrainingLegacyView(viewId) {
  return TRAINING_LEGACY_VIEWS.has(viewId);
}

const TRAINING_MODULE_PATHS = {
  training: '/athlete',
  admintraining: '/coach/planning',
  coachroutines: '/coach/routines',
  admingallery: '/coach/gallery',
  adminusers: '/coach/users',
  progress: '/coach/progress',
};

/** Abre módulo Entrenadores embebido con SSO (shell → training-module/exchange). */
export async function openTrainingModule(returnPath = '/dashboard', subPath = '') {
  if (isTrainingLegacyMode()) {
    return { mode: 'legacy' };
  }

  const returnUrl = returnPath.startsWith('http')
    ? returnPath
    : `${window.location.origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`;

  try {
    const shellToken = localStorage.getItem('token');
    if (shellToken) {
      localStorage.setItem('d28d_token', shellToken);
      localStorage.setItem('d28d_shell', 'true');
      localStorage.setItem('d28d_shell_label', import.meta.env.VITE_BRAND_NAME || 'D28D Gimnasio Virtual');
    }

    const { data } = await api.get('/training-module/launch', {
      params: { return_url: returnUrl },
    });
    let url = data?.data?.url;
    if (!url) {
      window.alert('No se recibió URL del módulo Entrenadores. Verifica licencia training activa.');
      return;
    }
    try {
      const handoff = new URL(url, window.location.origin).searchParams.get('token');
      if (handoff) sessionStorage.setItem('d28d_training_handoff', handoff);
    } catch { /* noop */ }
    if (subPath) {
      const base = url.split('?')[0];
      const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      const dest = subPath.startsWith('/') ? subPath : `/${subPath}`;
      sessionStorage.setItem('d28d_training_dest', dest);
      url = `${base}${qs}`;
    }
    window.location.href = url;
    return data?.data;
  } catch (e) {
    const msg = e.response?.data?.error || e.message || 'No se pudo abrir Entrenadores';
    console.warn('[training] launch:', msg);
    window.alert(msg);
    return null;
  }
}

/** Navegación desde shell D28D hacia una pantalla del módulo embebido. */
export function openTrainingModuleView(viewId) {
  const sub = TRAINING_MODULE_PATHS[viewId] || '/coach';
  return openTrainingModule('/dashboard', sub);
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
    if (isTrainingExternal()) {
      const sub = destinationView?.startsWith('/')
        ? destinationView
        : TRAINING_MODULE_PATHS[destinationView] || '/coach';
      openTrainingModule('/dashboard', sub);
      return true;
    }
    if (destinationView?.startsWith('service:')) {
      setOpenServicePanel(destinationView.split(':')[1]);
      setCurrentView('servicePanel');
    } else if (typeof navigate === 'function') {
      navigate(destinationView || 'training');
    }
    return true;
  } catch {
    return false;
  }
}
