-- Communication Center (plantillas + bitácora) + soporte WhatsApp por plan

-- Campos WhatsApp por plan (aditivos)
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "support_whatsapp" VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "support_name" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "support_message" TEXT,
  ADD COLUMN IF NOT EXISTS "support_activo" BOOLEAN NOT NULL DEFAULT true;

-- Plantillas
CREATE TABLE IF NOT EXISTS "communication_templates" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(120) NOT NULL,
  "evento" VARCHAR(120) NOT NULL,
  "modulo" VARCHAR(32) NOT NULL,
  "canal" VARCHAR(32) NOT NULL,
  "asunto" VARCHAR(200),
  "contenido" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "editable" BOOLEAN NOT NULL DEFAULT true,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_comm_tpl_evento" ON "communication_templates"("evento");
CREATE INDEX IF NOT EXISTS "idx_comm_tpl_modulo" ON "communication_templates"("modulo");
CREATE INDEX IF NOT EXISTS "idx_comm_tpl_canal" ON "communication_templates"("canal");
CREATE INDEX IF NOT EXISTS "idx_comm_tpl_activo" ON "communication_templates"("activo");

-- Logs de eventos (salidas + clics wa.me)
CREATE TABLE IF NOT EXISTS "communication_event_logs" (
  "id" SERIAL PRIMARY KEY,
  "evento" VARCHAR(120) NOT NULL,
  "modulo" VARCHAR(32) NOT NULL,
  "canal" VARCHAR(32) NOT NULL,
  "estado" VARCHAR(24) NOT NULL,
  "user_id" INTEGER,
  "target" VARCHAR(160),
  "template_id" INTEGER,
  "payload" JSONB DEFAULT '{}'::jsonb,
  "error" TEXT,
  "message" TEXT,
  "clicked_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "fk_comm_event_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "fk_comm_event_template" FOREIGN KEY ("template_id") REFERENCES "communication_templates"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_comm_log_evento" ON "communication_event_logs"("evento");
CREATE INDEX IF NOT EXISTS "idx_comm_log_modulo" ON "communication_event_logs"("modulo");
CREATE INDEX IF NOT EXISTS "idx_comm_log_canal" ON "communication_event_logs"("canal");
CREATE INDEX IF NOT EXISTS "idx_comm_log_estado" ON "communication_event_logs"("estado");
CREATE INDEX IF NOT EXISTS "idx_comm_log_user" ON "communication_event_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_comm_log_created" ON "communication_event_logs"("created_at");

