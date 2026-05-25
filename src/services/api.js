import axios from 'axios';

// === Resolución de la URL base ===
// Política única y estable:
//   1. Si hay VITE_API_BASE_URL en build, se usa.
//   2. Si NO hay y estamos en localhost, se usa http://localhost:3001/api.
//   3. Si NO hay y estamos en otro dominio, se asume el mismo origen + /api.
//
// La URL base se calcula UNA sola vez al cargar el módulo y NO se modifica
// dinámicamente (no hay window.apiConfig, no hay overrides desde localStorage,
// no hay "auto-repair" que la cambie en runtime). Esto evita relays de tokens
// hacia destinos arbitrarios y comportamientos impredecibles.

function computeApiBase() {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envBase) {
    const norm = envBase.replace(/\/+$/, '');
    return /\/api$/.test(norm) ? norm : `${norm}/api`;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  if (isLocal) return 'http://localhost:3001/api';
  // Mismo origen + /api (caso despliegue monolítico).
  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/\/+$/, '')}/api`;
  }
  return '/api';
}

export const API_BASE = computeApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Token: leer de localStorage en cada request. Si quieres "logout global"
// llama localStorage.removeItem('token') y los siguientes requests irán sin él.
api.interceptors.request.use((config) => {
  if (config.skipShellAuth) return config;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* storage no disponible */ }
  return config;
});

// 401 global: token inválido/expirado -> limpiar y dejar que la app redirija.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');
    const isModuleSso = url.includes('/food-module/exchange') || url.includes('/training-module/exchange');
    if (status === 401 && !error?.config?.skipAuthClearOn401 && !isModuleSso) {
      try {
        localStorage.removeItem('token');
      } catch { /* noop */ }
    }
    return Promise.reject(error);
  }
);

// API mínima de auth, usada por el AuthContext del frontend.
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

export default api;
