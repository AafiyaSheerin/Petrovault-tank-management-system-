-- PetroVault Database Migration 003
-- Alerts table for email notifications

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
    'low_stock',
    'high_stock',
    'tank_full',
    'tank_empty',
    'overfill_attempt'
  )),
  message TEXT NOT NULL,
  fill_percentage DECIMAL(5,2),
  current_volume DECIMAL(15,2),
  capacity DECIMAL(15,2),
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert email recipients
-- Admin can set which emails receive alerts
CREATE TABLE IF NOT EXISTS alert_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(100) NOT NULL,
  full_name VARCHAR(100),
  alert_types TEXT[] DEFAULT ARRAY['low_stock', 'high_stock', 'tank_full', 'overfill_attempt'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster alert lookups
CREATE INDEX IF NOT EXISTS idx_alerts_tank_id
  ON alerts(tank_id);

CREATE INDEX IF NOT EXISTS idx_alerts_is_read
 ON alerts(is_read);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at
  ON alerts(created_at DESC);