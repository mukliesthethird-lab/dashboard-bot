import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        // Fetch leveling settings
        const [settingsRows]: any = await pool.query(
            'SELECT * FROM leveling_settings WHERE guild_id = ?',
            [guildId]
        );

        // Fetch leveling roles
        const [rolesRows]: any = await pool.query(
            'SELECT * FROM leveling_roles WHERE guild_id = ? ORDER BY level ASC',
            [guildId]
        );

        const settings = settingsRows.length > 0 ? settingsRows[0] : {
            guild_id: guildId,
            enabled: false,
            message: '🎊 Hadeh... si {user} naik level ke **{level}**! Berisik amat lo.',
            channel_id: null
        };

        return NextResponse.json({
            settings,
            roles: rolesRows
        });
    } catch (error: any) {
        console.error('Leveling API error:', error);
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
            message,
            channel_id,
            roles // Array of {role_id, level}
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Upsert leveling settings
            await connection.query(`
                INSERT INTO leveling_settings 
                (guild_id, enabled, message, channel_id)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    enabled = VALUES(enabled),
                    message = VALUES(message),
                    channel_id = VALUES(channel_id),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                guild_id,
                enabled ? 1 : 0,
                message || '',
                channel_id || null
            ]);

            // Sync leveling roles
            if (Array.isArray(roles)) {
                // Remove roles not in the list
                if (roles.length > 0) {
                    const roleIds = roles.map(r => r.role_id);
                    await connection.query(
                        'DELETE FROM leveling_roles WHERE guild_id = ? AND role_id NOT IN (?)',
                        [guild_id, roleIds]
                    );

                    // Insert/Update roles
                    for (const role of roles) {
                        await connection.query(`
                            INSERT INTO leveling_roles (guild_id, role_id, level)
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                role_id = VALUES(role_id),
                                level = VALUES(level)
                        `, [guild_id, role.role_id, role.level]);
                    }
                } else {
                    // If roles list is empty, delete all for this guild
                    await connection.query('DELETE FROM leveling_roles WHERE guild_id = ?', [guild_id]);
                }
            }

            await connection.commit();
            
            // Log the action
            await pool.query(
                'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                [guild_id, 'admin', session.user.name || 'Admin', 'Leveling: Settings Updated', `Updated leveling settings and roles`]
            ).catch(() => { });

            return NextResponse.json({ success: true, message: 'Leveling settings saved!' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('Leveling API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
