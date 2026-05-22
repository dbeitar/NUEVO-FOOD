import api from '../services/api';

/** UI legacy del monolito (FoodLog, Calculator, etc.). Por defecto OFF. */
export function isFoodLegacyMode() {
  return String(import.meta.env.VITE_FOOD_LEGACY || '').toLowerCase() === 'true';
}

/** Food Plan embebido (`modules/food_version_final` en /food-plan). */
export function isFoodExternal() {
  return !isFoodLegacyMode();
}

export function getFoodModulePublicUrl() {
  const url = import.meta.env.VITE_FOOD_MODULE_URL || 'https://foodplan.tech';
  return String(url).replace(/\/$/, '');
}

export const FOOD_LEGACY_VIEWS = new Set([
  'calculator',
  'admin',
  'foodlog',
  'recipes',
  'foodsmanager',
  'equivalentes',
  'myplan',
  'progress',
]);

export function isFoodLegacyView(viewId) {
  return FOOD_LEGACY_VIEWS.has(viewId);
}

/** Abre Food Plan embebido en /food-plan con SSO (shell → food-module/exchange). */
export async function openFoodModule(returnPath) {
  if (isFoodLegacyMode()) {
    return;
  }

  const returnUrl = returnPath
    ? `${window.location.origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`
    : window.location.href;

  try {
    const shellToken = localStorage.getItem('token');
    if (shellToken) {
      localStorage.setItem('d28d_token', shellToken);
      localStorage.setItem('d28d_shell', 'true');
      localStorage.setItem('d28d_shell_label', import.meta.env.VITE_BRAND_NAME || 'D28D Gimnasio Virtual');
    }

    const { data } = await api.get('/food-module/launch', {
      params: { return_url: returnUrl },
    });
    const url = data?.data?.url;
    if (url) {
      try {
        const handoff = new URL(url, window.location.origin).searchParams.get('token');
        if (handoff) sessionStorage.setItem('d28d_food_handoff', handoff);
      } catch { /* noop */ }
      window.location.href = url;
      return;
    }
  } catch (e) {
    const msg = e.response?.data?.error || e.message || 'No se pudo abrir Food Plan';
    console.warn('[food] launch SSO:', msg);
    window.alert(msg);
    return;
  }
  window.alert('No se recibió URL de Food Plan. Comprueba que tienes licencia food activa.');
}
