-- ============================================================
-- Food Plan - Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TRAINER', 'USER');
CREATE TYPE plan_type AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');
CREATE TYPE meal_type AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'CUSTOM');
CREATE TYPE traffic_light_status AS ENUM ('GREEN', 'YELLOW', 'RED');
CREATE TYPE appointment_type AS ENUM ('IN_PERSON', 'VIRTUAL');
CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE reminder_channel AS ENUM ('EMAIL', 'PUSH', 'SMS');
CREATE TYPE reminder_status AS ENUM ('SENT', 'FAILED', 'QUEUED');

-- ─── GYMS ────────────────────────────────────────────────────
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  unique_code VARCHAR(12) UNIQUE NOT NULL,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  id_number VARCHAR(30) UNIQUE,
  role user_role NOT NULL DEFAULT 'USER',
  is_active BOOLEAN DEFAULT TRUE,
  is_protected BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  cv_url TEXT,
  trainer_code VARCHAR(10) UNIQUE,
  measurement_reminder BOOLEAN DEFAULT FALSE,
  gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
  trainer_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

ALTER TABLE users ADD CONSTRAINT fk_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE gyms ADD CONSTRAINT fk_gym_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;


-- ─── USER PROFILES ───────────────────────────────────────────
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  birth_date DATE,
  gender VARCHAR(20),
  goal_type VARCHAR(30) DEFAULT 'MAINTAIN',
  activity_level VARCHAR(20) DEFAULT 'MODERATE',
  has_dietary_restrictions BOOLEAN DEFAULT FALSE,
  dietary_restrictions_detail TEXT,
  accepted_privacy_policy BOOLEAN DEFAULT FALSE,
  accepted_terms BOOLEAN DEFAULT FALSE,
  daily_calories DECIMAL(8,2),
  daily_protein_g DECIMAL(8,2),
  daily_carbs_g DECIMAL(8,2),
  daily_fat_g DECIMAL(8,2),
  trainer_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);



-- ─── BODY MEASUREMENTS ──────────────────────────────────────
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  neck DECIMAL(5,1),
  chest DECIMAL(5,1),
  right_arm DECIMAL(5,1),
  left_arm DECIMAL(5,1),
  right_forearm DECIMAL(5,1),
  left_forearm DECIMAL(5,1),
  waist DECIMAL(5,1),
  hip DECIMAL(5,1),
  glute DECIMAL(5,1),
  right_thigh DECIMAL(5,1),
  left_thigh DECIMAL(5,1),
  right_calf DECIMAL(5,1),
  left_calf DECIMAL(5,1),
  weight DECIMAL(5,1),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── PLANS ───────────────────────────────────────────────────
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name plan_type UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP NOT NULL,
  status subscription_status NOT NULL DEFAULT 'ACTIVE',
  payment_reference VARCHAR(100),
  amount_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── FOOD ITEMS ──────────────────────────────────────────────
