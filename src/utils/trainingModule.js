import api from '../services/api';
import { isFinalUser } from '../components/dashboard/roles';

/** UI legacy del monolito (TrainingModule, AdminTrainingManager en Dashboard). Por defecto OFF. */
export function isTrainingLegacyMode() {
  return String(import.meta.env.VITE_TRAINING_LEGACY || '').toLowerCase() === 'true';
}

/** Módulo entrenadores embebido (/training-module), paridad con FOOD_PLAN. */
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
  'coachai',
  'admingallery',
  'progress',
]);

export function isTrainingLegacyView(viewId) {
  return TRAINING_LEGACY_VIEWS.has(viewId);
}

const TRAINING_MODULE_PATHS = {
  training: '/athlete',
  admintraining: '/coach/planning',
  coachai: '/coach/ai',
  admingallery: '/coach/gallery',
  adminusers: '/coach/users',
  progress: '/coach/progress',
};

/** Ruta destino en /training-module según vista y rol. */
export function resolveTrainingDest(viewId, user) {
  if (viewId === 'training') return isFinalUser(user) ? '/athlete' : '/coach';
  if (typeof viewId === 'string' && viewId.startsWith('/')) return viewId;
  return TRAINING_MODULE_PATHS[viewId] || (isFinalUser(user) ? '/athlete' : '/coach');
}

/** Abre módulo Entrenadores embebido con SSO (shell → training-module/exchange). */
export async function openTrainingModule(returnPath = '/dashboard', subPath = '', user = null) {
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

    const destHint = subPath || resolveTrainingDest('training', user);
    const { data } = await api.get('/training-module/launch', {
      params: { return_url: returnUrl, dest: destHint },
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
    const dest = subPath
      ? (subPath.startsWith('/') ? subPath : `/${subPath}`)
      : (data?.data?.destinationView?.startsWith('/')
        ? data.data.destinationView
        : resolveTrainingDest(data?.data?.destinationView || 'training', user));
    sessionStorage.setItem('d28d_training_dest', dest);
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set('dest', dest);
      url = u.toString();
    } catch { /* noop */ }
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
export function openTrainingModuleView(viewId, user = null) {
  const sub = resolveTrainingDest(viewId, user);
  return openTrainingModule('/dashboard', sub, user);
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
      openTrainingModule('/dashboard', sub, null);
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
