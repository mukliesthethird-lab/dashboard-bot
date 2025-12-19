import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';

function fetchDiscordAPI(apiPath: string, token: string): Promise<any[]> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10${apiPath}`,
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

// Helper to format relative time
function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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

        // Get channels for the guild
        if (action === 'channels') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const channels = await fetchDiscordAPI(`/guilds/${guildId}/channels`, token);
            const textChannels = channels.filter((c: any) => c.type === 0);
            return NextResponse.json(textChannels.map((c: any) => ({
                id: c.id, name: c.name, position: c.position
            })).sort((a: any, b: any) => a.position - b.position));
        }

        // Get roles for the guild
        if (action === 'roles') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const roles = await fetchDiscordAPI(`/guilds/${guildId}/roles`, token);
            return NextResponse.json(roles
                .filter((r: any) => r.name !== '@everyone')
                .map((r: any) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
                .sort((a: any, b: any) => b.position - a.position));
        }

        // Get moderation settings
        if (action === 'settings') {
            const [rows]: any = await pool.query(
                'SELECT * FROM moderation_settings WHERE guild_id = ?',
                [guildId]
            );

            if (rows.length === 0) {
                return NextResponse.json({
                    guild_id: guildId,
                    user_notifications: true,
                    purge_pinned: true,
                    appeals_enabled: false,
                    immune_roles: [],
                    predefined_reasons: {},
                    locked_channels: [],
                    privacy_show_moderator: true,
                    privacy_show_reason: true,
                    privacy_show_duration: true,
                    appeals_channel_id: null,
                    appeals_config: {},
                    default_mute_duration: '1 hour',
                    default_ban_duration: 'Permanent',
                    report_channel_id: null
                });
            }

            const settings = rows[0];
            return NextResponse.json({
                ...settings,
                immune_roles: JSON.parse(settings.immune_roles || '[]'),
                predefined_reasons: JSON.parse(settings.predefined_reasons || '{}'),
                locked_channels: JSON.parse(settings.locked_channels || '[]'),
                appeals_config: JSON.parse(settings.appeals_config || '{}'),
                report_channel_id: settings.report_channel_id ? String(settings.report_channel_id) : null,
                appeals_channel_id: settings.appeals_channel_id ? String(settings.appeals_channel_id) : null,
                guild_id: String(settings.guild_id)
            });
        }

        // Get moderation cases
        if (action === 'cases') {
            const search = searchParams.get('search') || '';
            const type = searchParams.get('type') || '';
            const status = searchParams.get('status') || '';
            const limit = parseInt(searchParams.get('limit') || '50');
            const offset = parseInt(searchParams.get('offset') || '0');

            let query = 'SELECT * FROM moderation_cases WHERE guild_id = ?';
            const params: any[] = [guildId];

            if (search) {
                query += ' AND (case_id LIKE ? OR user_id LIKE ? OR user_username LIKE ? OR reason LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern);
            }

            if (type && type !== 'all') {
                const types = type.split(',');
                query += ` AND type IN (${types.map(() => '?').join(',')})`;
                params.push(...types);
            }

            if (status && status !== 'all') {
                query += ' AND status = ?';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows]: any = await pool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM moderation_cases WHERE guild_id = ?';
            const countParams: any[] = [guildId];
            if (search) {
                countQuery += ' AND (case_id LIKE ? OR user_id LIKE ? OR user_username LIKE ? OR reason LIKE ?)';
                const searchPattern = `%${search}%`;
                countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
            }
            if (type && type !== 'all') {
                const types = type.split(',');
                countQuery += ` AND type IN (${types.map(() => '?').join(',')})`;
                countParams.push(...types);
            }
            if (status && status !== 'all') {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }

            const [countRows]: any = await pool.query(countQuery, countParams);
            const total = countRows[0]?.total || 0;

            const cases = rows.map((row: any) => ({
                id: row.case_id,
                type: row.type,
                user: {
                    id: row.user_id,
                    username: row.user_username,
                    avatar: row.user_avatar || '0'
                },
                reason: row.reason || 'No reason provided',
                author: {
                    id: row.author_id,
                    username: row.author_username,
                    avatar: row.author_avatar || '0'
                },
                duration: row.duration,
                status: row.status,
                created_at: new Date(row.created_at).toLocaleDateString(),
                relative_time: getRelativeTime(new Date(row.created_at))
            }));

            return NextResponse.json({ cases, total, limit, offset });
        }

        // Get user reports (matches Report.py schema)
        if (action === 'reports') {
            const search = searchParams.get('search') || '';
            const status = searchParams.get('status') || '';
            const limit = parseInt(searchParams.get('limit') || '50');
            const offset = parseInt(searchParams.get('offset') || '0');

            let query = 'SELECT * FROM user_reports WHERE guild_id = ?';
            const params: any[] = [guildId];

            if (search) {
                // Report.py uses: id, reporter_name, reported_name, case_number, reason
                // Update to check report_id too
                query += ' AND (id LIKE ? OR report_id LIKE ? OR case_number LIKE ? OR reporter_name LIKE ? OR reported_name LIKE ? OR reason LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            }

            if (status && status !== 'all') {
                query += ' AND status = ?';
                params.push(status);
            }

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows]: any = await pool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM user_reports WHERE guild_id = ?';
            const countParams: any[] = [guildId];
            if (search) {
                countQuery += ' AND (id LIKE ? OR report_id LIKE ? OR case_number LIKE ? OR reporter_name LIKE ? OR reported_name LIKE ? OR reason LIKE ?)';
                const searchPattern = `%${search}%`;
                countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            }
            if (status && status !== 'all') {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }

            const [countRows]: any = await pool.query(countQuery, countParams);
            const total = countRows[0]?.total || 0;

            // Map to Report.py schema:
            const reports = rows.map((row: any) => ({
                id: row.id,
                report_id: row.report_id, // Unique string ID
                case_number: row.case_number,
                reporter: {
                    id: row.reporter_id,
                    username: row.reporter_name || 'Unknown',
                    avatar: row.reporter_avatar // Avatar URL
                },
                reportedUser: {
                    id: row.reported_id,
                    username: row.reported_name || 'Unknown',
                    avatar: row.reported_avatar // Avatar URL
                },
                tanggal: row.tanggal,
                reason: row.reason,
                bukti_gambar: row.bukti_gambar,
                status: row.status,
                created_at: new Date(row.created_at).toLocaleDateString(),
                relative_time: getRelativeTime(new Date(row.created_at))
            }));

            return NextResponse.json({ reports, total, limit, offset });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Moderation API error:', error);
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
        const { action, guild_id } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        // Save moderation settings
        if (action === 'settings') {
            const {
                user_notifications,
                purge_pinned,
                appeals_enabled,
                immune_roles,
                predefined_reasons,
                locked_channels,
                privacy_show_moderator,
                privacy_show_reason,
                privacy_show_duration,
                appeals_channel_id,
                appeals_config,
                default_mute_duration,
                default_ban_duration,
                report_channel_id
            } = body;

            await pool.query(`
                INSERT INTO moderation_settings 
                (guild_id, user_notifications, purge_pinned, appeals_enabled, immune_roles, 
                 predefined_reasons, locked_channels, privacy_show_moderator, privacy_show_reason,
                 privacy_show_duration, appeals_channel_id, appeals_config, default_mute_duration, default_ban_duration, report_channel_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    user_notifications = VALUES(user_notifications),
                    purge_pinned = VALUES(purge_pinned),
                    appeals_enabled = VALUES(appeals_enabled),
                    immune_roles = VALUES(immune_roles),
                    predefined_reasons = VALUES(predefined_reasons),
                    locked_channels = VALUES(locked_channels),
                    privacy_show_moderator = VALUES(privacy_show_moderator),
                    privacy_show_reason = VALUES(privacy_show_reason),
                    privacy_show_duration = VALUES(privacy_show_duration),
                    appeals_channel_id = VALUES(appeals_channel_id),
                    appeals_config = VALUES(appeals_config),
                    default_mute_duration = VALUES(default_mute_duration),
                    default_ban_duration = VALUES(default_ban_duration),
                    report_channel_id = VALUES(report_channel_id),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                guild_id,
                user_notifications ? 1 : 0,
                purge_pinned ? 1 : 0,
                appeals_enabled ? 1 : 0,
                JSON.stringify(immune_roles || []),
                JSON.stringify(predefined_reasons || {}),
                JSON.stringify(locked_channels || []),
                privacy_show_moderator ? 1 : 0,
                privacy_show_reason ? 1 : 0,
                privacy_show_duration ? 1 : 0,
                appeals_channel_id || null,
                JSON.stringify(appeals_config || {}),
                default_mute_duration || '1 hour',
                default_ban_duration || 'Permanent',
                report_channel_id || null
            ]);

            return NextResponse.json({ success: true, message: 'Settings saved!' });
        }

        // Edit case(s)
        if (action === 'case-edit') {
            const { case_ids, reason, duration } = body;
            if (!case_ids || case_ids.length === 0) {
                return NextResponse.json({ error: 'case_ids required' }, { status: 400 });
            }

            const updates: string[] = [];
            const params: any[] = [];

            if (reason !== undefined) {
                updates.push('reason = ?');
                params.push(reason);
            }
            if (duration !== undefined) {
                updates.push('duration = ?');
                params.push(duration);
            }

            if (updates.length === 0) {
                return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
            }

            await pool.query(
                `UPDATE moderation_cases SET ${updates.join(', ')} WHERE guild_id = ? AND case_id IN (${case_ids.map(() => '?').join(',')})`,
                [...params, guild_id, ...case_ids]
            );

            return NextResponse.json({ success: true, message: `Updated ${case_ids.length} case(s)` });
        }

        // Close case(s)
        if (action === 'case-close') {
            const { case_ids } = body;
            if (!case_ids || case_ids.length === 0) {
                return NextResponse.json({ error: 'case_ids required' }, { status: 400 });
            }

            await pool.query(
                `UPDATE moderation_cases SET status = 'closed', closed_at = NOW() WHERE guild_id = ? AND case_id IN (${case_ids.map(() => '?').join(',')})`,
                [guild_id, ...case_ids]
            );

            return NextResponse.json({ success: true, message: `Closed ${case_ids.length} case(s)` });
        }

        // Delete case(s)
        if (action === 'case-delete') {
            const { case_ids } = body;
            if (!case_ids || case_ids.length === 0) {
                return NextResponse.json({ error: 'case_ids required' }, { status: 400 });
            }

            await pool.query(
                `DELETE FROM moderation_cases WHERE guild_id = ? AND case_id IN (${case_ids.map(() => '?').join(',')})`,
                [guild_id, ...case_ids]
            );

            return NextResponse.json({ success: true, message: `Deleted ${case_ids.length} case(s)` });
        }

        // Resolve report (uses id column from Report.py schema)
        if (action === 'report-resolve') {
            const { report_ids, resolution_note } = body;
            if (!report_ids || report_ids.length === 0) {
                return NextResponse.json({ error: 'report_ids required' }, { status: 400 });
            }

            await pool.query(
                `UPDATE user_reports SET status = 'resolved' WHERE guild_id = ? AND id IN (${report_ids.map(() => '?').join(',')})`,
                [guild_id, ...report_ids]
            );

            return NextResponse.json({ success: true, message: `Resolved ${report_ids.length} report(s)` });
        }

        // Dismiss report (uses id column from Report.py schema)
        if (action === 'report-dismiss') {
            const { report_ids, resolution_note } = body;
            if (!report_ids || report_ids.length === 0) {
                return NextResponse.json({ error: 'report_ids required' }, { status: 400 });
            }

            await pool.query(
                `UPDATE user_reports SET status = 'dismissed' WHERE guild_id = ? AND id IN (${report_ids.map(() => '?').join(',')})`,
                [guild_id, ...report_ids]
            );

            return NextResponse.json({ success: true, message: `Dismissed ${report_ids.length} report(s)` });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Moderation API error:', error);

        // Self-healing: Handle missing columns
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            try {
                const match = error.sqlMessage?.match(/Unknown column '(.+?)'/);
                if (match) {
                    const column = match[1];
                    console.log(`Auto-migrating: Adding missing column ${column}...`);

                    let def = 'VARCHAR(255)';
                    if (column === 'user_notifications' || column.startsWith('privacy_') || column === 'appeals_enabled' || column === 'purge_pinned') {
                        def = 'BOOLEAN DEFAULT FALSE';
                    } else if (column === 'report_channel_id' || column === 'appeals_channel_id') {
                        def = 'BIGINT';
                    } else if (column === 'immune_roles' || column === 'predefined_reasons' || column === 'locked_channels' || column === 'appeals_config') {
                        def = 'JSON';
                    }

                    await pool.query(`ALTER TABLE moderation_settings ADD COLUMN ${column} ${def}`);
                    return NextResponse.json({ error: 'Database updated, please try again' }, { status: 500 });
                }
            } catch (migrationError) {
                console.error('Migration failed:', migrationError);
            }
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
