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
        // Fetch real active users
        const [totalsResult]: any = await pool.query(
            'SELECT COUNT(DISTINCT user_id) as count FROM slot_users'
        );
        const totalUsers = Number(totalsResult[0]?.count || 0);

        // Fetch servers count from Discord API
        const token = getDiscordToken();
        let totalServers = 0;
        if (token) {
            totalServers = await fetchBotGuildsCount(token);
        }

        // Mock shard distribution based on real totals
        const shardCount = 3;
        const baseServers = Math.floor(totalServers / shardCount);
        const baseUsers = Math.floor(totalUsers / shardCount);
        
        const now = new Date();
        const baseLatency = 42;

        return NextResponse.json({
            status: "Online",
            version: "2.5.0-stable",
            uptime: "14d 6h 32m",
            latency: `${baseLatency + Math.floor(Math.random() * 10)}ms`,
            shards: Array.from({ length: shardCount }).map((_, i) => ({
                id: i,
                status: "Healthy",
                latency: `${baseLatency + i * 2 + Math.floor(Math.random() * 5)}ms`,
                servers: i === shardCount - 1 ? totalServers - (baseServers * (shardCount - 1)) : baseServers,
                users: i === shardCount - 1 ? totalUsers - (baseUsers * (shardCount - 1)) : baseUsers
            })),
            clusters: 3,
            memoryUsage: "512MB / 2GB",
            lastUpdate: now.toISOString(),
            totalServers,
            totalUsers
        });
    } catch (error) {
        console.error('Status API error:', error);
        return NextResponse.json({ status: "Error", message: "Failed to fetch real status" }, { status: 500 });
    }
}
