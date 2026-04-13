import pool from './src/lib/db';

async function migrate() {
    try {
        console.log("Adding min_price and max_price to limit_orders...");
        await pool.execute('ALTER TABLE limit_orders ADD COLUMN min_price DECIMAL(20,4)');
        await pool.execute('ALTER TABLE limit_orders ADD COLUMN max_price DECIMAL(20,4)');
        
        // Migrate existing data (optional, just copy target_price so old orders don't break, or cancel them)
        await pool.execute('UPDATE limit_orders SET min_price = target_price, max_price = target_price');
        
        console.log("Migration successful");
    } catch (e: any) {
        console.error("Migration failed or already applied:", e.message);
    } finally {
        process.exit(0);
    }
}

migrate();
