-- ============================================================
-- Migration: Notification templates + note replies
-- docker exec -i foodplan_db psql -U fituser -d fitplatform < database/migration_notifications_replies.sql
-- ============================================================

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL CHECK (level IN ('RED', 'YELLOW', 'GREEN')),
  subject VARCHAR(255) DEFAULT 'Recordatorio de tu plan nutricional',
  message TEXT NOT NULL,
  send_email BOOLEAN DEFAULT true,
  send_note BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trainer_id, level)
);

-- Add author and parent_id to trainer_notes
ALTER TABLE trainer_notes ADD COLUMN IF NOT EXISTS author VARCHAR(10) DEFAULT 'TRAINER';
ALTER TABLE trainer_notes ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES trainer_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_templates_trainer ON notification_templates(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_parent ON trainer_notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_author ON trainer_notes(author);

COMMENT ON TABLE notification_templates IS 'Plantillas de notificaciones automáticas por semáforo';
