-- Planes comerciales por programa + pareja + ciclos + precios USD

-- 1) Extender subscription_plans
ALTER TABLE IF EXISTS "subscription_plans"
  ADD COLUMN IF NOT EXISTS "kind" VARCHAR(32) NOT NULL DEFAULT 'd28d',
  ADD COLUMN IF NOT EXISTS "module_access" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "is_couple" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "included_seats" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "precio_mensual_usd" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "subscription_plans_program_id_idx" ON "subscription_plans"("program_id");
CREATE INDEX IF NOT EXISTS "subscription_plans_kind_idx" ON "subscription_plans"("kind");

-- 2) Extender user_accounts (pareja + ciclo)
ALTER TABLE IF EXISTS "user_accounts"
  ADD COLUMN IF NOT EXISTS "primary_account_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "couple_invite_code" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "couple_invite_used_by_user_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "cycle_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "user_accounts_couple_invite_code_key" ON "user_accounts"("couple_invite_code");
CREATE INDEX IF NOT EXISTS "user_accounts_primary_account_id_idx" ON "user_accounts"("primary_account_id");
CREATE INDEX IF NOT EXISTS "user_accounts_cycle_id_idx" ON "user_accounts"("cycle_id");

DO $$
BEGIN
  ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_primary_account_id_fkey"
    FOREIGN KEY ("primary_account_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_cycle_id_fkey"
    FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- 3) Códigos de invitación por programa
CREATE TABLE IF NOT EXISTS "program_invite_codes" (
  "code" VARCHAR(64) NOT NULL,
  "program_id" VARCHAR(64) NOT NULL,
  "label" VARCHAR(120),
  "suggested_plan_nombre" VARCHAR(255),
  "module_preset" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "program_invite_codes_pkey" PRIMARY KEY ("code")
);
CREATE INDEX IF NOT EXISTS "program_invite_codes_program_id_idx" ON "program_invite_codes"("program_id");

-- 4) Asociación plan ↔ ciclos (muchos a muchos)
CREATE TABLE IF NOT EXISTS "subscription_plan_cycles" (
  "plan_nombre" VARCHAR(255) NOT NULL,
  "cycle_id" INTEGER NOT NULL,
  CONSTRAINT "subscription_plan_cycles_pkey" PRIMARY KEY ("plan_nombre","cycle_id")
);
CREATE INDEX IF NOT EXISTS "subscription_plan_cycles_cycle_id_idx" ON "subscription_plan_cycles"("cycle_id");

DO $$
BEGIN
  ALTER TABLE "subscription_plan_cycles" ADD CONSTRAINT "subscription_plan_cycles_plan_nombre_fkey"
    FOREIGN KEY ("plan_nombre") REFERENCES "subscription_plans"("nombre") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "subscription_plan_cycles" ADD CONSTRAINT "subscription_plan_cycles_cycle_id_fkey"
    FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- 5) Completar payment_links con columnas usadas por el backend (si faltan)
ALTER TABLE IF EXISTS "payment_links"
  ADD COLUMN IF NOT EXISTS "online_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onsite_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onsite_label" VARCHAR(120);

