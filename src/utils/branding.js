// Branding por defecto antes de iniciar sesión.
// Una vez autenticado, el Dashboard ya pinta el branding del gym del usuario
// (gym.brand_name + logo). Estos valores se usan SOLO en pantallas previas a
// auth (login, registro, headers genéricos).
const fromEnv = (key, fallback) => {
  const v = (import.meta.env[key] || '').trim();
  return v || fallback;
};

// Nombre por defecto del producto. Una vez autenticado, el Dashboard pinta el
// brand del gym del usuario (white-label) y este valor solo se usa antes de
// auth o cuando el usuario no pertenece a ningún gym.
export const PUBLIC_BRAND_NAME = fromEnv('VITE_BRAND_NAME', 'D28D Gimnasio Virtual');
export const PUBLIC_BRAND_TAGLINE = fromEnv('VITE_BRAND_TAGLINE', 'Tu plan, tu progreso, tu equipo.');
