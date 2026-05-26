const EcosystemSettings = require('../models/EcosystemSettings');
const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const { hydrateAccess } = require('../utils/accessControl');

const getOverview = (req, res) => {
  try {
    const userAccess = hydrateAccess(req.user || {});
    const gyms = GymDatabase.getAll();
    const trainers = TrainersDatabase.getAll();
    const brands = gyms.map((gym) => ({
      id: gym.id,
      nombre: gym.nombre,
      brand_name: gym.brand_name || gym.nombre,
      brand_slug: gym.brand_slug,
      is_d28d: gym.brand_slug === 'd28d-marca-blanca',
      module_access: EcosystemSettings.getBrandModuleAccess(gym),
      plan_id: gym.plan_id || null,
      white_label_enabled: gym.white_label_enabled !== false,
    }));

    return res.json({
      success: true,
      data: {
        modules: EcosystemSettings.getModules(),
        brands,
        trainer_defaults: trainers.map((trainer) => EcosystemSettings.getTrainerDefaults(trainer)),
        access: userAccess,
        rules: {
          d28d_locked_for_gyms: true,
          attendance_trigger: 'join_zoom_click',
          nutrition_owner: 'trainer',
          users_can_have_multiple_roles: true,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo ecosistema:', error);
    return res.status(500).json({ error: 'Error obteniendo ecosistema modular' });
  }
};

module.exports = { getOverview };
