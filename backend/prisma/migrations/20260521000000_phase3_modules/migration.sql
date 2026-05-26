-- Fase 2-6: licencias, payment links, coach branding, training_plan_rows

ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "brand_name" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "brand_slug" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "white_label_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "support_whatsapp" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "primary_color" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "secondary_color" TEXT;

CREATE TABLE IF NOT EXISTS "module_licenses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "module_code" VARCHAR(32) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "source" VARCHAR(32) NOT NULL DEFAULT 'invite',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_licenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "module_licenses_user_id_module_code_key" ON "module_licenses"("user_id", "module_code");
CREATE INDEX IF NOT EXISTS "module_licenses_user_id_active_idx" ON "module_licenses"("user_id", "active");

ALTER TABLE "module_licenses" ADD CONSTRAINT "module_licenses_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payment_links" (
    "id" SERIAL NOT NULL,
    "module_code" VARCHAR(32) NOT NULL,
    "label" TEXT,
    "payment_url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_links_module_code_key" ON "payment_links"("module_code");

CREATE TABLE IF NOT EXISTS "training_plan_rows" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "trainer_id" INTEGER,
    "payload" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plan_rows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "training_plan_rows_user_id_idx" ON "training_plan_rows"("user_id");
CREATE INDEX IF NOT EXISTS "training_plan_rows_trainer_id_idx" ON "training_plan_rows"("trainer_id");
