const GymDatabase = require('../models/GymDatabase');
const TrainersDatabase = require('../models/TrainersDatabase');
const userRepo = require('../db/repositories/userRepository');
const gymRepo = require('../db/repositories/gymRepository');
const trainerRepo = require('../db/repositories/trainerRepository');
const { useRelationalStorage } = require('../utils/storageMode');

async function loadTrainer(id) {
  if (!id) return null;
  if (useRelationalStorage()) return trainerRepo.findById(id);
  return TrainersDatabase.getById(Number(id));
}

async function loadGym(id) {
  if (!id) return null;
  if (useRelationalStorage()) return gymRepo.findById(id);
  return GymDatabase.getById(Number(id));
}

async function resolveBrandingForUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) return null;

  let brand = null;
  if (user.trainer_id) {
    const trainer = await loadTrainer(user.trainer_id);
    if (trainer) {
      brand = {
        level: 'coach',
        trainer_id: trainer.id,
        gym_id: trainer.gym_id || user.gym_id || null,
        logo_url: trainer.logo_url || '',
        favicon_url: trainer.favicon_url || '',
        cover_url: trainer.cover_url || '',
        brand_name: trainer.brand_name || trainer.nombre,
        welcome_message: trainer.welcome_message || '',
        primary_color: trainer.primary_color || '#2563eb',
        secondary_color: trainer.secondary_color || '#10b981',
        support_whatsapp: trainer.support_whatsapp || '',
        social_links: trainer.social_links || {},
        custom_domain: trainer.custom_domain || null,
      };
    }
  }
  if (!brand && user.gym_id) {
    const gym = await loadGym(user.gym_id);
    if (gym && gym.white_label_enabled !== false) {
      brand = {
        level: 'gym',
        gym_id: gym.id,
        logo_url: gym.logo_url || '',
        favicon_url: gym.favicon_url || '',
        cover_url: gym.cover_url || '',
        brand_name: gym.brand_name || gym.nombre,
        welcome_message: gym.welcome_message || '',
        primary_color: gym.primary_color || '#2563eb',
        secondary_color: gym.secondary_color || '#10b981',
        support_whatsapp: gym.support_whatsapp || '',
        social_links: gym.social_links || {},
        custom_domain: gym.custom_domain || null,
      };
    }
  }
  return brand;
}

module.exports = { resolveBrandingForUser };
