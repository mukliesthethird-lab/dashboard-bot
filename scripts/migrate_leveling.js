const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            env[parts[0].trim()] = parts[1].trim();
        }
    });
    return env;
}

async function run() {
    const env = getEnv();
    const connection = await mysql.createConnection({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: Number(env.DB_PORT) || 3306,
    });

    console.log('Connected to database');

    const schema1 = `
    CREATE TABLE IF NOT EXISTS leveling_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        enabled BOOLEAN DEFAULT FALSE,
        message TEXT,
        channel_id VARCHAR(20),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`;

    const schema2 = `
    CREATE TABLE IF NOT EXISTS leveling_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        role_id VARCHAR(20) NOT NULL,
        level INT NOT NULL,
        UNIQUE KEY unique_level_role (guild_id, level),
        INDEX idx_guild_level (guild_id, level)
    );`;

    await connection.execute(schema1);
    console.log('leveling_settings table ensured');
    await connection.execute(schema2);
    console.log('leveling_roles table ensured');

    await connection.end();
}

run().catch(console.error);
