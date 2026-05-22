const { DEFAULT_PANELS } = require('./defaultFrontendPanels');

/** Configuración global del front (imágenes de servicios, tema, textos auth). */
const DEFAULT_FRONTEND_CONFIG = {
  version: 2,
  theme_mode: 'dark',
  brand: {
    name: 'D28D GYM VIRTUAL',
    tagline: 'Entrena en vivo con los mejores profesionales.',
    accent_color: '#ffd700',
    logo_url: '',
    logo_alt: 'D28D GYM VIRTUAL',
  },
  auth: {
    line_white: 'ENTRENA EN VIVO',
    line_yellow_1: 'CON LOS MEJORES',
    line_yellow_2: 'PROFESIONALES',
    subtitle:
      'La energía de un gimnasio real, en la comodidad de tu casa. Únete a la comunidad D28D y transforma tu vida hoy mismo.',
    cta_label: 'VER CLASES',
  },
  services: {
    d28d: {
      title: 'D28D',
      desc: 'Programas Vital, Pancitas y Virtual D28D + tu gimnasio.',
      desc_admin: 'Programas, gimnasios marca blanca, clases en vivo y galería.',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
      alt: 'Sesión de entrenamiento grupal',
    },
    'food-plan': {
      title: 'Plan de Alimentación',
      desc: 'Tu alimentación guiada por tu equipo.',
      desc_admin: 'Calculadora, alimentos, equivalentes, recetas y registro.',
      img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
      alt: 'Plato saludable',
    },
    training: {
      title: 'Entrenadores',
      desc: 'Tu rutina del día y seguimiento con tu coach.',
      desc_admin: 'Rutinas, galería y usuarios asignados.',
      img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
      alt: 'Entrenamiento personalizado',
    },
    gym: {
      title: 'Gimnasio',
      desc: 'Tu marca, usuarios y vigencias del gimnasio.',
      desc_admin: 'Marca blanca, usuarios y operación del gym.',
      img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      alt: 'Gimnasio marca blanca',
    },
    'live-classes': {
      title: 'Clases en Vivo',
      desc: 'Agenda de clases en vivo y links de reunión.',
      desc_admin: 'Plantillas de clases, links de Zoom y asistencia.',
      img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
      alt: 'Clase en vivo de fitness',
    },
  },
  masters: {
    d28d: {
      title: 'D28D',
      desc: 'Programas (Vital, Pancitas, Virtual), clases en vivo, galería y gimnasios marca blanca.',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
      alt: 'Programas D28D',
    },
    'food-plan': {
      title: 'Plan de Alimentación',
      desc: 'Calculadora, catálogo de alimentos, recetas, equivalentes y planes nutricionales.',
      img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
      alt: 'Plan de alimentación',
    },
    training: {
      title: 'Entrenadores',
      desc: 'Entrenadores, rutinas, galería de videos y asignación de usuarios.',
      img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
      alt: 'Entrenadores y rutinas',
    },
  },
  programs: {
    vital: {
      name: 'Vital D28D',
      desc: 'Bienestar integral y salud femenina.',
      img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=80',
      accent: '#ffd700',
    },
    pancitas: {
      name: 'Pancitas Fit',
      desc: 'Entrenamiento especializado para embarazo.',
      img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
      accent: '#ffd700',
    },
    virtual_d28d: {
      name: 'Virtual D28D',
      desc: 'El programa clásico de transformación en 28 días.',
      img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
      accent: '#ffd700',
    },
  },
  panels: DEFAULT_PANELS,
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[key] = deepMerge(bv, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  }
  return out;
}

const { applyEnglishOverlay } = require('./defaultFrontendI18n');

function normalizeConfig(raw) {
  const merged = deepMerge(DEFAULT_FRONTEND_CONFIG, raw || {});
  return applyEnglishOverlay(merged);
}

module.exports = { DEFAULT_FRONTEND_CONFIG, deepMerge, normalizeConfig };
