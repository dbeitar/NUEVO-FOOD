-- ============================================================
-- Migration: Allow recipe logs in food_logs
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_recipe_logs.sql
-- ============================================================

-- Make food_item_id nullable (for recipe logs)
ALTER TABLE food_logs ALTER COLUMN food_item_id DROP NOT NULL;

-- Add recipe_id reference
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS recipe_name VARCHAR;

CREATE INDEX IF NOT EXISTS idx_food_logs_recipe_id ON food_logs(recipe_id);

COMMENT ON COLUMN food_logs.recipe_id IS 'Si el log viene de una receta del Chef Nico';
COMMENT ON COLUMN food_logs.recipe_name IS 'Nombre de la receta al momento del registro';
