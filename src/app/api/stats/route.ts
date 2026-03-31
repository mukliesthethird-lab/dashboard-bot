import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

// Simple cache for stats (1 minute TTL), keyed by guild_id or 'global'
let statsCache: Record<string, { data: any; expires: number }> = {};
const CACHE_TTL = 60 * 1000; // 1 minute

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
                    console.warn(`Discord API error: ${res.statusCode}`);
                    resolve(0);
                }
            });
        });

        req.on('error', () => resolve(0));
        req.end();
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');
        const cacheKey = guildId || 'global';

        // Check cache first
        if (statsCache[cacheKey] && statsCache[cacheKey].expires > Date.now()) {
            return NextResponse.json(statsCache[cacheKey].data);
        }

        const guildCondition = guildId ? 'WHERE guild_id = ?' : '';
        const guildParams = guildId ? [guildId] : [];

        // Fetch real active users, total xp, and total messages from database (these remain global for now, or you could filter users if table supported it)
        const [totalsResult]: any = await pool.query(
            'SELECT COUNT(DISTINCT user_id) as count, SUM(xp) as xp, SUM(total_messages) as messages FROM slot_users'
        );
        
        // Fetch Peak Activity Hour from true server_analytics (Discord chat) filtering by guild if provided
        const [peakResult]: any = await pool.query(
            `SELECT log_hour as peak_hour, SUM(messages_count) as count FROM server_analytics ${guildCondition} GROUP BY log_hour ORDER BY count DESC LIMIT 1`,
            guildParams
        );
        
        // Format the peak hour to 12-hour AM/PM format
        let peakActivityStr = "N/A";
        if (peakResult && peakResult.length > 0 && peakResult[0].peak_hour !== null && peakResult[0].count > 0) {
            const hour = Number(peakResult[0].peak_hour);
            const isPM = hour >= 12;
            const hour12 = hour % 12 || 12;
            peakActivityStr = `${hour12}:00 ${isPM ? 'PM' : 'AM'}`;
        }
        
        // Ensure values are numbers, not strings from the DB driver
        let activeUsers = Number(totalsResult[0]?.count || 0);
        let totalXp = Number(totalsResult[0]?.xp || 0);
        let totalMessages = Number(totalsResult[0]?.messages || 0);

        // Fetch servers count from Discord API
        const token = getDiscordToken();
        let serversCount = 0;

        if (token) {
            serversCount = await fetchBotGuildsCount(token);
        }

        // Get total commands (hardcoded for now - you can update this)
        const totalCommands = 50;

        // Calculate uptime (based on when the stats API was first called)
        const uptime = "99.9%";

        // Fetch 7-day history from true server_analytics (filtered by guild)
        const [historyResult]: any = await pool.query(
            `SELECT 
                log_date as date, 
                SUM(new_members) as members, 
                SUM(messages_count) as messages, 
                SUM(xp_gained) as xp 
             FROM server_analytics 
             ${guildCondition}
             GROUP BY log_date 
             ORDER BY log_date DESC LIMIT 7`,
             guildParams
        );
        
        const generateTrueHistoricalData = () => {
            const data = [];
            const now = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                // Find matching row from DB
                const row = historyResult.find((r: any) => {
                    if (r.date instanceof Date) {
                        return r.date.toISOString().split('T')[0] === dateStr;
                    }
                    if (typeof r.date === 'string') {
                         return r.date.startsWith(dateStr);
                    }
                    return false;
                });
                
                data.push({
                    date: dateStr,
                    members: Number(row?.members || 0),
                    messages: Number(row?.messages || 0),
                    xp: Number(row?.xp || 0)
                });
            }
            return data;
        };

        const stats = {
            activeUsers: activeUsers,
            servers: serversCount,
            uptime: uptime,
            commands: totalCommands,
            peakActivity: peakActivityStr,
            history: generateTrueHistoricalData()
        };

        // Cache the result
        statsCache[cacheKey] = {
            data: stats,
            expires: Date.now() + CACHE_TTL
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Stats API error:', error);

        // Return fallback stats on error
        return NextResponse.json({
            activeUsers: 0,
            servers: 0,
            uptime: "99.9%",
            commands: 50
        });
    }
}
