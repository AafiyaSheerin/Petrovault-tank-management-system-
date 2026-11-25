-- PetroVault Database Migration 005
-- Tank history table for graphs and reports

CREATE TABLE IF NOT EXISTS tank_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  tank_name VARCHAR(50),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(100),
  action VARCHAR(20) NOT NULL CHECK (action IN (
    'add_stock',
    'remove_stock',
    'initial_set'
  )),
  volume_before DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  volume_after DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  volume_changed DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  fill_percentage_before DECIMAL(5,2) DEFAULT 0.00,
  fill_percentage_after DECIMAL(5,2) DEFAULT 0.00,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_by_name VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily summary view for reports
CREATE OR REPLACE VIEW daily_tank_summary AS
SELECT
  tank_id,
  tank_name,
  product_name,
  DATE(created_at) AS summary_date,
  MIN(fill_percentage_after) AS min_fill,
  MAX(fill_percentage_after) AS max_fill,
  AVG(fill_percentage_after) AS avg_fill,
  SUM(CASE WHEN action = 'add_stock' THEN volume_changed ELSE 0 END) AS total_added,
  SUM(CASE WHEN action = 'remove_stock' THEN volume_changed ELSE 0 END) AS total_removed,
  COUNT(*) AS total_transactions
FROM tank_history
GROUP BY tank_id, tank_name, product_name, DATE(created_at)
ORDER BY summary_date DESC;

-- Index for faster history lookups
CREATE INDEX IF NOT EXISTS idx_tank_history_tank_id
  ON tank_history(tank_id);

CREATE INDEX IF NOT EXISTS idx_tank_history_created_at
  ON tank_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tank_history_action
  ON tank_history(action);