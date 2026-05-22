ALTER TABLE users ADD COLUMN IF NOT EXISTS shell_user_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shell_branding JSONB;
CREATE INDEX IF NOT EXISTS idx_users_shell_user_id ON users(shell_user_id);
