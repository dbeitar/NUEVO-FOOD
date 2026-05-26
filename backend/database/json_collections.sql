-- Almacén documental: cada fila = un archivo JSON histórico (users.json, gyms.json, …)
-- Usado cuando USE_PG_STORAGE=true. Sin Prisma.

CREATE TABLE IF NOT EXISTS json_collections (
  name VARCHAR(255) PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_json_collections_updated ON json_collections(updated_at);
