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
        console.log('Migrating profile_customization...');
        
        // Check if columns exist first to be safe
        const [columns] = await connection.query('SHOW COLUMNS FROM profile_customization');
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('font_family')) {
            await connection.query("ALTER TABLE profile_customization ADD COLUMN font_family VARCHAR(100) DEFAULT 'Arial'");
            console.log('Added font_family');
        }
        if (!columnNames.includes('text_color')) {
            await connection.query("ALTER TABLE profile_customization ADD COLUMN text_color VARCHAR(7) DEFAULT '#FFFFFF'");
            console.log('Added text_color');
        }
        if (!columnNames.includes('xp_bar_color')) {
            await connection.query("ALTER TABLE profile_customization ADD COLUMN xp_bar_color VARCHAR(7) DEFAULT '#6366f1'");
            console.log('Added xp_bar_color');
        }

        console.log('✅ Migration successful!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
