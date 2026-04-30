import axios from 'axios';
const prodBase = 'https://reluctant-blair-foodplan-8ceace9e.koyeb.app';

const envBase = import.meta.env.VITE_API_BASE_URL;
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalHost = host === 'localhost' || host === '127.0.0.1';
const qsUseProd = (() => {
  try {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('useProd') === '1';
  } catch {
    return false;
  }
})();

let overrideBase = null;
try { overrideBase = localStorage.getItem('apiBaseOverride') || null; } catch (e) { void e; }

let resolvedBase;
// Política definitiva:
// - Si estamos en localhost: SIEMPRE usar backend local http://localhost:3001/api
//   ignorando override y variables, para evitar CORS con dominios remotos.
// - Si NO estamos en localhost: usar env o prodBase.
if (isLocalHost && !qsUseProd) {
  try { localStorage.removeItem('apiBaseOverride'); } catch (e) { void e; }
  resolvedBase = 'http://localhost:3001/api';
} else {
  resolvedBase = (overrideBase || envBase || prodBase).replace(/\/+$/, '');
  if (!/\/api$/.test(resolvedBase)) resolvedBase = `${resolvedBase}/api`;
}

// Bandera de fallback: desactivada por defecto; se puede habilitar manualmente
let disableFallback = true;
try {
  const flag = localStorage.getItem('apiDisableFallback');
  if (flag === '0') disableFallback = false;
} catch (e) { void e; }

// Debug: imprime la base usada en consola del navegador
try {
  if (typeof window !== 'undefined' && !window.__API_BASE_LOGGED__) {
    window.__API_BASE_LOGGED__ = true;
    console.info('API base:', resolvedBase);
  }
} catch (e) { void e; }

const api = axios.create({
  baseURL: resolvedBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fallback automático: si la base local falla por red/CORS, saltar a producción y reintentar 1 vez
let switchedToProd = false;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const isCors = /cors/i.test(String(error?.message || '')) ||
      (error?.response?.status === 0 && /fetch/i.test(String(error?.message || '')));
    const base = api.defaults.baseURL || '';
    const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(base);
    // Reparación automática en dev: si estamos en localhost y la base NO es local y falla por CORS,
    // forzar base local y reintentar una sola vez.
    if (isLocalHost && !isLocalBase && isCors && !switchedToProd) {
      const newBase = 'http://localhost:3001/api';
      api.defaults.baseURL = newBase;
      try { localStorage.setItem('apiBaseOverride', newBase); } catch (e) { void e; }
      console.warn('API base reparada →', newBase);
      switchedToProd = true; // marcamos para evitar bucles; aquí reintentamos una vez
      const cfg = error.config || {};
      cfg.baseURL = newBase;
      return api.request(cfg);
    }
    // Si el error es de red y estamos con base local, habilitar fallback manual a prod (opcional)
    const isNetwork = error && error.message && /Network Error/i.test(error.message);
    if (!disableFallback && isNetwork && isLocalBase && !switchedToProd) {
      switchedToProd = true;
      const newBase = `${prodBase.replace(/\/+$/, '')}/api`;
      api.defaults.baseURL = newBase;
      try {
        localStorage.setItem('apiBaseOverride', newBase);
      } catch (e) { void e; }
      console.info('API base fallback →', newBase);
      const cfg = error.config || {};
      cfg.baseURL = newBase;
      return api.request(cfg);
    }
    return Promise.reject(error);
  }
);

// Helpers de desarrollo para fijar base y fallback desde consola
try {
  if (typeof window !== 'undefined') {
    window.apiConfig = {
      get base() { return api.defaults.baseURL; },
      setBase(url) {
        if (typeof url === 'string' && url) {
          const norm = url.replace(/\/+$/, '');
          const finalBase = /\/api$/.test(norm) ? norm : `${norm}/api`;
          api.defaults.baseURL = finalBase;
          try { localStorage.setItem('apiBaseOverride', finalBase); } catch (e) { void e; }
          console.info('API base set →', finalBase);
        }
      },
      repair() {
        const finalBase = isLocalHost ? 'http://localhost:3001/api' : `${prodBase.replace(/\/+$/, '')}/api`;
        api.defaults.baseURL = finalBase;
        try { localStorage.setItem('apiBaseOverride', finalBase); } catch (e) { void e; }
        console.info('API base repaired →', finalBase);
      },
      disableFallback() {
        try { localStorage.setItem('apiDisableFallback', '1'); } catch (e) { void e; }
        console.info('API fallback desactivado');
      },
      enableFallback() {
        try { localStorage.removeItem('apiDisableFallback'); } catch (e) { void e; }
        console.info('API fallback activado');
      },
      clearOverride() {
        try { localStorage.removeItem('apiBaseOverride'); } catch (e) { void e; }
        console.info('API override limpiado; recarga para recalcular base');
      },
    };
  }
} catch (e) { void e; }

// Autenticación
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: async (email, password) => {
    console.log('Login attempt:', { email, password });
    // Credenciales de prueba en modo local
    const testUsers = {
      'admin@foodplan.local': {
        password: 'Admin!234',
        user: {
          id: 1,
          nombre: 'Super Admin',
          email: 'admin@foodplan.local',
          rol: 'super_admin',
        },
      },
      'cliente@foodplan.local': {
        password: 'Admin!234',
        user: {
          id: 2,
          nombre: 'Cliente Ejemplo',
          email: 'cliente@foodplan.local',
          rol: 'usuario_final',
        },
      },
      'admin.gym@test.foodplan.local': {
        password: 'Admin!234',
        user: {
          id: 10,
          nombre: 'Admin Gimnasio',
          email: 'admin.gym@test.foodplan.local',
          rol: 'admin_gimnasio',
          gym_id: 1,
        },
      },
      'trainer@test.foodplan.local': {
        password: 'Admin!234',
        user: {
          id: 11,
          nombre: 'Entrenador',
          email: 'trainer@test.foodplan.local',
          rol: 'entrenador',
          gym_id: 1,
        },
      },
      'admin.d28d@foodplan.local': {
        password: 'Admin!234',
        user: {
          id: 12,
          nombre: 'D28D Admin',
          email: 'admin.d28d@foodplan.local',
          rol: 'super_admin',
        },
      },
    };

    const testUser = testUsers[email];
    if (testUser && testUser.password === password) {
      const token = 'fake-jwt-token-' + Date.now();
      localStorage.setItem('token', token);
      return {
        data: {
          token,
          user: testUser.user,
        },
      };
    } else {
      throw new Error('Credenciales incorrectas');
    }
  },
  getProfile: () => api.get('/auth/profile'),
};

export default api;
