-- PetroVault Database Migration 002
-- Employee permissions and tank access control

-- Employee permissions table
CREATE TABLE IF NOT EXISTS employee_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  can_view_tanks BOOLEAN DEFAULT true,
  can_add_stock BOOLEAN DEFAULT false,
  can_edit_tank BOOLEAN DEFAULT false,
  can_delete_tank BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_view_logs BOOLEAN DEFAULT false,
  can_convert_volume BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee tank access table
-- Controls which tanks each employee can see and use
CREATE TABLE IF NOT EXISTS employee_tank_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, tank_id)
);

-- Auto update permissions updated_at
CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON employee_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee_id
  ON employee_permissions(employee_id);

-- Index for faster tank access lookups
CREATE INDEX IF NOT EXISTS idx_employee_tank_access_employee_id
  ON employee_tank_access(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_tank_access_tank_id
  ON employee_tank_access(tank_id);