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

        const [rows]: any = await pool.query(
            'SELECT * FROM notifications_feeds WHERE guild_id = ? ORDER BY created_at DESC',
            [guildId]
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('Notifications API GET error:', error);
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
            id,
            guild_id,
            type,
            feed_url,
            discord_channel_id,
            custom_message_json,
            is_enabled
        } = body;

        if (!guild_id || !type || !feed_url || !discord_channel_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (id) {
            // Update existing
            await pool.query(`
                UPDATE notifications_feeds 
                SET feed_url = ?, 
                    discord_channel_id = ?, 
                    custom_message_json = ?, 
                    is_enabled = ?
                WHERE id = ? AND guild_id = ?
            `, [feed_url, discord_channel_id, JSON.stringify(custom_message_json), is_enabled ? 1 : 0, id, guild_id]);
        } else {
            // Insert new
            await pool.query(`
                INSERT INTO notifications_feeds 
                (guild_id, type, feed_url, discord_channel_id, custom_message_json, is_enabled)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [guild_id, type, feed_url, discord_channel_id, JSON.stringify(custom_message_json), is_enabled ? 1 : 0]);
        }

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', session.user.name || 'Admin', `Notifications: Feed ${id ? 'Updated' : 'Added'}`, `${type} feed: ${feed_url}`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: `Notification feed ${id ? 'updated' : 'added'}!` });
    } catch (error: any) {
        console.error('Notifications API POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const guildId = searchParams.get('guild_id');

        if (!id || !guildId) {
            return NextResponse.json({ error: 'id and guild_id are required' }, { status: 400 });
        }

        await pool.query(
            'DELETE FROM notifications_feeds WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guildId, 'admin', session.user.name || 'Admin', 'Notifications: Feed Deleted', `Deleted feed ID: ${id}`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: 'Notification feed deleted!' });
    } catch (error: any) {
        console.error('Notifications API DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
