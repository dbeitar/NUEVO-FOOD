CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('ATHLETE', 'COACH', 'ADMIN', 'SUPER_ADMIN');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(120) NOT NULL DEFAULT 'Usuario',
  last_name VARCHAR(120) NOT NULL DEFAULT '',
  phone VARCHAR(40),
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'ATHLETE',
  shell_user_id INT UNIQUE,
  shell_trainer_id INT,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  trainer_code VARCHAR(32) UNIQUE,
  shell_branding JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE training_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  level VARCHAR(40) DEFAULT 'principiante',
  method VARCHAR(80) DEFAULT 'D28D',
  split_type VARCHAR(40) DEFAULT 'full_body',
  days JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES training_plans(id) ON DELETE SET NULL,
  day INT NOT NULL DEFAULT 1,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercises JSONB NOT NULL DEFAULT '[]',
  completado BOOLEAN NOT NULL DEFAULT FALSE,
  duration_minutes INT NOT NULL DEFAULT 0,
  trainer_notes TEXT DEFAULT '',
  wellness JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exercise_gallery (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  muscle_group VARCHAR(80) DEFAULT '',
  video_url VARCHAR(500) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_shell ON users(shell_user_id);
CREATE INDEX idx_users_trainer ON users(trainer_id);
CREATE INDEX idx_plans_user ON training_plans(user_id);
CREATE INDEX idx_logs_user ON workout_logs(user_id);
CREATE INDEX idx_gallery_coach ON exercise_gallery(coach_id);
