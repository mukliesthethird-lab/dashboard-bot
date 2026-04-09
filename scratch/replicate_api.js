const mysql = require('mysql2/promise');

async function testApiLogic() {
    const dbConfig = {
        host: 'ar-men-08.vexyhost.com',
        user: 'u9206_8NUrZJ5MBH',
        password: '3TRwKW!7KX^e!rQkUt0SNQ2@',
        database: 's9206_database',
        port: 3306,
    };

    let pool;
    try {
        pool = mysql.createPool(dbConfig);
        console.log("Pool created");

        // 1. Fetch shard data
        const [shards] = await pool.query('SELECT * FROM bot_status ORDER BY shard_id ASC');
        console.log("Shards fetched:", shards.length);

        // 2. Aggregate
        let totalServers = 0;
        let totalUsers = 0;
        let earliestUptime = null;
        let latestVersion = "Unknown";
        let lastKnownMemory = "0MB";
        
        const now = new Date();
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

        const processedShards = shards.map((s) => {
            const isOffline = new Date(s.last_heartbeat) < twoMinutesAgo;
            totalServers += (Number(s.servers) || 0);
            totalUsers += (Number(s.users) || 0);
            
            if (!earliestUptime || new Date(s.uptime_start) < earliestUptime) {
                earliestUptime = new Date(s.uptime_start);
            }
            if (s.version) latestVersion = s.version;
            if (s.memory_usage) lastKnownMemory = s.memory_usage;

            return {
                id: s.shard_id,
                status: isOffline ? "Offline" : s.status,
                latency: `${s.latency}ms`,
                servers: s.servers,
                users: s.users,
                lastUpdate: s.last_heartbeat
            };
        });

        // 3. History
        const today = now.toISOString().split('T')[0];
        console.log("Checking history for:", today);
        const [historyCheck] = await pool.query('SELECT * FROM bot_uptime_history WHERE check_date = ?', [today]);
        console.log("History check finished");

        const [historyLogs] = await pool.query('SELECT * FROM bot_uptime_history ORDER BY check_date DESC LIMIT 60');
        console.log("History logs fetched:", historyLogs.length);

        console.log("Logic check completed successfully!");
    } catch (err) {
        console.error("LOGIC ERROR:", err);
    } finally {
        if (pool) await pool.end();
    }
}

testApiLogic();
