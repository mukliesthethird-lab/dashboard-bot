import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch logs for a guild
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const [logs]: any = await pool.query(
            `SELECT id, user_id, username, action, details, created_at 
             FROM dashboard_logs 
             WHERE guild_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [guildId, limit]
        );

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Error fetching logs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create a new log entry
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { guild_id, action, details } = body;

        if (!guild_id || !action) {
            return NextResponse.json({ error: 'guild_id and action are required' }, { status: 400 });
        }

        // Get user info from session
        const userId = (session as any).userId || 'unknown';
        const username = session.user.name || 'Unknown';

        await pool.query(
            `INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)`,
            [guild_id, userId, username, action, details || null]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error creating log:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
