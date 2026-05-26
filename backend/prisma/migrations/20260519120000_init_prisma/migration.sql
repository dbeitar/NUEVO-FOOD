-- CreateTable
CREATE TABLE IF NOT EXISTS "json_collections" (
    "name" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "json_collections_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_json_collections_updated" ON "json_collections"("updated_at");

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "level" VARCHAR(20),
    "event" VARCHAR(255),
    "trace_id" VARCHAR(100),
    "metadata" JSONB,
    "message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_logs_trace" ON "audit_logs"("trace_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_level" ON "audit_logs"("level");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs"("created_at");
