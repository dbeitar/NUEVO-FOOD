-- ============================================================
-- Migration: Create recipes table (Chef Nico)
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_recipes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR NOT NULL,
  description   TEXT,
  category      VARCHAR,        -- Desayuno, Almuerzo, Cena, Snack, Postre
  objective     VARCHAR,        -- LOSE, GAIN, MAINTAIN
  image_url     VARCHAR,
  ingredients   TEXT NOT NULL,  -- JSON array
  steps         TEXT NOT NULL,  -- JSON array
  prep_time_min INT,
  servings      INT DEFAULT 1,
  calories      NUMERIC(8,2),
  protein       NUMERIC(8,2),
  carbs         NUMERIC(8,2),
  fat           NUMERIC(8,2),
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_category  ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_objective ON recipes(objective);
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON recipes(is_active);

COMMENT ON TABLE recipes IS 'Biblioteca de recetas del Chef Nico';
