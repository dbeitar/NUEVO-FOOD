ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "training_user_id" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "users_training_user_id_idx" ON "users"("training_user_id");
