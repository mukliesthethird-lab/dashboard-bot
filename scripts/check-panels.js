const path = require('path');
const mysql2Path = path.resolve('node_modules/mysql2/promise');
const mysql = require(mysql2Path);

async function check() {
    const config = {
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    };

    console.log('Connecting to', config.host);
    const connection = await mysql.createConnection(config);
    
    console.log('Fetching last 5 form panels...');
    const [rows] = await connection.execute('SELECT id, form_id, guild_id, channel_id, message_id, created_at FROM form_panels ORDER BY created_at DESC LIMIT 10');
    
    console.table(rows);
    
    await connection.end();
}

check().catch(console.error);
