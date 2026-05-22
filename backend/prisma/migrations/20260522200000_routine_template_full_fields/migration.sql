-- Maestro de Rutinas D28D: campos operativos completos (compatibilidad con IDs existentes)

ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "objetivo" VARCHAR(64);
ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "duracion" VARCHAR(64);
ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "notas_tecnicas" TEXT;
ALTER TABLE "d28d_routines" ADD COLUMN IF NOT EXISTS "equipamiento" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "d28d_routine_blocks" ADD COLUMN IF NOT EXISTS "tecnica" VARCHAR(120);
ALTER TABLE "d28d_routine_blocks" ADD COLUMN IF NOT EXISTS "duracion" VARCHAR(64);
ALTER TABLE "d28d_routine_blocks" ADD COLUMN IF NOT EXISTS "descanso" VARCHAR(64);
ALTER TABLE "d28d_routine_blocks" ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

ALTER TABLE "d28d_routine_exercises" ADD COLUMN IF NOT EXISTS "series" VARCHAR(64);
ALTER TABLE "d28d_routine_exercises" ADD COLUMN IF NOT EXISTS "tempo" VARCHAR(64);
ALTER TABLE "d28d_routine_exercises" ADD COLUMN IF NOT EXISTS "intensidad" VARCHAR(64);
ALTER TABLE "d28d_routine_exercises" ADD COLUMN IF NOT EXISTS "variantes" JSONB NOT NULL DEFAULT '{}';

-- Backfill objetivo desde nivel cuando aplique
UPDATE "d28d_routines"
SET "objetivo" = CASE
  WHEN LOWER("nivel") IN ('principiante', 'intermedio', 'avanzado') THEN 'mantenimiento'
  ELSE NULL
END
WHERE "objetivo" IS NULL;
