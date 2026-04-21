import pool from './src/lib/db';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    try {
        const [orders]: any = await pool.execute("SELECT * FROM limit_orders WHERE status = 'pending'");
        console.log("PENDING ORDERS:", orders);
        
        const [assets]: any = await pool.execute("SELECT id, symbol, current_price FROM market_assets");
        console.log("ASSETS:", assets);
    } catch (e: any) {
        console.error("Error:", e.message);
    } finally {
        process.exit(0);
    }
}

debug();
