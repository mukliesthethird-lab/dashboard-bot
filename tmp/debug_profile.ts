import pool from '../src/lib/db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugProfile() {
    try {
        const userId = '1257064052203458712'; // Example ID from .env
        const [rows]: any = await pool.query('SELECT * FROM slot_users WHERE user_id = ?', [userId]);
        console.log('Stats:', JSON.stringify(rows, null, 2));
        const [custom]: any = await pool.query('SELECT * FROM profile_customization WHERE user_id = ?', [userId]);
        console.log('Customization:', JSON.stringify(custom, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugProfile();
