-- Add macro columns per goal objective
ALTER TABLE nutrition_calc_config
  ADD COLUMN IF NOT EXISTS protein_per_kg_lose     DECIMAL(4,2) DEFAULT 2.2,
  ADD COLUMN IF NOT EXISTS fat_pct_lose            DECIMAL(4,2) DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS protein_per_kg_maintain DECIMAL(4,2) DEFAULT 1.8,
  ADD COLUMN IF NOT EXISTS fat_pct_maintain        DECIMAL(4,2) DEFAULT 0.28,
  ADD COLUMN IF NOT EXISTS protein_per_kg_gain     DECIMAL(4,2) DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS fat_pct_gain            DECIMAL(4,2) DEFAULT 0.22;

-- Update existing record with defaults
UPDATE nutrition_calc_config SET
  protein_per_kg_lose     = 2.2,
  fat_pct_lose            = 0.25,
  protein_per_kg_maintain = 1.8,
  fat_pct_maintain        = 0.28,
  protein_per_kg_gain     = 2.0,
  fat_pct_gain            = 0.22
WHERE id = '00000000-0000-0000-0000-000000000001';
