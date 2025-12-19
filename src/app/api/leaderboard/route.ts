import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import https from 'https';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Simple in-memory cache for Discord user data (5 minute TTL)
const userCache: Map<string, { data: any; expires: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get token from environment (Vercel) or file (local dev)
function getToken(): string {
    // First try process.env (works on Vercel)
    if (process.env.DISCORD_TOKEN) {
        return process.env.DISCORD_TOKEN;
    }

    // Fallback to file reading (for local development)
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');

    for (const envPath of [rootEnvPath, localEnvPath]) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/DISCORD_TOKEN\s*=\s*(.+)/);
            if (match) {
                return match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    }

    return '';
}

// Fetch user with caching
function fetchDiscordUser(userId: string, token: string): Promise<any> {
    // Check cache first
    const cached = userCache.get(userId);
    if (cached && cached.expires > Date.now()) {
        return Promise.resolve(cached.data);
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            path: `/api/v10/users/${userId}`,
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
                    const userData = JSON.parse(data);
                    // Cache the result
                    userCache.set(userId, { data: userData, expires: Date.now() + CACHE_TTL });
                    resolve(userData);
                } else if (res.statusCode === 429) {
                    console.warn(`⚠️ Rate limited for ${userId}, using cache or fallback`);
                    // Return cached (even if expired) or null
                    resolve(cached?.data || null);
                } else {
                    console.warn(`⚠️ Discord API ${res.statusCode}: ${userId}`);
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.end();
    });
}

export async function GET() {
    try {
        const [rows]: any = await pool.query(
            'SELECT CAST(user_id AS CHAR) as user_id, balance as total FROM slot_users ORDER BY balance DESC LIMIT 10'
        );

        const token = getToken();
        if (!token) {
            return NextResponse.json({ error: "Token not configured" }, { status: 500 });
        }

        // Fetch users sequentially to avoid rate limits (with small delay)
        const enrichedRows = [];
        for (const row of rows) {
            const user = await fetchDiscordUser(row.user_id, token);

            if (user) {
                enrichedRows.push({
                    ...row,
                    username: user.global_name || user.username,
                    avatar: user.avatar
                        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                        : null
                });
            } else {
                enrichedRows.push({ ...row, username: `User`, avatar: null });
            }

            // Small delay between requests to avoid rate limits
            await new Promise(r => setTimeout(r, 50));
        }

        return NextResponse.json(enrichedRows);
    } catch (error: any) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
