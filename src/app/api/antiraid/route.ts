import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const [rows]: any = await pool.query(
            'SELECT * FROM antiraid_settings WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            return NextResponse.json({
                guild_id: guildId,
                enabled: 0,
                mass_join_enabled: 1,
                mass_join_threshold: 5,
                mass_join_window: 10,
                mass_join_action: 'kick',
                account_age_enabled: 0,
                min_account_age_days: 7,
                account_age_action: 'kick',
                no_avatar_enabled: 0,
                no_avatar_action: 'flag',
                auto_lockdown_enabled: 0,
                lockdown_duration_minutes: 10,
                verification_enabled: 0,
                verification_role_id: null,
                dm_notification_enabled: 1,
                dm_message: '',
                whitelist_role_ids: '[]',
                log_channel_id: null,
                anti_bot_enabled: 0,
                join_slowmode_enabled: 0,
                join_slowmode_seconds: 30
            });
        }

        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error('AntiRaid API error:', error);
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
            mass_join_enabled,
            mass_join_threshold,
            mass_join_window,
            mass_join_action,
            account_age_enabled,
            min_account_age_days,
            account_age_action,
            no_avatar_enabled,
            no_avatar_action,
            auto_lockdown_enabled,
            lockdown_duration_minutes,
            verification_enabled,
            verification_role_id,
            dm_notification_enabled,
            dm_message,
            whitelist_role_ids,
            log_channel_id,
            anti_bot_enabled,
            join_slowmode_enabled,
            join_slowmode_seconds
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        await pool.query(`
            INSERT INTO antiraid_settings 
            (guild_id, enabled, mass_join_enabled, mass_join_threshold, mass_join_window, mass_join_action,
             account_age_enabled, min_account_age_days, account_age_action,
             no_avatar_enabled, no_avatar_action,
             auto_lockdown_enabled, lockdown_duration_minutes,
             verification_enabled, verification_role_id,
             dm_notification_enabled, dm_message,
             whitelist_role_ids, log_channel_id,
             anti_bot_enabled, join_slowmode_enabled, join_slowmode_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                enabled = VALUES(enabled),
                mass_join_enabled = VALUES(mass_join_enabled),
                mass_join_threshold = VALUES(mass_join_threshold),
                mass_join_window = VALUES(mass_join_window),
                mass_join_action = VALUES(mass_join_action),
                account_age_enabled = VALUES(account_age_enabled),
                min_account_age_days = VALUES(min_account_age_days),
                account_age_action = VALUES(account_age_action),
                no_avatar_enabled = VALUES(no_avatar_enabled),
                no_avatar_action = VALUES(no_avatar_action),
                auto_lockdown_enabled = VALUES(auto_lockdown_enabled),
                lockdown_duration_minutes = VALUES(lockdown_duration_minutes),
                verification_enabled = VALUES(verification_enabled),
                verification_role_id = VALUES(verification_role_id),
                dm_notification_enabled = VALUES(dm_notification_enabled),
                dm_message = VALUES(dm_message),
                whitelist_role_ids = VALUES(whitelist_role_ids),
                log_channel_id = VALUES(log_channel_id),
                anti_bot_enabled = VALUES(anti_bot_enabled),
                join_slowmode_enabled = VALUES(join_slowmode_enabled),
                join_slowmode_seconds = VALUES(join_slowmode_seconds)
        `, [
            guild_id,
            enabled ? 1 : 0,
            mass_join_enabled ? 1 : 0,
            mass_join_threshold || 5,
            mass_join_window || 10,
            mass_join_action || 'kick',
            account_age_enabled ? 1 : 0,
            min_account_age_days || 7,
            account_age_action || 'kick',
            no_avatar_enabled ? 1 : 0,
            no_avatar_action || 'flag',
            auto_lockdown_enabled ? 1 : 0,
            lockdown_duration_minutes || 10,
            verification_enabled ? 1 : 0,
            verification_role_id || null,
            dm_notification_enabled ? 1 : 0,
            dm_message || '',
            whitelist_role_ids || '[]',
            log_channel_id || null,
            anti_bot_enabled ? 1 : 0,
            join_slowmode_enabled ? 1 : 0,
            join_slowmode_seconds || 30
        ]);

        console.log(`[AntiRaid Update] Guild: ${guild_id} | User: ${session?.user?.name || 'Unknown'}`);
        return NextResponse.json({ success: true, message: 'Anti-Raid settings saved!' });
    } catch (error: any) {
        console.error('AntiRaid API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
