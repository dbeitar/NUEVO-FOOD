-- ============================================================
-- Migration: Water goal, steps goal, measurement reminder config
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_water_steps_reminders.sql
-- ============================================================

-- Add water and steps targets to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_water_glasses INT DEFAULT 8;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_steps INT DEFAULT 8000;

-- Measurement reminder config per trainer
CREATE TABLE IF NOT EXISTS measurement_reminder_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  frequency_days INT DEFAULT 7,
  send_email BOOLEAN DEFAULT true,
  send_note BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  message TEXT DEFAULT 'Hola {nombre}, es momento de registrar tus medidas corporales. ¡Hagamos seguimiento a tu progreso!',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add usual_meals table for nutrition page
CREATE TABLE IF NOT EXISTS usual_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  meal_type VARCHAR(20) DEFAULT 'LUNCH',
  items JSONB NOT NULL DEFAULT '[]',
  total_calories DECIMAL(8,2) DEFAULT 0,
  total_protein DECIMAL(8,2) DEFAULT 0,
  total_carbs DECIMAL(8,2) DEFAULT 0,
  total_fat DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usual_meals_user ON usual_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_measurement_reminder_trainer ON measurement_reminder_config(trainer_id);

-- Daily steps tracking table
CREATE TABLE IF NOT EXISTS daily_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  steps INT NOT NULL DEFAULT 0,
  step_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, step_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date ON daily_steps(user_id, step_date);
