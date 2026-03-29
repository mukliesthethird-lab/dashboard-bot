const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../donpollobot/.env' }); // load bot env for safety, or use hardcoded if local

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'donpollobot_db',
        port: process.env.DB_PORT || 3306
    });

    const srcDir = path.join(__dirname, 'public', 'backgrounds');
    const dstDir = path.join('C:\\donpollobot', 'assets', 'profile');

    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
    }

    const [rows] = await pool.query("SELECT id, path FROM background_assets");
    let updates = 0;

    for (let row of rows) {
        if (!row.path) continue;
        const filename = path.basename(row.path);
        
        if (filename.startsWith('bg_')) {
            const srcFile = path.join(srcDir, filename);
            const dstFile = path.join(dstDir, filename);
            
            if (fs.existsSync(srcFile)) {
                fs.copyFileSync(srcFile, dstFile);
                console.log(`Copied ${filename}`);
            }

            const relPath = `assets/profile/${filename}`;
            await pool.query("UPDATE background_assets SET path = ? WHERE id = ?", [relPath, row.id]);
            updates++;
        }
    }
    console.log(`Updated ${updates} rows to relative paths.`);
    process.exit(0);
}

run().catch(console.error);
