const JsonStore = require('../utils/JsonStore');
const TrainersDatabase = require('./TrainersDatabase');

class TrainerMastersDatabase {
  constructor() {
    this.store = new JsonStore('trainer_masters.json', []);
    this.rows = this.store.getAll() || [];
    this.ensureForExistingTrainers();
  }

  ensureForExistingTrainers() {
    let changed = false;
    TrainersDatabase.getAll().forEach((trainer) => {
      if (!this.rows.find((row) => row.trainer_id === trainer.id)) {
        this.rows.push(this.defaultForTrainer(trainer));
        changed = true;
      }
    });
    if (changed) this.save();
  }

  defaultForTrainer(trainer) {
    return {
      trainer_id: trainer.id,
      gym_id: trainer.gym_id || null,
      owner_scope: `trainer:${trainer.id}`,
      gallery_scope: `trainer:${trainer.id}:gallery`,
      training_scope: `trainer:${trainer.id}:training`,
      nutrition_scope: `trainer:${trainer.id}:nutrition`,
      assigned_user_ids: [],
      modules: {
        training: {
          can_create_routines: true,
          can_edit_own_routines: true,
          can_manage_own_gallery: true,
          default_method: trainer.especialidad || 'Entrenamiento personalizado',
        },
        nutrition: {
          can_create_full_plans: true,
          can_adjust_assigned_user_parameters: true,
          default_strategy: 'personalized_macros',
        },
        d28d: {
          can_view_locked_templates: true,
          can_edit_d28d: false,
          can_copy_templates: false,
        },
        live_classes: {
          can_schedule_for_assigned_users: true,
          can_view_d28d_calendar: true,
          attendance_trigger: 'join_zoom_click',
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  save() {
    this.store.setAll(this.rows);
  }

  getAll() {
    this.ensureForExistingTrainers();
    return this.rows;
  }

  getByTrainerId(trainerId) {
    this.ensureForExistingTrainers();
    return this.rows.find((row) => row.trainer_id === Number(trainerId)) || null;
  }

  update(trainerId, updates) {
    const row = this.getByTrainerId(trainerId);
    if (!row) return null;
    Object.assign(row, updates, {
      modules: {
        ...row.modules,
        ...(updates.modules || {}),
      },
      updated_at: new Date().toISOString(),
    });
    this.save();
    return row;
  }

  assignUser(trainerId, userId) {
    const row = this.getByTrainerId(trainerId);
    if (!row) return null;
    const current = Array.isArray(row.assigned_user_ids) ? row.assigned_user_ids : [];
    if (!current.includes(Number(userId))) {
      row.assigned_user_ids = [...current, Number(userId)];
      row.updated_at = new Date().toISOString();
      this.save();
    }
    return row;
  }
}

module.exports = new TrainerMastersDatabase();
