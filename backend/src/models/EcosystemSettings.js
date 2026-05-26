const JsonStore = require('../utils/JsonStore');

const initial = [
  {
    id: 'gym',
    name: 'Gym / Marca Blanca',
    description: 'Gestiona sedes, marca, entrenadores, usuarios y acceso a modulos.',
    white_label_enabled: true,
    locked: false,
    compatible_modules: ['training', 'nutrition', 'live_classes', 'd28d'],
  },
  {
    id: 'd28d',
    name: 'D28D',
    description: 'Modulo especial con marca blanca, galeria, calendario y clases bloqueadas para consumo de gyms.',
    white_label_enabled: true,
    locked: true,
    compatible_modules: ['gym', 'training', 'nutrition', 'live_classes'],
  },
  {
    id: 'training',
    name: 'Entrenamiento',
    description: 'Rutinas, galerias, maestros y seguimiento por entrenador.',
    white_label_enabled: true,
    locked: false,
    compatible_modules: ['gym', 'd28d', 'nutrition'],
  },
  {
    id: 'nutrition',
    name: 'Alimentacion',
    description: 'Planes nutricionales asignados a usuarios y administrados por entrenadores.',
    white_label_enabled: true,
    locked: false,
    compatible_modules: ['gym', 'd28d', 'training'],
  },
  {
    id: 'live_classes',
    name: 'Clases en Vivo',
    description: 'Calendarios mensuales, semanales, diarios, cupos, Zoom y asistencia.',
    white_label_enabled: true,
    locked: false,
    compatible_modules: ['gym', 'd28d', 'training'],
  },
];

class EcosystemSettings {
  constructor() {
    this.store = new JsonStore('ecosystem_modules.json', initial);
    this.modules = this.store.getAll();
  }

  getModules() {
    return this.modules;
  }

  getModule(id) {
    return this.modules.find((item) => item.id === id) || null;
  }

  getBrandModuleAccess(gym) {
    if (!gym) return {};
    const raw = gym.module_access || {};
    return {
      gym: raw.gym !== false,
      d28d: raw.d28d !== false,
      training: raw.training !== false,
      nutrition: raw.nutrition !== false,
      live_classes: raw.live_classes !== false,
    };
  }

  getTrainerDefaults(trainer) {
    return {
      trainer_id: trainer?.id || null,
      gym_id: trainer?.gym_id || null,
      owns_gallery: true,
      owns_training_templates: true,
      owns_nutrition_parameters: true,
      can_use_d28d_locked_templates: true,
    };
  }
}

module.exports = new EcosystemSettings();
