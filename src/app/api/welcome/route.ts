import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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

function fetchGuildChannels(guildId: string, token: string): Promise<any[]> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/guilds/${guildId}/channels`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DonPolloBot/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const channels = JSON.parse(data);
                    const textChannels = channels.filter((c: any) => c.type === 0);
                    resolve(textChannels.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        position: c.position
                    })).sort((a: any, b: any) => a.position - b.position));
                } else {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.end();
    });
}

function fetchGuildRoles(guildId: string, token: string): Promise<any[]> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/guilds/${guildId}/roles`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DonPolloBot/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const roles = JSON.parse(data);
                    // Filter out @everyone role and sort by position (highest first)
                    resolve(roles
                        .filter((r: any) => r.name !== '@everyone')
                        .map((r: any) => ({
                            id: r.id,
                            name: r.name,
                            color: r.color,
                            position: r.position
                        }))
                        .sort((a: any, b: any) => b.position - a.position)
                    );
                } else {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.end();
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        if (action === 'channels') {
            const token = getTokenFromFile();
            if (!token) {
                return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            }
            const channels = await fetchGuildChannels(guildId, token);
            return NextResponse.json(channels);
        }

        if (action === 'roles') {
            const token = getTokenFromFile();
            if (!token) {
                return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            }
            const roles = await fetchGuildRoles(guildId, token);
            return NextResponse.json(roles);
        }

        // Default: get settings
        const [rows]: any = await pool.query(
            'SELECT * FROM welcome_settings WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            // Return default settings
            return NextResponse.json({
                guild_id: guildId,
                enabled: false,
                channel_id: null,
                message_content: '',
                use_embed: true,
                embed_data: JSON.stringify({
                    author_name: '',
                    author_icon_url: '',
                    title: 'Welcome!',
                    title_url: '',
                    description: 'Hey {user}, Selamat datang di **{server}**!',
                    color: '#00ff04',
                    thumbnail_url: '{user.avatar}',
                    image_url: '',
                    footer_text: '',
                    footer_icon_url: '',
                    fields: []
                })
            });
        }

        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error('Welcome API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            guild_id,
            enabled,
            channel_id,
            message_content,
            use_embed,
            embed_data
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        // Upsert welcome settings
        await pool.query(`
            INSERT INTO welcome_settings 
            (guild_id, enabled, channel_id, message_content, use_embed, embed_data)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                enabled = VALUES(enabled),
                channel_id = VALUES(channel_id),
                message_content = VALUES(message_content),
                use_embed = VALUES(use_embed),
                embed_data = VALUES(embed_data),
                updated_at = CURRENT_TIMESTAMP
        `, [
            guild_id,
            enabled ? 1 : 0,
            channel_id || null,
            message_content || '',
            use_embed ? 1 : 0,
            embed_data || '{}'
        ]);

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', session.user.name || 'Admin', 'Welcome: Settings Updated', `Updated welcome settings`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: 'Welcome settings saved!' });
    } catch (error: any) {
        console.error('Welcome API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
