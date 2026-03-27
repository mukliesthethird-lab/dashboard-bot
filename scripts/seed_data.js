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

    // Create tables if not exist (just in case)
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS backgrounds (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            path VARCHAR(255),
            price INT DEFAULT 0
        )
    `);
    
    // Wait, the bot uses 'background_assets' but the dashboard might use 'backgrounds'?
    // Let me check Profile.py again. Line 235: SELECT path FROM background_assets.
    // Okay, it's background_assets. 
    
    // Let's seed background_assets
    const backgrounds = [
        ['Night City', 'assets/profile/night_city.png', 5000],
        ['Ocean Breeze', 'assets/profile/ocean.png', 3000],
        ['Grit & Grind', 'assets/profile/grit.png', 0],
        ['Don Pollo Special', 'assets/profile/special.png', 10000]
    ];

    for (const [name, path, price] of backgrounds) {
        await connection.execute(
            'INSERT IGNORE INTO background_assets (name, path, price) VALUES (?, ?, ?)',
            [name, path, price]
        );
    }
    console.log('Backgrounds seeded');

    // Seed badges
    const badges = [
        ['Sultan Muda', 'The Rich Kid', 1],
        ['Mancing Mania', 'Hardcore Fisher', 2],
        ['Elite', 'Level 20+', 3],
        ['Sultan Ohio', 'Millionaire', 4],
        ['Kaisar Ohio', 'Multi-Millionaire', 5],
        ['Warga Aktif', 'Level 10+', 33],
        ['Puh Sepuh', 'Level 50+', 14],
        ['Dewa Ohio', 'Level 100+', 15]
    ];

    for (const [name, description, id] of badges) {
        await connection.execute(
            'INSERT IGNORE INTO badges (id, name, description) VALUES (?, ?, ?)',
            [id, name, description]
        );
    }
    console.log('Badges seeded');

    await connection.end();
}

run().catch(console.error);
