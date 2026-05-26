-- UX Adherence Phase: Retos, Progress, FAQ, Help, Audit

CREATE TABLE IF NOT EXISTS "d28d_challenges" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(255) NOT NULL,
  "descripcion" TEXT NOT NULL,
  "objetivo" TEXT,
  "premio" VARCHAR(500),
  "imagen_url" VARCHAR(512),
  "program_id" VARCHAR(64),
  "cycle_id" INTEGER,
  "fecha_inicio" TIMESTAMP(3) NOT NULL,
  "fecha_fin" TIMESTAMP(3) NOT NULL,
  "estado" VARCHAR(32) NOT NULL DEFAULT 'draft',
  "reglas" JSONB,
  "cantidad_ganadores" INTEGER NOT NULL DEFAULT 3,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por_id" INTEGER NOT NULL,
  "publicado_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "d28d_challenges_program_id_estado_idx" ON "d28d_challenges"("program_id", "estado");
CREATE INDEX IF NOT EXISTS "d28d_challenges_fecha_inicio_fecha_fin_idx" ON "d28d_challenges"("fecha_inicio", "fecha_fin");

CREATE TABLE IF NOT EXISTS "d28d_challenge_entries" (
  "id" SERIAL PRIMARY KEY,
  "challenge_id" INTEGER NOT NULL REFERENCES "d28d_challenges"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL,
  "estado" VARCHAR(32) NOT NULL DEFAULT 'registered',
  "puntuacion" DECIMAL(5,2),
  "comentario" TEXT,
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawn_at" TIMESTAMP(3),
  "submitted_at" TIMESTAMP(3),
  UNIQUE("challenge_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "d28d_challenge_entries_user_id_idx" ON "d28d_challenge_entries"("user_id");

CREATE TABLE IF NOT EXISTS "d28d_challenge_evidences" (
  "id" SERIAL PRIMARY KEY,
  "entry_id" INTEGER NOT NULL REFERENCES "d28d_challenge_entries"("id") ON DELETE CASCADE,
  "tipo" VARCHAR(32) NOT NULL,
  "url" TEXT,
  "contenido" TEXT,
  "mime" VARCHAR(128),
  "size_bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "d28d_challenge_evidences_entry_id_idx" ON "d28d_challenge_evidences"("entry_id");

CREATE TABLE IF NOT EXISTS "d28d_challenge_podium" (
  "id" SERIAL PRIMARY KEY,
  "challenge_id" INTEGER NOT NULL REFERENCES "d28d_challenges"("id") ON DELETE CASCADE,
  "lugar" INTEGER NOT NULL,
  "entry_id" INTEGER NOT NULL,
  UNIQUE("challenge_id", "lugar")
);

CREATE TABLE IF NOT EXISTS "d28d_user_progress_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "program_id" VARCHAR(64),
  "classes_scheduled" INTEGER NOT NULL DEFAULT 0,
  "classes_attended" INTEGER NOT NULL DEFAULT 0,
  "attendance_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "challenges_joined" INTEGER NOT NULL DEFAULT 0,
  "challenges_done" INTEGER NOT NULL DEFAULT 0,
  "challenges_won" INTEGER NOT NULL DEFAULT 0,
  "active_days" INTEGER NOT NULL DEFAULT 0,
  "traffic_light" VARCHAR(16) NOT NULL DEFAULT 'yellow',
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "d28d_user_progress_snapshots_user_id_computed_at_idx" ON "d28d_user_progress_snapshots"("user_id", "computed_at");

CREATE TABLE IF NOT EXISTS "training_traffic_light_snapshots" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "trainer_id" INTEGER,
  "status" VARCHAR(16) NOT NULL,
  "adherence_pct" DECIMAL(5,2) NOT NULL,
  "window_days" INTEGER NOT NULL DEFAULT 7,
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "training_traffic_light_snapshots_user_id_computed_at_idx" ON "training_traffic_light_snapshots"("user_id", "computed_at");
CREATE INDEX IF NOT EXISTS "training_traffic_light_snapshots_trainer_id_idx" ON "training_traffic_light_snapshots"("trainer_id");

CREATE TABLE IF NOT EXISTS "faq_categories" (
  "id" SERIAL PRIMARY KEY,
  "modulo" VARCHAR(32) NOT NULL,
  "nombre" VARCHAR(120) NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS "faq_categories_modulo_activo_idx" ON "faq_categories"("modulo", "activo");

CREATE TABLE IF NOT EXISTS "faq_items" (
  "id" SERIAL PRIMARY KEY,
  "category_id" INTEGER NOT NULL REFERENCES "faq_categories"("id") ON DELETE CASCADE,
  "pregunta" VARCHAR(500) NOT NULL,
  "respuesta" TEXT NOT NULL,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "visible_roles" JSONB,
  "util_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "faq_items_category_id_activo_idx" ON "faq_items"("category_id", "activo");

CREATE TABLE IF NOT EXISTS "help_assistant_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "modulo" VARCHAR(32) NOT NULL,
  "query" TEXT NOT NULL,
  "matched_faq_id" INTEGER,
  "escalated_whatsapp" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "help_assistant_logs_modulo_created_at_idx" ON "help_assistant_logs"("modulo", "created_at");

CREATE TABLE IF NOT EXISTS "platform_audit_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "modulo" VARCHAR(32) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "entity" VARCHAR(64),
  "entity_id" VARCHAR(64),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "platform_audit_events_modulo_action_idx" ON "platform_audit_events"("modulo", "action");
CREATE INDEX IF NOT EXISTS "platform_audit_events_user_id_created_at_idx" ON "platform_audit_events"("user_id", "created_at");
