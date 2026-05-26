-- ============================================================
-- Migration: Create daily_reports table
-- Run this in your PostgreSQL database once:
--   docker exec -i fitplatform_db psql -U fituser -d fitplatform < database/migration_daily_reports.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date   DATE NOT NULL,

  weight_kg     NUMERIC(5,2),

  -- Performance factors
  performance   VARCHAR(20),   -- MUY_MALO | MALO | NORMAL | BUENO | MUY_BUENO
  motivation    VARCHAR(20),
  hunger        VARCHAR(20),   -- MUY_BAJO | BAJO | NORMAL | ALTO | MUY_ALTO
  fatigue       VARCHAR(20),
  stress        VARCHAR(20),

  -- Sleep
  sleep_hours   NUMERIC(4,1),
  sleep_quality VARCHAR(20),   -- MUY_MALA | MALA | NORMAL | BUENA | MUY_BUENA

  -- Female-specific (optional)
  period        VARCHAR(20),   -- NO | SI | INICIO | MEDIO | FIN
  mood          VARCHAR(20),
  symptoms      TEXT,          -- comma-separated list (TypeORM simple-array)
  other_notes   TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_reports_user_date_unique UNIQUE (user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);

COMMENT ON TABLE daily_reports IS 'Reporte diario de bienestar del usuario (opcional)';
