-- Fase 4: white label Gym Brand + Coach Brand (campos adicionales)
ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "favicon_url" TEXT;
ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "social_links" JSONB DEFAULT '{}';
ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "custom_domain" VARCHAR(255);

ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "favicon_url" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "cover_url" TEXT;
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "social_links" JSONB DEFAULT '{}';
ALTER TABLE "trainers" ADD COLUMN IF NOT EXISTS "custom_domain" VARCHAR(255);
