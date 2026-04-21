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

async function debug() {
    console.log("Using config:", { ...dbConfig, password: '***' });
    const pool = mysql.createPool(dbConfig);
    try {
        const [orders]: any = await pool.execute("SELECT id, symbol, type, amount, min_price, max_price, status FROM limit_orders WHERE status = 'pending'");
        console.log("PENDING ORDERS (Raw):", orders);
        
        const [assets]: any = await pool.execute("SELECT id, symbol, current_price FROM market_assets");
        console.log("CURRENT ASSETS:", assets);

        for (const order of orders) {
            const asset = assets.find((a: any) => a.symbol === order.symbol);
            if (asset) {
                const price = Number(asset.current_price);
                const min = Number(order.min_price);
                const max = Number(order.max_price);
                console.log(`Checking Order #${order.id} [${order.symbol}]: Price=${price}, min=${min}, max=${max}`);
                console.log(`MATCH? ${price >= min && price <= max}`);
            } else {
                console.log(`Asset ${order.symbol} not found for order #${order.id}`);
            }
        }

    } catch (e: any) {
        console.error("DEBUG ERROR:", e.stack || e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

debug();
