import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';

function fetchDiscordAPI(path: string, token: string): Promise<any[]> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DonPolloBot/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
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

        const token = getDiscordToken();

        if (action === 'channels') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const channels = await fetchDiscordAPI(`/guilds/${guildId}/channels`, token);
            const textChannels = channels.filter((c: any) => c.type === 0);
            return NextResponse.json(textChannels.map((c: any) => ({
                id: c.id, name: c.name, position: c.position
            })).sort((a: any, b: any) => a.position - b.position));
        }

        if (action === 'roles') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const roles = await fetchDiscordAPI(`/guilds/${guildId}/roles`, token);
            return NextResponse.json(roles
                .filter((r: any) => r.name !== '@everyone')
                .map((r: any) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
                .sort((a: any, b: any) => b.position - a.position));
        }

        if (action === 'members') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const members = await fetchDiscordAPI(`/guilds/${guildId}/members?limit=100`, token);
            return NextResponse.json(members.map((m: any) => ({
                id: m.user.id,
                username: m.user.username,
                display_name: m.nick || m.user.global_name || m.user.username,
                avatar: m.user.avatar
            })));
        }

        // Get logging settings
        const [rows]: any = await pool.query(
            'SELECT * FROM logging_settings WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            return NextResponse.json({
                guild_id: guildId,
                use_webhooks: true,
                ignore_embeds: false,
                ignore_voice_users: false,
                log_deleted_polls: true,
                log_sticky_messages: true,
                ignored_channels: [],
                ignored_roles: [],
                ignored_users: [],
                category_channels: {},
                type_channels: {}
            });
        }

        const settings = rows[0];
        return NextResponse.json({
            ...settings,
            ignored_channels: JSON.parse(settings.ignored_channels || '[]'),
            ignored_roles: JSON.parse(settings.ignored_roles || '[]'),
            ignored_users: JSON.parse(settings.ignored_users || '[]'),
            category_channels: JSON.parse(settings.category_channels || '{}'),
            type_channels: JSON.parse(settings.type_channels || '{}')
        });
    } catch (error: any) {
        console.error('Logging API error:', error);
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
            use_webhooks,
            ignore_embeds,
            ignore_voice_users,
            log_deleted_polls,
            log_sticky_messages,
            ignored_channels,
            ignored_roles,
            ignored_users,
            category_channels,
            type_channels
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        await pool.query(`
            INSERT INTO logging_settings 
            (guild_id, use_webhooks, ignore_embeds, ignore_voice_users, log_deleted_polls, 
             log_sticky_messages, ignored_channels, ignored_roles, ignored_users, category_channels, type_channels)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                use_webhooks = VALUES(use_webhooks),
                ignore_embeds = VALUES(ignore_embeds),
                ignore_voice_users = VALUES(ignore_voice_users),
                log_deleted_polls = VALUES(log_deleted_polls),
                log_sticky_messages = VALUES(log_sticky_messages),
                ignored_channels = VALUES(ignored_channels),
                ignored_roles = VALUES(ignored_roles),
                ignored_users = VALUES(ignored_users),
                category_channels = VALUES(category_channels),
                type_channels = VALUES(type_channels),
                updated_at = CURRENT_TIMESTAMP
        `, [
            guild_id,
            use_webhooks ? 1 : 0,
            ignore_embeds ? 1 : 0,
            ignore_voice_users ? 1 : 0,
            log_deleted_polls ? 1 : 0,
            log_sticky_messages ? 1 : 0,
            JSON.stringify(ignored_channels || []),
            JSON.stringify(ignored_roles || []),
            JSON.stringify(ignored_users || []),
            JSON.stringify(category_channels || {}),
            JSON.stringify(type_channels || {})
        ]);

        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', session.user.name || 'Admin', 'Logging: Settings Updated', 'Updated logging settings']
        ).catch(() => { });

        return NextResponse.json({ success: true, message: 'Logging settings saved!' });
    } catch (error: any) {
        console.error('Logging API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
