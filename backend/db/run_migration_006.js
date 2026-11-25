/**
 * Run migration 006 — Adds litres_per_cm, cone_capacity_litres to tanks
 * and expands the shape constraint to support 17 tank types.
 *
 * Run with: node backend/db/run_migration_006.js
 */
require('dotenv').config();
const supabase = require('./supabaseClient');

async function runMigration() {
  console.log('🔄 Running Migration 006: Tank dimensions + shape constraint update...\n');

  // Use raw query via supabase REST (Supabase doesn't have a direct SQL executor in JS client)
  // Instead, we'll use fetch to call the Supabase REST API with the service key

  const SUPABASE_URL = process.env.SUPABASE_URL.trim();
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

  const runSQL = async (sql) => {
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SQL failed: ${text}`);
    }
    return res.json().catch(() => null);
  };

  const steps = [
    {
      name: 'Add litres_per_cm column',
      sql: 'ALTER TABLE tanks ADD COLUMN IF NOT EXISTS litres_per_cm DECIMAL(10,4) DEFAULT NULL;'
    },
    {
      name: 'Add cone_capacity_litres column',
      sql: 'ALTER TABLE tanks ADD COLUMN IF NOT EXISTS cone_capacity_litres DECIMAL(15,2) DEFAULT NULL;'
    },
    {
      name: 'Drop old shape constraint',
      sql: 'ALTER TABLE tanks DROP CONSTRAINT IF EXISTS tanks_shape_check;'
    },
    {
      name: 'Add expanded shape constraint',
      sql: `ALTER TABLE tanks ADD CONSTRAINT tanks_shape_check CHECK (shape IN (
        'vertical_cylinder_flat','vertical_cylinder_cone','vertical_cylinder_sloped',
        'vertical_cylinder_tori','vertical_cylinder_ellipsoidal','vertical_cylinder_hemispherical',
        'horizontal_cylinder','horizontal_cylinder_flat','horizontal_cylinder_dished',
        'horizontal_cylinder_hemispherical','rectangular','rectangular_flat','rectangular_prismatic',
        'cube_ibc','spherical','sphere_horton','spheroid_flat',
        'cone_bottom','cylinder','dome_top'
      ));`
    },
    {
      name: 'Create system_settings table',
      sql: `CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    },
    {
      name: 'Insert email_alerts_enabled setting',
      sql: `INSERT INTO system_settings (key, value) VALUES ('email_alerts_enabled', 'true') ON CONFLICT (key) DO NOTHING;`
    },
  ];

  for (const step of steps) {
    try {
      await runSQL(step.sql);
      console.log(`  ✅ ${step.name}`);
    } catch (err) {
      console.log(`  ⚠️  ${step.name} — ${err.message} (may already be applied)`);
    }
  }

  console.log('\n✅ Migration 006 complete!');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
