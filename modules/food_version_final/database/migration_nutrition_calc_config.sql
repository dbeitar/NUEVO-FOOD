-- ============================================================
-- Migration: Nutrition calculation config
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_nutrition_calc_config.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS nutrition_calc_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Harris-Benedict coefficients (Male)
  bmr_male_base       DECIMAL(8,3) DEFAULT 66.47,
  bmr_male_weight     DECIMAL(8,3) DEFAULT 13.75,
  bmr_male_height     DECIMAL(8,3) DEFAULT 5.003,
  bmr_male_age        DECIMAL(8,3) DEFAULT 6.755,
  -- Harris-Benedict coefficients (Female)
  bmr_female_base     DECIMAL(8,3) DEFAULT 655.1,
  bmr_female_weight   DECIMAL(8,3) DEFAULT 9.563,
  bmr_female_height   DECIMAL(8,3) DEFAULT 1.850,
  bmr_female_age      DECIMAL(8,3) DEFAULT 4.676,
  -- Activity factors
  factor_sedentary    DECIMAL(5,3) DEFAULT 1.2,
  factor_light        DECIMAL(5,3) DEFAULT 1.375,
  factor_moderate     DECIMAL(5,3) DEFAULT 1.55,
  factor_active       DECIMAL(5,3) DEFAULT 1.725,
  factor_very_active  DECIMAL(5,3) DEFAULT 1.9,
  -- Goal adjustments (kcal)
  goal_lose           INT DEFAULT -500,
  goal_maintain       INT DEFAULT 0,
  goal_gain           INT DEFAULT 300,
  -- Macro ratios
  protein_per_kg      DECIMAL(4,2) DEFAULT 1.8,
  fat_pct_calories    DECIMAL(4,2) DEFAULT 0.25,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO nutrition_calc_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Features master table
CREATE TABLE IF NOT EXISTS plan_features (
  key VARCHAR(100) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default features
INSERT INTO plan_features (key, label, description, sort_order) VALUES
('macro_calculator',    'Calculadora de Macros',        'Cálculo automático de calorías y macronutrientes', 1),
('food_log',            'Registro de Alimentos',        'Registro diario de alimentos consumidos', 2),
('personal_nutrition',  'Plan Nutricional Personalizado','Plan calculado según perfil del usuario', 3),
('chatbot',             'Chatbot Nutricional IA',       'Asistente inteligente de nutrición', 4),
('food_replacement',    'Reemplazos de Alimentos',      'Sugerencias de equivalencias y reemplazos', 5),
('barcode_scanner',     'Escáner de Código de Barras',  'Escanear productos para registrar alimentos', 6),
('recipes',             'Recetas del Chef',             'Acceso a recetas saludables', 7),
('daily_report',        'Reporte Diario de Bienestar',  'Registro de estado físico y emocional diario', 8),
('measurements',        'Medidas Corporales',           'Seguimiento de medidas y peso corporal', 9),
('water_tracking',      'Seguimiento de Hidratación',   'Control de vasos de agua diarios', 10),
('steps_tracking',      'Seguimiento de Pasos',         'Registro de pasos diarios', 11),
('choose_trainer',       'Elegir Entrenador',           'Vincularse con un entrenador personal', 12),
('join_gym',            'Unirse a Gimnasio',            'Asociarse a un gimnasio', 13),
('trainer_tracking',    'Seguimiento del Entrenador',   'El entrenador puede ver tu progreso', 14),
('trainer_notes',       'Notas del Entrenador',         'Recibir y responder notas del entrenador', 15),
('appointments',        'Citas con Entrenador',         'Agendar reuniones con el entrenador', 16),
('video_sessions',      'Sesiones por Video',           'Videollamadas con el entrenador', 17)
ON CONFLICT (key) DO NOTHING;
