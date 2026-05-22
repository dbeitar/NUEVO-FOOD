-- Add 4 photo columns to body_measurements
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS photo_url_2 VARCHAR(500);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS photo_url_3 VARCHAR(500);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS photo_url_4 VARCHAR(500);
