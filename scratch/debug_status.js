const mysql = require('mysql2/promise');

async function debugStatus() {
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
        console.log("✅ [DEBUG] Connected to Database");

        // 1. Check if table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'bot_status'");
        if (tables.length === 0) {
            console.log("❌ [DEBUG] Table 'bot_status' does NOT exist. Creating it now...");
            
            const createTableSql = `
                CREATE TABLE bot_status (
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
            const createHistorySql = `
                CREATE TABLE IF NOT EXISTS bot_uptime_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    check_date DATE UNIQUE,
                    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
                    incident_count INT DEFAULT 0
                );
            `;
            await connection.query(createTableSql);
            await connection.query(createHistorySql);
            console.log("✅ [DEBUG] Tables created successfully.");
        } else {
            console.log("✅ [DEBUG] Table 'bot_status' exists.");
            const [data] = await connection.query("SELECT * FROM bot_status");
            console.log("📊 [DEBUG] Current data in bot_status:", data);
            
            if (data.length === 0) {
                console.log("⚠️ [DEBUG] Table is EMPTY. The bot has not sent a heartbeat yet.");
            }
        }

    } catch (err) {
        console.error("❌ [DEBUG] DB Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugStatus();
