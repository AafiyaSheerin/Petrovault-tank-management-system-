-- PetroVault Migration 006
-- Add litres_per_cm + cone_capacity_litres to tanks for CM-based dip conversion
-- Expand shape constraint to support all 17 tank types

-- Add the CM conversion fields
ALTER TABLE tanks
  ADD COLUMN IF NOT EXISTS litres_per_cm DECIMAL(10,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cone_capacity_litres DECIMAL(15,2) DEFAULT NULL;

-- Drop old shape constraint and recreate with all 17 shapes
ALTER TABLE tanks DROP CONSTRAINT IF EXISTS tanks_shape_check;
ALTER TABLE tanks ADD CONSTRAINT tanks_shape_check CHECK (shape IN (
  'vertical_cylinder_flat',
  'vertical_cylinder_cone',
  'vertical_cylinder_sloped',
  'vertical_cylinder_tori',
  'vertical_cylinder_ellipsoidal',
  'vertical_cylinder_hemispherical',
  'horizontal_cylinder',
  'horizontal_cylinder_flat',
  'horizontal_cylinder_dished',
  'horizontal_cylinder_hemispherical',
  'rectangular',
  'rectangular_flat',
  'cube_ibc',
  'spherical',
  'sphere_horton',
  'spheroid_flat',
  'rectangular_prismatic',
  -- legacy (keep backwards compat)
  'cone_bottom',
  'cylinder',
  'dome_top'
));

-- Global system settings table for alert toggle etc.
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
VALUES ('email_alerts_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
