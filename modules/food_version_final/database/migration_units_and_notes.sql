-- ============================================================
-- Migration: grams_per_unit for food_items + trainer notes
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_units_and_notes.sql
-- ============================================================

-- 1. Add grams_per_unit column to food_items
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS grams_per_unit DECIMAL(8,2);

-- 2. Update common unit-based foods
UPDATE food_items SET unit = 'unidad', grams_per_unit = 60  WHERE LOWER(name) LIKE '%huevo%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 120 WHERE LOWER(name) LIKE '%banano%' OR LOWER(name) LIKE '%banana%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 180 WHERE LOWER(name) LIKE '%manzana%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 130 WHERE LOWER(name) LIKE '%naranja%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 30  WHERE LOWER(name) LIKE '%galleta%';
UPDATE food_items SET unit = 'unidad', grams_per_unit = 25  WHERE LOWER(name) LIKE '%tostada%';

-- 3. Create trainer_notes table
CREATE TABLE IF NOT EXISTS trainer_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_notes_student ON trainer_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer ON trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_unread  ON trainer_notes(student_id, is_read);

COMMENT ON TABLE trainer_notes IS 'Notas/mensajes del entrenador al asesorado';
