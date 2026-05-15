import pool from './db';

async function migrate() {
    console.log('--- Starting Automod V2 Migration ---');
    try {
        const columns = [
            'ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS exempt_channels JSON DEFAULT NULL',
            'ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS exempt_roles JSON DEFAULT NULL',
            'ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS escalation_rules JSON DEFAULT NULL',
            'ALTER TABLE automod_settings ADD COLUMN IF NOT EXISTS use_global_blacklist BOOLEAN DEFAULT FALSE'
        ];

        for (const sql of columns) {
            console.log(`Executing: ${sql}`);
            await pool.query(sql);
        }

        console.log('--- Migration Successful! ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
