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
                    id: row.user_id?.toString(),
                    username: row.user_username,
                    avatar: row.user_avatar || '0'
                },
                reason: row.reason || 'No reason provided',
                author: {
                    id: row.author_id?.toString(),
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
                guild_id: row.guild_id?.toString(),
                reporter: {
                    id: row.reporter_id?.toString(),
                    username: row.reporter_name || 'Unknown',
                    avatar: row.reporter_avatar // Avatar URL
                },
                reportedUser: {
                    id: row.reported_id?.toString(),
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

// Helper to generate a 10-character alphanumeric Case ID (matching Moderation.py)
function generateCaseId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Helper to handle Discord API requests
async function callDiscordAPI(apiPath: string, method: string, body: any, token: string) {
    if (!token) {
        console.error('Discord API Error: Token is missing');
        return { error: 'No token' };
    }
    
    return new Promise((resolve) => {
        console.log(`[Discord API] ${method} ${apiPath}`, body || '');
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10${apiPath}`,
            method: method,
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': body ? 'application/json' : 'text/plain',
                'User-Agent': 'DonPolloBot/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try { 
                        const result = data ? JSON.parse(data) : { success: true };
                        console.log(`[Discord API] Success (${res.statusCode})`);
                        resolve(result); 
                    } catch { 
                        resolve({ success: true }); 
                    }
                } else {
                    console.error(`[Discord API] Error (${res.statusCode}):`, data);
                    resolve({ error: res.statusCode, data });
                }
            });
        });
        req.on('error', (e) => {
            console.error('[Discord API] Request failed:', e.message);
            resolve({ error: 500, message: e.message });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Helper to parse duration string to ISO date
function parseDuration(duration: string): string | null {
    if (!duration) return null;
    // Allow spaces and handle common units
    const clean = duration.toLowerCase().replace(/\s+/g, '');
    const match = clean.match(/^(\d+)([mhdy])$/);
    if (!match) {
        // Try to handle "30 minutes", "1 hour" etc
        const longMatch = clean.match(/^(\d+)(minutes|hours|days|year)s?$/);
        if (!longMatch) return null;
        const val = parseInt(longMatch[1]);
        const unit = longMatch[2];
        const now = new Date();
        if (unit.startsWith('minute')) now.setMinutes(now.getMinutes() + val);
        else if (unit.startsWith('hour')) now.setHours(now.getHours() + val);
        else if (unit.startsWith('day')) now.setDate(now.getDate() + val);
        else if (unit.startsWith('year')) now.setFullYear(now.getFullYear() + val);
        return now.toISOString();
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();

    switch (unit) {
        case 'm': now.setMinutes(now.getMinutes() + value); break;
        case 'h': now.setHours(now.getHours() + value); break;
        case 'd': now.setDate(now.getDate() + value); break;
        case 'y': now.setFullYear(now.getFullYear() + value); break;
        default: return null;
    }
    return now.toISOString();
}

// Helper to create standardized embeds
function createEmbed(title: string, description: string, color: number, fields: any[] = [], footerExtra: string = '') {
    const footerText = `Don Pollo Dashboard • ${new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'numeric', day: 'numeric', 
        hour: 'numeric', minute: 'numeric', hour12: true 
    })}`;
    
    return {
        title: title,
        description: description,
        color: color,
        fields: fields,
        footer: { text: footerText },
        timestamp: new Date().toISOString()
    };
}

// Helper to send DM
async function sendDiscordDM(userId: string, content: string | any, token: string) {
    // Ensure userId is a string to avoid BigInt precision loss issues if passed as number
    const targetUserId = userId.toString();
    console.log(`[Discord DM] Sending to user: ${targetUserId}`);
    
    const channel: any = await callDiscordAPI('/users/@me/channels', 'POST', { recipient_id: targetUserId }, token);
    if (channel && channel.id) {
        const body = typeof content === 'string' ? { content } : { embeds: [content] };
        return await callDiscordAPI(`/channels/${channel.id}/messages`, 'POST', body, token);
    } else {
        console.error(`[Discord DM] Failed to create DM channel for user: ${targetUserId}`);
        return { error: 'Failed to create DM channel' };
    }
}

// Helper to send log to server channel
async function sendDiscordLog(guildId: string, category: string, logType: string, embed: any, token: string) {
    try {
        const [rows]: any = await pool.query(
            "SELECT category_channels, type_channels FROM logging_settings WHERE guild_id = ?",
            [guildId]
        );
        
        if (!rows || rows.length === 0) return;

        const categoryChannels = JSON.parse(rows[0].category_channels || '{}');
        const typeChannels = JSON.parse(rows[0].type_channels || '{}');

        // Priority 1: Type-specific channel
        // Priority 2: Category channel
        const channelId = typeChannels[logType] || categoryChannels[category];
        
        if (channelId) {
            await callDiscordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [embed] }, token);
        }
    } catch (err) {
        console.error('Error sending discord log:', err);
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

        const token = getDiscordToken();

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

        // Resolve report
        if (action === 'report-resolve') {
            const { report_ids, mod_action, duration, reporter_id, reported_id, reason } = body;
            if (!report_ids || report_ids.length === 0) {
                return NextResponse.json({ error: 'report_ids required' }, { status: 400 });
            }
            const token = getDiscordToken();

            if (!token) {
                await pool.query(
                    `UPDATE user_reports SET status = 'resolved' WHERE guild_id = ? AND id IN (${report_ids.map(() => '?').join(',')})`,
                    [guild_id, ...report_ids]
                );
                return NextResponse.json({ 
                    success: true, 
                    message: 'Report resolved in database, but Discord actions were skipped because the Bot Token is not configured.',
                    discord_link_failed: true,
                    error: 'MISSING_TOKEN'
                });
            }

            const caseId = generateCaseId();
            const results: any[] = [];
                
                // Fetch extra info from direct reports for logging
                const [reportRows]: any = await pool.query(
                    'SELECT reporter_name, reported_name, reported_avatar FROM user_reports WHERE id = ?', 
                    [report_ids[0]]
                );
                const reportInfo = reportRows[0] || {};

                // 1. Send DM to reporter
                const actionText = mod_action === 'warn' ? 'Peringatan (Warning)' : mod_action.charAt(0).toUpperCase() + mod_action.slice(1);
                const reporterEmbed = createEmbed(
                    '✅ Report Resolved',
                    `Halo! Laporan Anda mengenai pelanggaran oleh user <@${reported_id}> telah kami tinjau dan tangani. Terima kasih telah membantu menjaga komunitas tetap aman!`,
                    0x2ECC71, // Green
                    [
                        { name: "📋 Action Taken", value: `\`${actionText}\``, inline: true },
                        { name: "👮 Moderator", value: `\`${session.user.name || 'Staff'}\``, inline: true }
                    ]
                );
                const reporterDMRes: any = await sendDiscordDM(reporter_id, reporterEmbed, token);
                if (reporterDMRes?.error) results.push({ type: 'reporter_dm', error: reporterDMRes.error });

                // 2. Perform Action on reported user & Log Case
                let logColor = 0x95A5A6; // Default grey
                let actionTitle = "Action Taken";
                let actionError: any = null;

                const userFields = [
                    { name: "👮 Moderator", value: session.user.name || 'Staff', inline: true },
                    { name: "📋 Case ID", value: `\`${caseId}\``, inline: true },
                    { name: "📝 Reason", value: `\`\`\`${reason}\`\`\``, inline: false }
                ];

                if (mod_action === 'warn') {
                    logColor = 0xF1C40F;
                    actionTitle = "⚠️ User Warned";
                    const userWarnEmbed = createEmbed(
                        '⚠️ Peringatan Diterima',
                        `Kamu telah menerima peringatan di server **Don Pollo**. Harap patuhi peraturan server untuk menghindari tindakan lebih lanjut.`,
                        0xFFCC00, 
                        userFields
                    );
                    const dmRes: any = await sendDiscordDM(reported_id, userWarnEmbed, token);
                    if (dmRes?.error) actionError = dmRes.error;
                } else if (mod_action === 'kick') {
                    logColor = 0xE67E22;
                    actionTitle = "👢 User Kicked";
                    const userKickEmbed = createEmbed(
                        '👢 User Kicked',
                        `Kamu telah dikeluarkan (kicked) dari server **Don Pollo**.`,
                        0xE67E22,
                        userFields
                    );
                    await sendDiscordDM(reported_id, userKickEmbed, token);
                    const res: any = await callDiscordAPI(`/guilds/${guild_id}/members/${reported_id.toString()}`, 'DELETE', { reason: `Report resolved (${caseId}): ${reason}` }, token);
                    if (res?.error) actionError = res.error;
                } else if (mod_action === 'ban') {
                    logColor = 0xE74C3C;
                    actionTitle = "🔨 User Banned";
                    const userBanEmbed = createEmbed(
                        '🔨 User Banned',
                        `Kamu telah diblokir (banned) dari server **Don Pollo**.`,
                        0xE74C3C,
                        userFields
                    );
                    await sendDiscordDM(reported_id, userBanEmbed, token);
                    const res: any = await callDiscordAPI(`/guilds/${guild_id}/bans/${reported_id.toString()}`, 'PUT', { delete_message_days: 0, reason: `Report resolved (${caseId}): ${reason}` }, token);
                    if (res?.error) actionError = res.error;
                } else if (mod_action === 'timeout') {
                    logColor = 0x9B59B6;
                    actionTitle = "⏰ User Timed Out";
                    const until = parseDuration(duration || '1h');
                    
                    const timeoutFields = [...userFields];
                    timeoutFields.push({ name: "⏱️ Duration", value: `\`${duration}\``, inline: true });
                    
                    const userTimeoutEmbed = createEmbed(
                        actionTitle,
                        `Kamu telah dibisukan (timeout) di server **Don Pollo**.`,
                        logColor,
                        timeoutFields
                    );
                    await sendDiscordDM(reported_id, userTimeoutEmbed, token);
                    console.log(`[Timeout] Setting timeout for ${reported_id.toString()} until ${until}`);
                    const res: any = await callDiscordAPI(`/guilds/${guild_id}/members/${reported_id.toString()}`, 'PATCH', { communication_disabled_until: until, reason: `Report resolved (${caseId}): ${reason}` }, token);
                    if (res?.error) actionError = res.error;
                }

                if (actionError) results.push({ type: 'mod_action', error: actionError });

                // 3. Send to Server Log Channel
                const logEmbed = createEmbed(
                    actionTitle,
                    `**User:** <@${reported_id}> (\`${reported_id}\`)\n**Moderator:** <@${(session.user as any).id?.toString()}>\n**Reason:** ${reason}`,
                    logColor,
                    [
                        { name: "📋 Case ID", value: `\`${caseId}\``, inline: true },
                        { name: "⏱️ Duration", value: duration || 'N/A', inline: true }
                    ]
                );
                await sendDiscordLog(guild_id, 'moderation', `mod_${mod_action}`, logEmbed, token);

                // 4. Log to moderation_cases table
                await pool.query(`
                    INSERT INTO moderation_cases
                    (case_id, guild_id, type, user_id, user_username, user_avatar,
                     reason, author_id, author_username, author_avatar, duration, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    caseId, guild_id, mod_action, 
                    reported_id, reportInfo.reported_name || 'Unknown', reportInfo.reported_avatar || null,
                    reason,
                    (session.user as any).id?.toString(), session.user.name || 'Moderator', null, 
                    duration || null, 'active'
                ]);

                if (results.some(r => r.error)) {
                    // We still update DB but tell the user about Discord errors
                    await pool.query(
                        `UPDATE user_reports SET status = 'resolved' WHERE guild_id = ? AND id IN (${report_ids.map(() => '?').join(',')})`,
                        [guild_id, ...report_ids]
                    );
                    return NextResponse.json({ 
                        success: true, 
                        message: `Resolved in DB, but Discord API returned errors.`,
                        details: results 
                    });
                }

            await pool.query(
                `UPDATE user_reports SET status = 'resolved' WHERE guild_id = ? AND id IN (${report_ids.map(() => '?').join(',')})`,
                [guild_id, ...report_ids]
            );

            return NextResponse.json({ success: true, message: `Resolved ${report_ids.length} report(s)` });
        }

        // Dismiss report
        if (action === 'report-dismiss') {
            const { report_ids, reporter_id, dismiss_message } = body;
            if (!report_ids || report_ids.length === 0) {
                return NextResponse.json({ error: 'report_ids required' }, { status: 400 });
            }

            if (token && reporter_id && dismiss_message) {
                const dismissEmbed = createEmbed(
                    'ℹ️ Report Dismissed',
                    `Halo! Laporan Anda telah ditinjau oleh staff dan diputuskan untuk tidak ditindaklanjuti saat ini.`,
                    0x3498DB, // Blue
                    [
                        { name: "📝 Pesan Staff", value: `\`\`\`${dismiss_message}\`\`\``, inline: false },
                        { name: "👮 Moderator", value: `\`${session.user.name || 'Staff'}\``, inline: true }
                    ]
                );
                await sendDiscordDM(reporter_id, dismissEmbed, token);
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
