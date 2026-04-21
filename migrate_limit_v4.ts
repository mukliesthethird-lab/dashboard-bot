import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
};

async function migrate() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log("Making target_price nullable in limit_orders...");
        await pool.execute('ALTER TABLE limit_orders MODIFY COLUMN target_price DECIMAL(20,4) NULL');
        console.log("Migration successful.");
    } catch (e: any) {
        console.error("Migration fatal error:", e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
