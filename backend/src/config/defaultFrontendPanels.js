/** Tarjetas y heroes de paneles admin (maestro de apariencia). */
function card(title, desc, img = '', alt = '') {
  return { title, desc, img, alt: alt || title };
}

const DEFAULT_PANELS = {
  'food-plan': {
    hero: {
      title: 'Plan de Alimentación',
      subtitle: 'Planes, alimentos y herramientas nutricionales.',
      img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    },
    cards: {
      adminusers: card('Usuarios', 'Personas con plan nutricional asignado.'),
      admin: card('Configurar planes', 'Define o ajusta el plan de cada usuario.'),
      progress: card('Seguimiento', 'Cumplimiento y evolución nutricional de los usuarios.'),
      calculator: card('Calculadora nutricional', 'Calcula una referencia inicial para el usuario.'),
      foodsmanager: card('Alimentos (catálogo)', 'Lista de alimentos, macros y porciones de referencia.'),
      foodlog: card('Registro de comidas', 'Diario nutricional de los usuarios.'),
      equivalentes: card('Equivalentes por grupo', 'Sustituciones manteniendo macros.'),
      recipes: card('Recetas', 'Biblioteca de recetas saludables.'),
      modulevigencias: card('Vigencias', 'Confirmación de pagos y extensiones de licencia.'),
    },
  },
  training: {
    hero: {
      title: 'Entrenadores',
      subtitle: 'Rutinas, asignación a usuarios y seguimiento.',
      img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    },
    cards: {
      training: card('Mi entrenamiento', 'Vista de la rutina del día con sustituciones asistidas.'),
      admintraining: card('Rutinas', 'Plantillas, asignaciones y diario de entrenamiento.'),
      admintrainers: card('Entrenadores', 'Alta de coaches, capacidad y usuarios vinculados.'),
      coachai: card('Asistente IA', 'Genera rutinas y planes desde tu galería.'),
      admingallery: card('Galería de videos', 'Videos por ejercicio (referencia visual).'),
      adminusers: card('Usuarios asignados', 'Listado de personas y sus rutinas asignadas.'),
      progress: card('Seguimiento', 'Adherencia y avance de tus usuarios.'),
    },
  },
  gym: {
    hero: {
      title: 'Gimnasio',
      subtitle: 'Marca blanca, usuarios y vigencias. Las clases D28D siguen en el módulo D28D.',
      img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    },
    cards: {
      admingyms: card('Mi marca', 'Logo, colores, mensaje y WhatsApp de soporte.'),
      adminusers: card('Usuarios', 'Altas, roles y licencias por módulo.'),
      adminplans: card('Vigencias', 'Cuentas y fechas de vencimiento.'),
      liveclasses: card('Clases en vivo', 'Ver clases D28D habilitadas para tu gym.'),
    },
  },
  d28d: {
    hero: {
      title: 'D28D · Programas',
      subtitle: 'Programas, clases en vivo y galería de videos.',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    },
    cards: {
      liveclasses: card('Clases en vivo y reuniones', 'Programa plantillas y calendario con links de Zoom.'),
      programs: card('Programas D28D', 'Ciclos y configuración de los 3 programas principales.'),
      'd28d-routines': card('Rutinas D28D', 'Plantillas de rutinas para clases en vivo y entrenamiento.'),
      'd28d-challenges-admin': card('Retos D28D', 'Crea retos, participantes, evidencias y podio de ganadores.'),
      admingallery: card('Galería de videos', 'Videos por ejercicio para rutinas y clases.'),
      adminliveclasses: card('Clases en vivo (sede)', 'Agenda y asistencia de clases para tu gimnasio.'),
      admingyms: card('Gimnasios', 'Branding, equipo y configuración de marca blanca.'),
      adminusers: card('Usuarios de gimnasios', 'Listado y gestión de personas afiliadas.'),
      admincompanies: card('Empresas y convenios', 'Convenios corporativos y agrupaciones.'),
    },
  },
  'live-classes': {
    hero: {
      title: 'Clases en Vivo',
      subtitle: 'Agenda, plantillas y links de reunión.',
      img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
    },
    cards: {},
  },
};

module.exports = { DEFAULT_PANELS };
