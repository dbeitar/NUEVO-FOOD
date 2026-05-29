-- Reparación: trainer_id debía existir antes de crear d28d_routines; la migración original no aplicó la columna.
ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "trainer_id" INTEGER;

CREATE INDEX IF NOT EXISTS "d28d_routines_trainer_id_idx" ON "d28d_routines"("trainer_id");

DO $$
BEGIN
  ALTER TABLE "d28d_routines" ADD CONSTRAINT "d28d_routines_trainer_id_fkey"
    FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
