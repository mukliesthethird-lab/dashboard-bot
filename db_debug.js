const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
    try {
        const env = fs.readFileSync('c:/dashboard-donpollo/.env.local', 'utf8');
        const dbHost = env.match(/DB_HOST=(.+)/)[1].trim();
        const dbUser = env.match(/DB_USER=(.+)/)[1].trim();
        const dbPass = env.match(/DB_PASSWORD=(.+)/)[1].trim();
        const dbName = env.match(/DB_NAME=(.+)/)[1].trim();
        const dbPort = env.match(/DB_PORT=(.+)/)[1].trim();
        
        const conn = await mysql.createConnection({
            host: dbHost, 
            user: dbUser, 
            password: dbPass, 
            database: dbName, 
            port: Number(dbPort)
        });
        
        // Let's find any user with level 2
        const [rows] = await conn.query('SELECT user_id, xp, level FROM slot_users WHERE level = 2');
        console.log('Level 2 Users:', JSON.stringify(rows));
        
        // Also check fishing profile
        const [fish] = await conn.query('SELECT * FROM fishing_profile LIMIT 5');
        console.log('Fishing Data:', JSON.stringify(fish));
        
        await conn.end();
    } catch (err) {
        console.error('Database Error:', err.message);
    }
}
run();
