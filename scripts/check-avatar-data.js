const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function parseEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            config[parts[0].trim()] = parts[1].trim().replace(/^"(.*)"$/, '$1');
        }
    });
    return config;
}

async function checkData() {
    const env = parseEnv();
    const pool = mysql.createPool({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: parseInt(env.DB_PORT || '3306')
    });

    try {
        const [rows] = await pool.query('SELECT id, username, user_avatar FROM form_submissions ORDER BY id DESC LIMIT 5');
        console.log('RECENT SUBMISSIONS AVATAR DATA:');
        console.table(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkData();
