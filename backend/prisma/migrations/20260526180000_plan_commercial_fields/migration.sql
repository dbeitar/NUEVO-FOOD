-- Campos comerciales aditivos (compatibles con datos existentes)
ALTER TABLE "subscription_plans"
  ADD COLUMN IF NOT EXISTS "activo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cycles_count" INTEGER;
