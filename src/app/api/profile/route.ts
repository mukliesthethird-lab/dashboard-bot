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

        // NextAuth Discord provider usually puts the Discord ID in the 'sub' or 'id' field
        // We need to make sure we've mapped it correctly in authOptions.
        // Assuming session.user has the id or we can get it from session.
        const userId = (session as any).userId || (session.user as any).id;

        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        // Fetch user customization
        const [customRows]: any = await pool.query(
            'SELECT background_id, shown_badges FROM profile_customization WHERE user_id = ?',
            [userId]
        );

        // Fetch all available backgrounds
        const [bgRows]: any = await pool.query('SELECT * FROM background_assets');

        // Fetch all available badges
        const [badgeRows]: any = await pool.query('SELECT * FROM badges');

        // Fetch user stats (from slot_users)
        const [statRows]: any = await pool.query(
            'SELECT level, xp, balance FROM slot_users WHERE user_id = ?',
            [userId]
        );

        // Fetch fishing stats
        const [fishRows]: any = await pool.query(
            'SELECT total_catches FROM fishing_profile WHERE user_id = ?',
            [userId]
        );

        const stats = statRows.length > 0 ? statRows[0] : { level: 1, xp: 0, balance: 0 };
        const fishStats = fishRows.length > 0 ? fishRows[0] : { total_catches: 0 };

        return NextResponse.json({
            customization: customRows.length > 0 ? customRows[0] : { background_id: 0, shown_badges: '[]' },
            backgrounds: bgRows,
            badges: badgeRows,
            stats: { 
                ...stats, 
                total_catches: fishStats.total_catches 
            }
        });
    } catch (error: any) {
        console.error('Profile API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session as any).userId || (session.user as any).id;
        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        const body = await request.json();
        const { background_id, shown_badges } = body;

        await pool.query(`
            INSERT INTO profile_customization (user_id, background_id, shown_badges)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                background_id = VALUES(background_id),
                shown_badges = VALUES(shown_badges)
        `, [
            userId,
            background_id || 0,
            Array.isArray(shown_badges) ? JSON.stringify(shown_badges) : shown_badges || '[]'
        ]);

        return NextResponse.json({ success: true, message: 'Profile customization saved!' });
    } catch (error: any) {
        console.error('Profile API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
