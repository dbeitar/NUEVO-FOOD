-- ============================================================
-- Migration: Add grams_per_unit to food_items
-- Allows foods measured in units (eggs, fruits, etc.)
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_units.sql
-- ============================================================

ALTER TABLE food_items
  ADD COLUMN IF NOT EXISTS grams_per_unit NUMERIC(8,2);

-- Update common unit-based foods with their weight per unit
UPDATE food_items SET unit = 'unidad', grams_per_unit = 50  WHERE LOWER(name) LIKE '%huevo%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 150 WHERE LOWER(name) LIKE '%manzana%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 120 WHERE LOWER(name) LIKE '%naranja%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 120 WHERE LOWER(name) LIKE '%banano%' OR LOWER(name) LIKE '%banana%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 100 WHERE LOWER(name) LIKE '%pera%';

COMMENT ON COLUMN food_items.grams_per_unit IS 'Gramos equivalentes por unidad (ej: 1 huevo = 50g)';
