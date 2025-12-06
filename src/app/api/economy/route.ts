import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Cache for Discord user data
const userCache: Map<string, { data: any; expires: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getTokenFromFile(): string {
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    for (const envPath of [rootEnvPath, localEnvPath]) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/DISCORD_TOKEN\s*=\s*(.+)/);
            if (match) return match[1].trim().replace(/^["']|["']$/g, '');
        }
    }
    return '';
}

function fetchDiscordUser(userId: string, token: string): Promise<any> {
    const cached = userCache.get(userId);
    if (cached && cached.expires > Date.now()) {
        return Promise.resolve(cached.data);
    }

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/users/${userId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${token}`,
                'User-Agent': 'DonPolloBot/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const userData = JSON.parse(data);
                    userCache.set(userId, { data: userData, expires: Date.now() + CACHE_TTL });
                    resolve(userData);
                } else {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
        req.end();
    });
}

// GET - Get economy stats or search user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const userId = searchParams.get('user_id');
        const token = getTokenFromFile();

        if (action === 'stats') {
            const [countResult]: any = await pool.query('SELECT COUNT(*) as count FROM slot_users');
            const [sumResult]: any = await pool.query('SELECT SUM(balance) as total FROM slot_users');
            const [topUsersRaw]: any = await pool.query(
                'SELECT CAST(user_id AS CHAR) as user_id, balance FROM slot_users ORDER BY balance DESC LIMIT 10'
            );

            // Enrich top users with Discord data
            const topUsers = [];
            for (const user of topUsersRaw) {
                const discordUser = token ? await fetchDiscordUser(user.user_id, token) : null;
                topUsers.push({
                    user_id: user.user_id,
                    balance: user.balance,
                    username: discordUser?.global_name || discordUser?.username || 'Unknown',
                    avatar: discordUser?.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.user_id}/${discordUser.avatar}.png`
                        : null
                });
                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 50));
            }

            return NextResponse.json({
                totalUsers: countResult[0]?.count || 0,
                totalBalance: sumResult[0]?.total || 0,
                topUsers
            });
        }

        if (action === 'user' && userId) {
            const [users]: any = await pool.query(
                'SELECT CAST(user_id AS CHAR) as user_id, balance FROM slot_users WHERE user_id = ?',
                [userId]
            );

            if (users[0]) {
                const discordUser = token ? await fetchDiscordUser(userId, token) : null;
                return NextResponse.json({
                    ...users[0],
                    username: discordUser?.global_name || discordUser?.username || 'Unknown',
                    avatar: discordUser?.avatar
                        ? `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.png`
                        : null
                });
            }
            return NextResponse.json(null);
        }

        // Search users by ID (partial match)
        if (action === 'search' && userId) {
            const [users]: any = await pool.query(
                'SELECT CAST(user_id AS CHAR) as user_id, balance FROM slot_users WHERE user_id LIKE ? LIMIT 5',
                [`%${userId}%`]
            );

            const enrichedUsers = [];
            for (const user of users) {
                const discordUser = token ? await fetchDiscordUser(user.user_id, token) : null;
                enrichedUsers.push({
                    user_id: user.user_id,
                    balance: user.balance,
                    username: discordUser?.global_name || discordUser?.username || 'Unknown',
                    avatar: discordUser?.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.user_id}/${discordUser.avatar}.png`
                        : null
                });
            }
            return NextResponse.json(enrichedUsers);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Economy API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Modify user balance
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, user_id, amount, guild_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        if (action === 'give') {
            if (!amount || amount <= 0) {
                return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
            }

            const [existing]: any = await pool.query(
                'SELECT balance FROM slot_users WHERE user_id = ?',
                [user_id]
            );

            if (existing.length === 0) {
                await pool.query(
                    'INSERT INTO slot_users (user_id, balance) VALUES (?, ?)',
                    [user_id, amount]
                );
            } else {
                await pool.query(
                    'UPDATE slot_users SET balance = balance + ? WHERE user_id = ?',
                    [amount, user_id]
                );
            }

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Economy: Give Money', `Gave $${amount} to user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: `Added $${amount} to user` });
        }

        if (action === 'reset') {
            await pool.query('DELETE FROM slot_users WHERE user_id = ?', [user_id]);

            if (guild_id) {
                await pool.query(
                    'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                    [guild_id, 'admin', session.user.name || 'Admin', 'Economy: Reset User', `Reset user ${user_id}`]
                ).catch(() => { });
            }

            return NextResponse.json({ success: true, message: 'User balance reset' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Economy API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
