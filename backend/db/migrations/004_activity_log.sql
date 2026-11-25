-- PetroVault Database Migration 004
-- Activity log table for audit trail

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50),
  role VARCHAR(20),
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'login',
    'logout',
    'add_stock',
    'remove_stock',
    'add_tank',
    'edit_tank',
    'delete_tank',
    'add_product',
    'edit_product',
    'delete_product',
    'add_employee',
    'edit_employee',
    'delete_employee',
    'update_permissions',
    'grant_tank_access',
    'revoke_tank_access',
    'export_pdf',
    'export_sheets',
    'view_report',
    'send_alert'
  )),
  description TEXT NOT NULL,
  tank_id UUID REFERENCES tanks(id) ON DELETE SET NULL,
  tank_name VARCHAR(50),
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster log lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id
  ON activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_action
  ON activity_log(action);

CREATE INDEX IF NOT EXISTS idx_activity_log_tank_id
  ON activity_log(tank_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
  ON activity_log(created_at DESC);