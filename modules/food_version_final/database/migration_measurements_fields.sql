-- Update measurement fields
ALTER TABLE body_measurements
  ADD COLUMN IF NOT EXISTS right_bicep    DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS left_bicep     DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS shoulders      DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS abdomen_above  DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS abdomen_below  DECIMAL(5,1);

-- Migrate existing data (rightArm -> rightBicep, leftArm -> leftBicep, waist -> abdomenAbove)
UPDATE body_measurements SET
  right_bicep   = right_arm,
  left_bicep    = left_arm,
  abdomen_above = waist
WHERE right_arm IS NOT NULL OR left_arm IS NOT NULL OR waist IS NOT NULL;
