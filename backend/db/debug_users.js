require('dotenv').config();
const supabase = require('./supabaseClient');

async function checkUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, email, role, is_active, reset_otp_hash');

  if (error) { console.error('DB Error:', error.message); return; }

  console.log('\nUsers in DB:');
  data.forEach(u => {
    const emailStr = u.email || '(no email set)';
    const otpCol = u.reset_otp_hash !== undefined ? 'OTP column EXISTS' : 'OTP column MISSING';
    console.log('  username:', u.username, '| role:', u.role, '| email:', emailStr, '| active:', u.is_active, '|', otpCol);
  });

  if (data.length === 0) {
    console.log('  No users found!');
  }
  process.exit(0);
}

checkUsers().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
