const mysql = require('mysql2/promise');

async function migrate() {
    const connection = await mysql.createConnection({
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    });

    try {
        console.log('Fixing form_submissions schema...');
        
        // 1. Change reviewed_by to VARCHAR(255) to store name
        await connection.query('ALTER TABLE form_submissions MODIFY COLUMN reviewed_by VARCHAR(255)');
        console.log('✅ Changed reviewed_by to VARCHAR(255)');

        // 2. Ensure user_id and guild_id are VARCHAR to avoid BIGINT truncation issues in JS
        await connection.query('ALTER TABLE form_submissions MODIFY COLUMN user_id VARCHAR(50)');
        await connection.query('ALTER TABLE form_submissions MODIFY COLUMN guild_id VARCHAR(50)');
        console.log('✅ Ensured user_id and guild_id are VARCHAR');

        // 3. Add reason column if it doesn't exist
        const [columns] = await connection.query('SHOW COLUMNS FROM form_submissions LIKE "reason"');
        if (columns.length === 0) {
            await connection.query('ALTER TABLE form_submissions ADD COLUMN reason TEXT AFTER status');
            console.log('✅ Added reason column');
        } else {
            console.log('ℹ️ Reason column already exists');
        }

        console.log('🚀 All schema fixes applied!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
