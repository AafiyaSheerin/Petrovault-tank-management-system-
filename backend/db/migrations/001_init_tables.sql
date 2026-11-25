-- PetroVault Database Migration 001
-- Core tables: users, products, tanks, tank_levels

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (admin and employees)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(15),
  role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (oil types)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  density_kg_per_litre DECIMAL(6,4) DEFAULT 0.90,
  description TEXT,
  color VARCHAR(7) DEFAULT '#22c55e',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tanks table
CREATE TABLE IF NOT EXISTS tanks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  shape VARCHAR(30) NOT NULL DEFAULT 'rectangular' CHECK (shape IN ('rectangular', 'cone_bottom', 'cylinder', 'horizontal_cylinder', 'dome_top')),
  capacity_litres DECIMAL(15,2) NOT NULL,
  location VARCHAR(100),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  low_threshold DECIMAL(5,2) DEFAULT 20.00,
  high_threshold DECIMAL(5,2) DEFAULT 90.00,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tank levels table (current level per tank)
CREATE TABLE IF NOT EXISTS tank_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID UNIQUE REFERENCES tanks(id) ON DELETE CASCADE,
  current_volume DECIMAL(15,2) DEFAULT 0.00,
  fill_percentage DECIMAL(5,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'empty' CHECK (status IN ('empty', 'critical', 'healthy', 'warning')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Auto update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tanks_updated_at
  BEFORE UPDATE ON tanks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();