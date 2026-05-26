const { useRelationalStorage } = require('../utils/storageMode');

async function hydrateAll() {
  if (!useRelationalStorage()) return;

  const userDB = require('../models/UserDatabase');
  const gymDB = require('../models/GymDatabase');
  const trainerDB = require('../models/TrainersDatabase');
  const cyclesDB = require('../models/CyclesDatabase');
  const accountsDB = require('../models/AccountsDatabase');
  const liveDB = require('../models/LiveClassDatabase');
  const programDB = require('../models/ProgramSettingsDatabase');
  const foodDB = require('../models/FoodDatabase');
  const hydrateFoods = foodDB.hydrate;
  const userPlanStore = require('../models/UserPlanStore');

  const tasks = [
    userDB.hydrate?.(),
    gymDB.hydrate?.(),
    trainerDB.hydrate?.(),
    cyclesDB.hydrate?.(),
    accountsDB.hydrate?.(),
    liveDB.hydrate?.(),
    programDB.hydrate?.(),
    require('../models/D28dChallengeStore').hydrate?.(),
    hydrateFoods?.(),
    userPlanStore.hydrate?.(),
    hydrateDomainStores(),
  ].filter(Boolean);

  await Promise.all(tasks);
  console.log('[hydrate] Modelos cargados desde PostgreSQL relacional');
}

async function hydrateDomainStores() {
  const domainRepo = require('./repositories/domainDocumentRepository');
  const trainingPlans = require('../models/TrainingPlansStore');
  const trainingLog = require('../models/TrainingLogStore');
  const dailyFood = require('../models/DailyFoodLog');
  const exercises = require('../models/ExercisesGalleryStore');
  const fitness = require('../models/FitnessTestDatabase');
  const masters = require('../models/TrainerMastersDatabase');
  const ecosystem = require('../models/EcosystemSettings');

  if (trainingPlans.hydrate) await trainingPlans.hydrate();
  if (trainingLog.hydrateFromRelational) await trainingLog.hydrateFromRelational();
  const coachTraining = require('../services/coachTrainingService');
  if (coachTraining.hydrateCoachNotifications) await coachTraining.hydrateCoachNotifications();
  if (dailyFood.hydrateFromRelational) await dailyFood.hydrateFromRelational();
  if (exercises.hydrate) await exercises.hydrate();
  const bodyMeas = require('../models/BodyMeasurementStore');
  if (bodyMeas.hydrate) await bodyMeas.hydrate();
  if (fitness.hydrate) await fitness.hydrate();
  if (masters.hydrate) await masters.hydrate();
  if (ecosystem.hydrate) await ecosystem.hydrate();

  for (const col of domainRepo.COLLECTIONS) {
    const payload = await domainRepo.getPayload(col);
    if (payload === null) continue;
  }
}

module.exports = { hydrateAll };
