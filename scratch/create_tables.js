const mysql = require('mysql2/promise');

async function createMissingTables() {
    const dbConfig = {
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to DB");

        const createHistorySql = `
            CREATE TABLE IF NOT EXISTS bot_uptime_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                check_date DATE UNIQUE,
                uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
                incident_count INT DEFAULT 0
            );
        `;
        await connection.query(createHistorySql);
        console.log("✅ Table 'bot_uptime_history' created or already exists.");

        const createStatusSql = `
            CREATE TABLE IF NOT EXISTS bot_status (
                shard_id INT PRIMARY KEY,
                status ENUM('Online', 'Maintenance', 'Offline') DEFAULT 'Online',
                latency INT DEFAULT 0,
                servers INT DEFAULT 0,
                users INT DEFAULT 0,
                memory_usage VARCHAR(50) DEFAULT '0MB',
                uptime_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                version VARCHAR(20) DEFAULT '1.0.0'
            );
        `;
        await connection.query(createStatusSql);
        console.log("✅ Table 'bot_status' created or already exists.");

    } catch (err) {
        console.error("Error creating tables:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

createMissingTables();
