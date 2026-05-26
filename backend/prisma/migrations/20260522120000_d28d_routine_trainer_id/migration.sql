-- Aislar rutinas de coach marca blanca por trainer_id
ALTER TABLE IF EXISTS "d28d_routines" ADD COLUMN IF NOT EXISTS "trainer_id" INTEGER;
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "d28d_routines_trainer_id_idx" ON "d28d_routines"("trainer_id");
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "d28d_routines" ADD CONSTRAINT "d28d_routines_trainer_id_fkey"
    FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;
