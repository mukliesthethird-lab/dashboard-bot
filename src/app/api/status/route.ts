import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

// Fetch bot guilds count from Discord API
async function fetchBotGuildsCount(token: string): Promise<number> {
    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            path: '/api/v10/users/@me/guilds?limit=200',
            method: 'GET',
            headers: {
                'Authorization': `Bot ${token}`,
                'User-Agent': 'DonPolloBot/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const guilds = JSON.parse(data);
                        resolve(Array.isArray(guilds) ? guilds.length : 0);
                    } catch {
                        resolve(0);
                    }
                } else {
                    resolve(0);
                }
            });
        });

        req.on('error', () => resolve(0));
        req.end();
    });
}

export async function GET() {
    try {
        // 1. Fetch shard data from database
        const [shardsResult]: any = await pool.query(
            'SELECT * FROM bot_status ORDER BY shard_id ASC'
        );
        const shards = shardsResult || [];

        // 2. Aggregate totals
        let totalServers = 0;
        let totalUsers = 0;
        let earliestUptime: Date | null = null;
        let latestVersion = "Unknown";
        let lastKnownMemory = "0MB";
        
        const now = new Date();
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

        const processedShards = shards.map((s: any) => {
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

        // Fallback: If DB is empty, try fetch servers from Discord API
        if (totalServers === 0) {
            const token = getDiscordToken();
            if (token) {
                totalServers = await fetchBotGuildsCount(token);
            }
        }

        // 3. Calculate Global Latency (Average of online shards)
        const onlineShards = processedShards.filter((s: any) => s.status === "Online");
        const avgLatency = onlineShards.length > 0
            ? Math.round(onlineShards.reduce((acc: number, s: any) => acc + parseInt(s.latency), 0) / onlineShards.length)
            : 0;

        // 4. Calculate Uptime String (Only if Online)
        let uptimeString = "Offline";
        if (onlineShards.length > 0 && earliestUptime) {
            const diffMs = now.getTime() - (earliestUptime as Date).getTime();
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            uptimeString = `${days}d ${hours}h ${mins}m`;
        }

        // 5. Get Web Server Metrics
        const mem = process.memoryUsage();
        const memoryUsage = onlineShards.length > 0 ? `${Math.round(mem.rss / 1024 / 1024)}MB` : lastKnownMemory;

        // 6. Fetch/Update Daily Uptime History
        const today = now.toISOString().split('T')[0];
        try {
            const [historyCheck]: any = await pool.query('SELECT * FROM bot_uptime_history WHERE check_date = ?', [today]);
            if (historyCheck.length === 0) {
                await pool.query('INSERT INTO bot_uptime_history (check_date, uptime_percentage, incident_count) VALUES (?, ?, ?)', [today, 100.00, 0]);
            } else if (onlineShards.length < processedShards.length && processedShards.length > 0) {
                await pool.query('UPDATE bot_uptime_history SET uptime_percentage = GREATEST(0, uptime_percentage - 0.1), incident_count = incident_count + 1 WHERE check_date = ?', [today]);
            }
        } catch (hError) {
            console.error('History update error:', hError);
        }

        const [historyLogs]: any = await pool.query(
            'SELECT * FROM bot_uptime_history ORDER BY check_date DESC LIMIT 60'
        );

        return NextResponse.json({
            status: processedShards.length === 0 ? "Offline" :
                    onlineShards.length === processedShards.length ? "Online" : 
                    onlineShards.length === 0 ? "Offline" : "Partial Outage",
            version: latestVersion,
            uptime: uptimeString,
            latency: `${avgLatency}ms`,
            shards: processedShards,
            clusters: Math.ceil(processedShards.length / 4) || 1,
            memoryUsage,
            lastUpdate: now.toISOString(),
            totalServers,
            totalUsers,
            history: historyLogs.reverse()
        });
    } catch (error) {
        console.error('Status API error:', error);
        return NextResponse.json({ 
            status: "Error", 
            message: "Failed to fetch real status from database" 
        }, { status: 500 });
    }
}
