-- Vínculo shell D28D ↔ usuario Food Plan (UUID)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "food_user_id" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "users_food_user_id_idx" ON "users"("food_user_id");
