import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
};

async function migrate() {
    console.log("Using config:", { ...dbConfig, password: '***' });
    const pool = mysql.createPool(dbConfig);
    
    try {
        console.log("Checking columns in limit_orders...");
        const [rows]: any = await pool.execute("SHOW COLUMNS FROM limit_orders");
        const columns = rows.map((r: any) => r.Field);
        console.log("Existing columns:", columns.join(", "));

        if (!columns.includes('min_price')) {
            console.log("Adding min_price...");
            await pool.execute('ALTER TABLE limit_orders ADD COLUMN min_price DECIMAL(20,4) AFTER amount');
        } else {
            console.log("min_price already exists.");
        }

        if (!columns.includes('max_price')) {
            console.log("Adding max_price...");
            await pool.execute('ALTER TABLE limit_orders ADD COLUMN max_price DECIMAL(20,4) AFTER min_price');
        } else {
            console.log("max_price already exists.");
        }

        if (columns.includes('target_price')) {
            console.log("Migrating target_price to min/max...");
            await pool.execute('UPDATE limit_orders SET min_price = target_price, max_price = target_price WHERE min_price IS NULL OR min_price = 0');
        }

        console.log("Checking final columns...");
        const [finalRows]: any = await pool.execute("SHOW COLUMNS FROM limit_orders");
        console.log("Final columns:", finalRows.map((r: any) => r.Field).join(", "));

        console.log("Migration completed successfully.");
    } catch (e: any) {
        console.error("Migration fatal error:", e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();
