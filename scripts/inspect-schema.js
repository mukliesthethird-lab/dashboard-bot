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

async function inspect() {
    const env = parseEnv();
    const pool = mysql.createPool({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: parseInt(env.DB_PORT || '3306')
    });

    try {
        const [rows] = await pool.query('DESCRIBE form_submissions');
        const avatarRow = rows.find(r => r.Field === 'user_avatar');
        console.log('USER_AVATAR COLUMN:', avatarRow);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
