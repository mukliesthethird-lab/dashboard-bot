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
        const [rawBgRows]: any = await pool.query('SELECT * FROM background_assets');
        const bgRows = rawBgRows.map((bg: any) => {
            if (bg.path && (bg.path.includes('\\') || bg.path.includes('/'))) {
                const filename = bg.path.replace(/\\/g, '/').split('/').pop();
                return { ...bg, url: `/backgrounds/${filename}` };
            }
            return { ...bg, url: bg.path };
        });



        // Fetch user stats (from slot_users)
        const [statRows]: any = await pool.query(`
            SELECT 
                level, xp, balance, 
                total_messages, voice_seconds, 
                total_gamble_amount, total_pay_amount, 
                total_songs_played, daily_streak
            FROM slot_users 
            WHERE user_id = ?
        `, [userId]);

        // Fetch fishing stats
        const [fishRows]: any = await pool.query(`
            SELECT total_catches, rare_catches, trash_catches 
            FROM fishing_profile 
            WHERE user_id = ?
        `, [userId]);

        // Fetch unlocked backgrounds count
        const [unlockedBgRows]: any = await pool.query(
            'SELECT COUNT(*) as count FROM unlocked_backgrounds WHERE user_id = ?',
            [userId]
        );

        const stats = statRows.length > 0 ? statRows[0] : { 
            level: 1, xp: 0, balance: 0, 
            total_messages: 0, voice_seconds: 0, 
            total_gamble_amount: 0, total_pay_amount: 0, 
            total_songs_played: 0, daily_streak: 0 
        };
        
        const fishStats = fishRows.length > 0 ? fishRows[0] : { 
            total_catches: 0, rare_catches: 0, trash_catches: 0 
        };

        const unlockedBgCount = unlockedBgRows[0]?.count || 0;

        return NextResponse.json({
            customization: customRows.length > 0 ? customRows[0] : { background_id: 0, shown_badges: '[]' },
            backgrounds: bgRows,
            badges: [],
            stats: { 
                ...stats, 
                ...fishStats,
                unlocked_backgrounds: unlockedBgCount
            }
        });
    } catch (error: any) {
        console.error('Profile API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // EMERGENCY HACK: Update all DB paths to relative
        await pool.query(`
            UPDATE background_assets 
            SET path = CONCAT('assets/profile/', SUBSTRING_INDEX(REPLACE(path, '\\\\', '/'), '/', -1)) 
            WHERE path LIKE 'C:%' OR path LIKE '%dashboard-donpollo%';
        `);

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session as any).userId || (session.user as any).id;
        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        const body = await request.json();
        const { background_id } = body;

        await pool.query(`
            INSERT INTO profile_customization (user_id, background_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                background_id = VALUES(background_id)
        `, [
            userId,
            background_id || 0
        ]);

        return NextResponse.json({ success: true, message: 'Profile customization saved!' });
    } catch (error: any) {
        console.error('Profile API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
