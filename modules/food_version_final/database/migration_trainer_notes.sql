-- ============================================================
-- Migration: Create trainer_notes table
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_trainer_notes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS trainer_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_notes_user_id    ON trainer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer_id ON trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_is_read    ON trainer_notes(is_read);

COMMENT ON TABLE trainer_notes IS 'Notas privadas del entrenador al usuario';
