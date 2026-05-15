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
            'SELECT * FROM automod_settings WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            // Return default settings (all disabled)
            return NextResponse.json({
                guild_id: guildId,
                anti_links: 0,
                anti_invites: 0,
                anti_spam: 0,
                spam_threshold: 70,
                penalty_action: 'warn',
                blacklisted_words: '[]',
                anti_caps: 0,
                caps_threshold: 70,
                anti_mentions: 0,
                mentions_threshold: 5,
                anti_zalgo: 0,
                anti_emoji: 0,
                emoji_threshold: 10,
                log_channel_id: null,
                exempt_channels: '[]',
                exempt_roles: '[]',
                escalation_rules: '{}',
                use_global_blacklist: 0
            });
        }

        return NextResponse.json(rows[0]);
    } catch (error: any) {
        console.error('Automod API error:', error);
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
            anti_links,
            anti_invites,
            anti_spam,
            spam_threshold,
            penalty_action,
            blacklisted_words,
            anti_caps,
            caps_threshold,
            anti_mentions,
            mentions_threshold,
            anti_zalgo,
            anti_emoji,
            emoji_threshold,
            log_channel_id,
            exempt_channels,
            exempt_roles,
            escalation_rules,
            use_global_blacklist
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        await pool.query(`
            INSERT INTO automod_settings 
            (guild_id, anti_links, anti_invites, anti_spam, spam_threshold, penalty_action, 
             blacklisted_words, anti_caps, caps_threshold, anti_mentions, mentions_threshold, 
             anti_zalgo, anti_emoji, emoji_threshold, log_channel_id, 
             exempt_channels, exempt_roles, escalation_rules, use_global_blacklist)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                anti_links = VALUES(anti_links),
                anti_invites = VALUES(anti_invites),
                anti_spam = VALUES(anti_spam),
                spam_threshold = VALUES(spam_threshold),
                penalty_action = VALUES(penalty_action),
                blacklisted_words = VALUES(blacklisted_words),
                anti_caps = VALUES(anti_caps),
                caps_threshold = VALUES(caps_threshold),
                anti_mentions = VALUES(anti_mentions),
                mentions_threshold = VALUES(mentions_threshold),
                anti_zalgo = VALUES(anti_zalgo),
                anti_emoji = VALUES(anti_emoji),
                emoji_threshold = VALUES(emoji_threshold),
                log_channel_id = VALUES(log_channel_id),
                exempt_channels = VALUES(exempt_channels),
                exempt_roles = VALUES(exempt_roles),
                escalation_rules = VALUES(escalation_rules),
                use_global_blacklist = VALUES(use_global_blacklist)
        `, [
            guild_id,
            anti_links ? 1 : 0,
            anti_invites ? 1 : 0,
            anti_spam ? 1 : 0,
            spam_threshold || 70,
            penalty_action || 'warn',
            blacklisted_words || '[]',
            anti_caps ? 1 : 0,
            caps_threshold || 70,
            anti_mentions ? 1 : 0,
            mentions_threshold || 5,
            anti_zalgo ? 1 : 0,
            anti_emoji ? 1 : 0,
            emoji_threshold || 10,
            log_channel_id || null,
            JSON.stringify(exempt_channels || []),
            JSON.stringify(exempt_roles || []),
            JSON.stringify(escalation_rules || {}),
            use_global_blacklist ? 1 : 0
        ]);

        console.log(`[Automod Update] Guild: ${guild_id} | User: ${session?.user?.name || 'Unknown'}`);

        return NextResponse.json({ success: true, message: 'Automod settings saved!' });
    } catch (error: any) {
        console.error('Automod API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
