ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "in_person_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "in_person_label" VARCHAR(120) DEFAULT 'Pago en sede';
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "online_label" VARCHAR(120) DEFAULT 'Pago en línea (Wompi)';
