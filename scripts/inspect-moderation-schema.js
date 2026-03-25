const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function parseEnv() {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const config = {};
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            config[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
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
        console.log('--- USER_REPORTS ---');
        const [reportsDesc] = await pool.query('DESCRIBE user_reports');
        console.table(reportsDesc);

        console.log('\n--- MODERATION_CASES ---');
        const [casesDesc] = await pool.query('DESCRIBE moderation_cases');
        console.table(casesDesc);

        console.log('\n--- MODERATION_SETTINGS ---');
        const [settingsDesc] = await pool.query('DESCRIBE moderation_settings');
        console.table(settingsDesc);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
