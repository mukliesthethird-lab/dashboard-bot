
import pool from '../src/lib/db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE profile_customization');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkSchema();
