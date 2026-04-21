import pool from './src/lib/db';

async function migrate() {
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
            // We keep target_price for now to avoid breaking other things, but can drop it later
            // await pool.execute('ALTER TABLE limit_orders DROP COLUMN target_price');
        }

        console.log("Checking final columns...");
        const [finalRows]: any = await pool.execute("SHOW COLUMNS FROM limit_orders");
        console.log("Final columns:", finalRows.map((r: any) => r.Field).join(", "));

        console.log("Migration completed successfully.");
    } catch (e: any) {
        console.error("Migration fatal error:", e.message);
    } finally {
        process.exit(0);
    }
}

migrate();
