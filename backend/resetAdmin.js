const supabase = require('./db/supabaseClient');
const { hashPassword } = require('./utils/hashPassword');
require('dotenv').config();

const reset = async () => {
    const newHash = await hashPassword('admin@petrovault');
    const { error } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('username', 'admin');

    if (error) {
        console.error('Failed:', error.message);
    } else {
        console.log('Admin password reset to: admin@petrovault');
    }
    process.exit(0);
};

reset();