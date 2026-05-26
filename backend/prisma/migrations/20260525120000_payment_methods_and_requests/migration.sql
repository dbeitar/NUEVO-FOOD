-- Backfill de migración faltante en repo (ya aplicada en DB local).
-- Objetivo: evitar drift en prisma al comparar historial.

-- Extensiones en payment_links (nombres nuevos)
ALTER TABLE IF EXISTS "payment_links" ADD COLUMN IF NOT EXISTS "online_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS "payment_links" ADD COLUMN IF NOT EXISTS "onsite_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS "payment_links" ADD COLUMN IF NOT EXISTS "onsite_label" VARCHAR(120) DEFAULT 'Pago en sede';

-- Tabla de solicitudes de pago (para confirmación manual / auditoría)
CREATE TABLE IF NOT EXISTS "payment_requests" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "module_code" VARCHAR(32) NOT NULL DEFAULT 'd28d',
  "plan_nombre" VARCHAR(255),
  "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "payment_requests_user_status_idx" ON "payment_requests"("user_id","status");
CREATE INDEX IF NOT EXISTS "payment_requests_module_status_idx" ON "payment_requests"("module_code","status");

DO $$
BEGIN
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