CREATE TABLE food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  calories_per_100g DECIMAL(8,2) NOT NULL,
  protein_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0,
  carbs_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0,
  fat_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0,
  fiber_per_100g DECIMAL(8,2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'g',
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_food_items_name ON food_items USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_food_items_category ON food_items(category);

-- ─── FOOD LOGS ───────────────────────────────────────────────
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES food_items(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type meal_type NOT NULL,
  quantity_grams DECIMAL(8,2) NOT NULL,
  calories DECIMAL(8,2) NOT NULL,
  protein DECIMAL(8,2) NOT NULL,
  carbs DECIMAL(8,2) NOT NULL,
  fat DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date);

-- ─── WATER LOGS ─────────────────────────────────────────────
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INTEGER NOT NULL DEFAULT 1,
  goal INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ─── USER NUTRITION GOALS ────────────────────────────────────
CREATE TABLE user_nutrition_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_calories DECIMAL(8,2) NOT NULL DEFAULT 2000,
  daily_protein_g DECIMAL(8,2) NOT NULL DEFAULT 150,
  daily_carbs_g DECIMAL(8,2) NOT NULL DEFAULT 250,
  daily_fat_g DECIMAL(8,2) NOT NULL DEFAULT 65,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  goal_type VARCHAR(30) DEFAULT 'MAINTAIN',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── NUTRITION TRAFFIC LIGHT CONFIG ─────────────────────────
CREATE TABLE nutrition_traffic_light (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  green_min_days INTEGER NOT NULL DEFAULT 5,
  yellow_min_days INTEGER NOT NULL DEFAULT 3,
  red_max_days INTEGER NOT NULL DEFAULT 2,
  compliance_threshold_pct DECIMAL(5,2) DEFAULT 80.00,
  evaluation_window_days INTEGER DEFAULT 7,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── FOOD EQUIVALENCES ───────────────────────────────────────
CREATE TABLE food_equivalences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_food_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  replacement_food_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  original_quantity_g DECIMAL(8,2) NOT NULL DEFAULT 100,
  replacement_quantity_g DECIMAL(8,2) NOT NULL,
  notes TEXT,
  UNIQUE(original_food_id, replacement_food_id)
);

-- ─── APPOINTMENTS ────────────────────────────────────────────
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  type appointment_type NOT NULL DEFAULT 'VIRTUAL',
  status appointment_status NOT NULL DEFAULT 'PENDING',
  meet_link TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── REMINDER LOGS ───────────────────────────────────────────
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sent_by_id UUID NOT NULL REFERENCES users(id),
  sent_to_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  channel reminder_channel NOT NULL DEFAULT 'EMAIL',
  status reminder_status NOT NULL DEFAULT 'QUEUED',
  sent_at TIMESTAMP DEFAULT NOW()
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Plans
INSERT INTO plans (name, display_name, price, duration_days, features) VALUES
('BASIC', 'Plan Básico', 19.99, 30, '["macro_calculator","food_log","personal_nutrition","chatbot","food_replacement"]'),
('INTERMEDIATE', 'Plan Intermedio', 39.99, 30, '["macro_calculator","food_log","personal_nutrition","chatbot","food_replacement","choose_trainer","join_gym","trainer_tracking"]'),
('ADVANCED', 'Plan Avanzado', 59.99, 30, '["macro_calculator","food_log","personal_nutrition","chatbot","food_replacement","choose_trainer","join_gym","trainer_tracking","appointments","video_sessions"]');

-- Traffic Light Config (default)
INSERT INTO nutrition_traffic_light (green_min_days, yellow_min_days, red_max_days, compliance_threshold_pct, evaluation_window_days)
VALUES (5, 3, 2, 80.00, 7);

-- Super Admin is created automatically by the NestJS SeedService on startup
-- with email: superadmin@Foodplan.com and password: Admin123!

-- Food Items (base dataset)
INSERT INTO food_items (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g) VALUES
('Pollo a la plancha', 'Carnes', 165, 31, 0, 3.6, 0),
('Arroz blanco cocido', 'Cereales', 130, 2.7, 28, 0.3, 0.4),
('Papa cocida', 'Tubérculos', 87, 1.9, 20, 0.1, 1.8),
('Pasta cocida', 'Cereales', 131, 5, 25, 1.1, 1.8),
('Quinua cocida', 'Cereales', 120, 4.4, 21.3, 1.9, 2.8),
('Atún en agua', 'Pescados', 116, 25.5, 0, 1.0, 0),
('Huevo entero', 'Huevos', 155, 13, 1.1, 11, 0),
('Clara de huevo', 'Huevos', 52, 11, 0.7, 0.2, 0),
('Leche entera', 'Lácteos', 61, 3.2, 4.8, 3.3, 0),
('Yogur griego natural', 'Lácteos', 59, 10, 3.6, 0.4, 0),
('Aguacate', 'Frutas', 160, 2, 9, 15, 7),
('Plátano', 'Frutas', 89, 1.1, 23, 0.3, 2.6),
('Manzana', 'Frutas', 52, 0.3, 14, 0.2, 2.4),
('Brócoli', 'Verduras', 34, 2.8, 7, 0.4, 2.6),
('Espinaca', 'Verduras', 23, 2.9, 3.6, 0.4, 2.2),
('Zanahoria', 'Verduras', 41, 0.9, 10, 0.2, 2.8),
('Almendras', 'Frutos secos', 579, 21, 22, 50, 12.5),
('Avena', 'Cereales', 389, 17, 66, 7, 10.6),
('Carne de res magra', 'Carnes', 217, 26, 0, 12, 0),
('Salmón', 'Pescados', 208, 20, 0, 13, 0),
('Aceite de oliva', 'Grasas', 884, 0, 0, 100, 0),
('Pan integral', 'Cereales', 247, 13, 41, 4.2, 6.8),
('Lentejas cocidas', 'Legumbres', 116, 9, 20, 0.4, 7.9),
('Frijoles negros cocidos', 'Legumbres', 132, 8.9, 24, 0.5, 8.7),
('Tomate', 'Verduras', 18, 0.9, 3.9, 0.2, 1.2),
('Pepino', 'Verduras', 15, 0.7, 3.6, 0.1, 0.5),
('Cebolla', 'Verduras', 40, 1.1, 9.3, 0.1, 1.7),
('Ajo', 'Condimentos', 149, 6.4, 33, 0.5, 2.1),
('Leche de almendras', 'Lácteos', 17, 0.6, 0.6, 1.4, 0.4),
('Proteína de suero (whey)', 'Suplementos', 400, 80, 8, 5, 0),
-- Carnes adicionales
('Pechuga de pollo cocida', 'Carnes', 165, 31, 0, 3.6, 0),
('Muslo de pollo sin piel', 'Carnes', 177, 22, 0, 9.5, 0),
('Carne molida 90% magra', 'Carnes', 175, 21, 0, 10, 0),
('Lomo de cerdo', 'Carnes', 143, 26, 0, 4, 0),
('Pavo molido', 'Carnes', 149, 21, 0, 7, 0),
('Jamón de pavo', 'Carnes', 101, 15, 2, 4, 0),
('Salchicha de pollo', 'Carnes', 172, 14, 4, 11, 0),
('Costilla de res', 'Carnes', 291, 18, 0, 24, 0),
-- Pescados y mariscos
('Tilapia al vapor', 'Pescados', 128, 26, 0, 2.7, 0),
('Sardina en aceite', 'Pescados', 208, 24, 0, 11, 0),
('Camarón cocido', 'Pescados', 99, 24, 0, 0.3, 0),
('Merluza al horno', 'Pescados', 90, 20, 0, 1.3, 0),
('Trucha cocida', 'Pescados', 190, 22, 0, 11, 0),
('Bacalao cocido', 'Pescados', 105, 23, 0, 0.9, 0),
-- Lácteos adicionales
('Queso cottage', 'Lácteos', 98, 11, 3.4, 4.3, 0),
('Queso mozzarella', 'Lácteos', 280, 28, 2.2, 17, 0),
('Queso cheddar', 'Lácteos', 402, 25, 1.3, 33, 0),
('Leche descremada', 'Lácteos', 34, 3.4, 5, 0.1, 0),
('Queso ricotta', 'Lácteos', 174, 11, 3, 13, 0),
('Kéfir natural', 'Lácteos', 52, 3.5, 4.8, 1.5, 0),
('Crema de leche', 'Lácteos', 340, 2.8, 2.8, 36, 0),
-- Huevos adicionales
('Huevo cocido', 'Huevos', 155, 13, 1.1, 11, 0),
('Huevo frito', 'Huevos', 196, 13, 0.4, 15, 0),
('Huevo revuelto con leche', 'Huevos', 149, 10, 2.2, 11, 0),
-- Cereales y granos
('Arroz integral cocido', 'Cereales', 111, 2.6, 23, 0.9, 1.8),
('Pan blanco', 'Cereales', 265, 9, 51, 3.2, 2.7),
('Maíz cocido', 'Cereales', 86, 3.3, 19, 1.4, 2),
('Arepas de maíz', 'Cereales', 218, 4.5, 40, 3.8, 1.2),
('Granola', 'Cereales', 471, 10, 64, 20, 6),
('Cebada cocida', 'Cereales', 123, 2.3, 28, 0.4, 3.8),
('Tortilla de maíz', 'Cereales', 218, 5.7, 46, 2.5, 6.3),
('Muesli sin azúcar', 'Cereales', 360, 11, 64, 6.9, 7.4),
('Pan de centeno', 'Cereales', 259, 8.5, 48, 3.3, 5.8),
-- Tubérculos y raíces
('Papa frita al horno', 'Tubérculos', 150, 3, 33, 1.7, 3),
('Yuca cocida', 'Tubérculos', 160, 1.4, 38, 0.3, 1.8),
('Batata cocida', 'Tubérculos', 86, 1.6, 20, 0.1, 3),
('Ñame cocido', 'Tubérculos', 118, 1.5, 28, 0.2, 4.1),
-- Legumbres
('Garbanzos cocidos', 'Legumbres', 164, 8.9, 27, 2.6, 7.6),
('Fríjoles rojos cocidos', 'Legumbres', 127, 8.7, 22.8, 0.5, 6.4),
('Arvejas cocidas', 'Legumbres', 84, 5.4, 15.6, 0.4, 5.5),
('Soya cocida', 'Legumbres', 173, 16.6, 10, 9, 6),
('Tofu firme', 'Legumbres', 76, 8, 1.9, 4.8, 0.3),
('Edamame', 'Legumbres', 121, 11.9, 8.9, 5.2, 5.2),
-- Verduras adicionales
('Lechuga', 'Verduras', 15, 1.4, 2.9, 0.2, 1.3),
('Pimentón rojo', 'Verduras', 31, 1, 6, 0.3, 2.1),
('Pimentón verde', 'Verduras', 20, 0.9, 4.6, 0.2, 1.7),
('Calabacín cocido', 'Verduras', 17, 1.2, 3.6, 0.3, 1.1),
('Berenjena cocida', 'Verduras', 35, 0.8, 8.7, 0.2, 2.5),
('Coliflor cocida', 'Verduras', 23, 1.9, 4.1, 0.2, 2.3),
('Coles de Bruselas', 'Verduras', 36, 3, 7.1, 0.3, 2.6),
('Remolacha cocida', 'Verduras', 44, 1.7, 10, 0.2, 2),
('Apio', 'Verduras', 16, 0.7, 3, 0.2, 1.6),
('Champiñones cocidos', 'Verduras', 28, 2.2, 5.3, 0.4, 2.2),
('Espárragos cocidos', 'Verduras', 20, 2.2, 3.9, 0.2, 2.1),
-- Frutas adicionales
('Naranja', 'Frutas', 47, 0.9, 12, 0.1, 2.4),
('Mango', 'Frutas', 60, 0.8, 15, 0.4, 1.6),
('Papaya', 'Frutas', 43, 0.5, 11, 0.3, 1.7),
('Fresas', 'Frutas', 32, 0.7, 7.7, 0.3, 2),
('Uvas', 'Frutas', 69, 0.7, 18, 0.2, 0.9),
('Pera', 'Frutas', 57, 0.4, 15, 0.1, 3.1),
('Kiwi', 'Frutas', 61, 1.1, 15, 0.5, 3),
('Piña', 'Frutas', 50, 0.5, 13, 0.1, 1.4),
('Sandía', 'Frutas', 30, 0.6, 7.6, 0.2, 0.4),
('Melocotón', 'Frutas', 39, 0.9, 9.5, 0.3, 1.5),
('Melón', 'Frutas', 34, 0.8, 8.2, 0.2, 0.9),
-- Frutos secos y semillas
('Nueces', 'Frutos secos', 654, 15, 14, 65, 6.7),
('Maní tostado', 'Frutos secos', 585, 23, 21, 49, 9),
('Mantequilla de maní', 'Frutos secos', 588, 25, 20, 50, 6),
('Semillas de chía', 'Frutos secos', 486, 17, 42, 31, 34),
('Semillas de linaza', 'Frutos secos', 534, 18, 29, 42, 27),
('Semillas de girasol', 'Frutos secos', 584, 21, 20, 51, 8.6),
('Semillas de calabaza', 'Frutos secos', 559, 30, 11, 49, 6),
('Pistacho', 'Frutos secos', 562, 20, 28, 45, 10),
('Marañón tostado', 'Frutos secos', 553, 15, 30, 44, 3.3),
-- Bebidas
('Leche de coco', 'Bebidas', 197, 2, 5.5, 21, 0),
('Jugo de naranja natural', 'Bebidas', 45, 0.7, 10, 0.2, 0.2),
('Smoothie de frutas sin azúcar', 'Bebidas', 55, 0.8, 13, 0.3, 1.2),
-- Salsas y condimentos
('Salsa de tomate', 'Condimentos', 82, 4.3, 18, 0.5, 4.2),
('Aceite de coco', 'Grasas', 862, 0, 0, 100, 0),
('Mantequilla', 'Grasas', 717, 0.9, 0.1, 81, 0),
('Miel', 'Condimentos', 304, 0.3, 82, 0, 0.2),
-- Comidas típicas colombianas
('Bandeja paisa (porción)', 'Comidas', 650, 38, 62, 24, 8),
('Sancocho de pollo (plato)', 'Comidas', 280, 22, 30, 7, 3),
('Changua (taza)', 'Comidas', 120, 7, 10, 5, 0.5),
('Arepa con queso', 'Comidas', 265, 9, 42, 7, 1.5),
('Empanada de pipián', 'Comidas', 195, 4, 28, 7.5, 2),
('Tamale (1 unidad)', 'Comidas', 320, 14, 38, 12, 3),

-- Más frutas
('Guayaba', 'Frutas', 68, 2.6, 14, 1, 5.4),
('Maracuyá', 'Frutas', 97, 2.2, 23, 0.7, 10.4),
('Granadilla', 'Frutas', 97, 2.2, 23, 0.7, 10.4),
('Mandarina', 'Frutas', 53, 0.8, 13, 0.3, 1.8),
('Ciruela', 'Frutas', 46, 0.7, 11, 0.3, 1.4),
('Cereza', 'Frutas', 50, 1, 12, 0.3, 1.6),
('Mora', 'Frutas', 43, 1.4, 10, 0.5, 5.3),
('Arándanos', 'Frutas', 57, 0.7, 14, 0.3, 2.4),

-- Más verduras
('Repollo', 'Verduras', 25, 1.3, 6, 0.1, 2.5),
('Repollo morado', 'Verduras', 31, 1.4, 7, 0.2, 2.1),
('Acelga', 'Verduras', 19, 1.8, 3.7, 0.2, 1.6),
('Rábano', 'Verduras', 16, 0.7, 3.4, 0.1, 1.6),
('Pepinillo', 'Verduras', 12, 0.5, 2.2, 0.1, 1),
('Okra', 'Verduras', 33, 1.9, 7, 0.2, 3.2),

-- Más proteínas
('Pechuga de pavo', 'Carnes', 135, 30, 0, 1, 0),
('Carne de cerdo magra', 'Carnes', 242, 27, 0, 14, 0),
('Pollo desmechado', 'Carnes', 190, 29, 0, 7, 0),
('Albóndigas de res', 'Carnes', 250, 26, 5, 15, 0),

-- Más pescados
('Atún fresco', 'Pescados', 144, 23, 0, 5, 0),
('Pargo rojo', 'Pescados', 128, 26, 0, 1.7, 0),
('Bagre', 'Pescados', 105, 18, 0, 4, 0),

-- Más legumbres
('Habichuelas', 'Legumbres', 127, 8.7, 23, 0.5, 6.4),
('Lentejas rojas', 'Legumbres', 116, 9, 20, 0.4, 7.9),
('Frijol pinto', 'Legumbres', 143, 9, 27, 0.6, 9),

-- Más carbohidratos
('Cuscús cocido', 'Cereales', 112, 3.8, 23, 0.2, 1.4),
('Fideos de arroz', 'Cereales', 109, 2, 25, 0.2, 0.9),
('Pan pita', 'Cereales', 275, 9, 55, 1.2, 2.2),
('Pan de avena', 'Cereales', 246, 10, 41, 4, 6),

-- Snacks
('Galletas integrales', 'Snacks', 450, 6, 70, 18, 7),
('Barra de proteína', 'Snacks', 370, 30, 35, 12, 5),
('Palomitas de maíz', 'Snacks', 387, 12, 78, 4, 15),
('Chips de papa', 'Snacks', 536, 7, 53, 35, 4),

-- Comida rápida
('Hamburguesa sencilla', 'Comidas', 295, 17, 30, 12, 2),
('Pizza de queso (porción)', 'Comidas', 266, 11, 33, 10, 2),
('Perro caliente', 'Comidas', 290, 10, 26, 18, 1),
('Papas fritas', 'Comidas', 312, 3.4, 41, 15, 3.8),

-- Fitness
('Pechuga de pollo al horno', 'Fitness', 165, 31, 0, 3.6, 0),
('Batido de proteína', 'Fitness', 120, 24, 3, 1.5, 0),
('Yogur griego alto en proteína', 'Fitness', 59, 10, 3.6, 0.4, 0),
('Claras de huevo cocidas', 'Fitness', 52, 11, 0.7, 0.2, 0),

-- Desayunos comunes
('Cereal de maíz', 'Desayuno', 357, 8, 84, 0.4, 3),
('Pan con mantequilla', 'Desayuno', 300, 8, 40, 12, 2),
('Huevos con tomate', 'Desayuno', 160, 10, 5, 11, 1),

-- Bebidas adicionales
('Café negro', 'Bebidas', 2, 0.3, 0, 0, 0),
('Café con leche', 'Bebidas', 45, 3, 5, 1.5, 0),
('Té verde', 'Bebidas', 1, 0, 0, 0, 0),
('Agua de coco', 'Bebidas', 19, 0.7, 4, 0.2, 1),

-- Postres
('Helado de vainilla', 'Postres', 207, 3.5, 24, 11, 0),
('Chocolate negro', 'Postres', 546, 4.9, 61, 31, 7),
('Brownie', 'Postres', 466, 5, 60, 24, 2),
('Flan', 'Postres', 146, 4, 23, 4, 0),

-- Comidas colombianas extra
('Ajiaco', 'Comidas', 250, 20, 22, 8, 3),
('Arroz con pollo', 'Comidas', 230, 16, 30, 6, 2),
('Caldo de costilla', 'Comidas', 150, 18, 3, 7, 0),
('Patacones', 'Comidas', 268, 2.3, 40, 12, 3),
('Arroz con coco', 'Comidas', 210, 3, 36, 6, 2);


-- Arroz -> papa
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Papa cocida'),
200,240,'Equivalencia de carbohidratos'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Arroz blanco cocido')
AND EXISTS (SELECT 1 FROM food_items WHERE name='Papa cocida');

-- Arroz -> pasta
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Pasta cocida'),
200,200,'Carbohidratos similares'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Arroz blanco cocido')
AND EXISTS (SELECT 1 FROM food_items WHERE name='Pasta cocida');

-- Arroz -> quinua
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Quinua cocida'),
200,180,'Más proteína y fibra'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Arroz blanco cocido')
AND EXISTS (SELECT 1 FROM food_items WHERE name='Quinua cocida');

-- Arroz -> yuca
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Yuca cocida'),
200,220,'Equivalencia energética'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Yuca cocida');

-- Arroz -> batata
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Batata cocida'),
200,230,'Carbohidratos complejos'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Batata cocida');

-- Arroz -> lentejas
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Arroz blanco cocido'),
(SELECT id FROM food_items WHERE name='Lentejas cocidas'),
200,190,'Más proteína vegetal'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Lentejas cocidas');

-- Pollo -> atún
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Pollo a la plancha'),
(SELECT id FROM food_items WHERE name='Atún en agua'),
150,180,'Equivalencia proteica'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Atún en agua');

-- Pollo -> salmón
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Pollo a la plancha'),
(SELECT id FROM food_items WHERE name='Salmón'),
150,160,'Proteína con grasas omega 3'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Salmón');

-- Pollo -> carne magra
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Pollo a la plancha'),
(SELECT id FROM food_items WHERE name='Carne de res magra'),
150,150,'Proteína similar'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Carne de res magra');

-- Pollo -> huevo
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Pollo a la plancha'),
(SELECT id FROM food_items WHERE name='Huevo entero'),
150,200,'Equivalencia proteica aproximada'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Huevo entero');

-- Pollo -> tofu
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Pollo a la plancha'),
(SELECT id FROM food_items WHERE name='Tofu firme'),
150,250,'Alternativa vegetariana'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Tofu firme');

-- Aceite oliva -> aguacate
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Aceite de oliva'),
(SELECT id FROM food_items WHERE name='Aguacate'),
10,70,'Grasas saludables equivalentes'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Aguacate');

-- Aceite oliva -> almendras
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Aceite de oliva'),
(SELECT id FROM food_items WHERE name='Almendras'),
10,20,'Grasa saludable'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Almendras');

-- Aceite oliva -> nueces
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Aceite de oliva'),
(SELECT id FROM food_items WHERE name='Nueces'),
10,18,'Omega 3'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Nueces');

-- Manzana -> pera
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Manzana'),
(SELECT id FROM food_items WHERE name='Pera'),
150,150,'Frutas similares'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Pera');

-- Banano -> mango
INSERT INTO food_equivalences (original_food_id, replacement_food_id, original_quantity_g, replacement_quantity_g, notes)
SELECT
(SELECT id FROM food_items WHERE name='Plátano'),
(SELECT id FROM food_items WHERE name='Mango'),
120,150,'Carbohidratos similares'
WHERE EXISTS (SELECT 1 FROM food_items WHERE name='Mango');