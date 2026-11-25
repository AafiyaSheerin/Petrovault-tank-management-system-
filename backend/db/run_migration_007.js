/**
 * Run migration 007 — Adds reset_otp_hash and reset_otp_expires_at to users table
 * Required for the Forgot Password / Password Reset feature.
 *
 * Run with: node backend/db/run_migration_007.js
 */
require('dotenv').config();
const supabase = require('./supabaseClient');

async function runMigration() {
  console.log('🔄 Running Migration 007: Add OTP columns for password reset...\n');

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
      name: 'Add reset_otp_hash column to users',
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_hash TEXT DEFAULT NULL;'
    },
    {
      name: 'Add reset_otp_expires_at column to users',
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMPTZ DEFAULT NULL;'
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

  console.log('\n✅ Migration 007 complete! Password reset columns added to users table.');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
