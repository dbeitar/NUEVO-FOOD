-- ============================================================
-- Training Module - Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'USER');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');
CREATE TYPE plan_type AS ENUM ('TRAINING_BASIC', 'TRAINING_PRO', 'TRAINING_COACH');

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'USER',
  shell_user_id INTEGER UNIQUE,
  shell_branding JSONB,
  shell_gym_id INTEGER,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trainer_code VARCHAR(10) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_protected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_trainer_id ON users(trainer_id);
CREATE INDEX idx_users_shell_user_id ON users(shell_user_id);

-- ─── PLANS (training license) ────────────────────────────────
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name plan_type UNIQUE NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  payment_reference VARCHAR(100),
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, status);

-- ─── TRAINING PLANS ──────────────────────────────────────────
CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL DEFAULT 'Plan de entrenamiento',
  description TEXT,
  level VARCHAR(40) DEFAULT 'intermedio',
  split_type VARCHAR(40) DEFAULT 'full_body',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_plans_user ON training_plans(user_id, is_active);

CREATE TABLE training_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(80) NOT NULL,
  notes TEXT,
  UNIQUE(plan_id, day_index)
);

CREATE TABLE training_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES training_plan_days(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name VARCHAR(200) NOT NULL,
  sets INTEGER DEFAULT 3,
  reps VARCHAR(40) DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT
);

-- ─── WORKOUT LOGS ────────────────────────────────────────────
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  day_id UUID REFERENCES training_plan_days(id) ON DELETE SET NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercises JSONB NOT NULL DEFAULT '[]',
  duration_minutes INTEGER,
  perceived_effort INTEGER,
  notes TEXT,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, log_date DESC);

-- ─── TRAINER NOTES ───────────────────────────────────────────
CREATE TABLE trainer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trainer_notes_user ON trainer_notes(user_id, created_at DESC);

-- ─── SEED ────────────────────────────────────────────────────
INSERT INTO plans (name, display_name, price, duration_days, features) VALUES
('TRAINING_BASIC', 'Licencia Training Básica', 0, 30, '["workout_logs","view_plan"]'),
('TRAINING_PRO', 'Licencia Training Pro', 29.99, 30, '["workout_logs","view_plan","trainer_notes"]'),
('TRAINING_COACH', 'Licencia Coach', 0, 365, '["coach_dashboard","manage_plans","students"]');

-- ─── PAYMENT NOTIFICATIONS (coach / admin) ─────────────────────
CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL DEFAULT 'pago_pendiente',
  mensaje TEXT NOT NULL,
  meta JSONB,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paynotif_coach ON payment_notifications(coach_id, leida);

-- Super Admin created by BootstrapService on startup
