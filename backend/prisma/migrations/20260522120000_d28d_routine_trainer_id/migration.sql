-- Aislar rutinas de coach marca blanca por trainer_id
ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "trainer_id" INTEGER;
CREATE INDEX IF NOT EXISTS "d28d_routines_trainer_id_idx" ON "d28d_routines"("trainer_id");
ALTER TABLE "d28d_routines" ADD CONSTRAINT "d28d_routines_trainer_id_fkey"
  FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
