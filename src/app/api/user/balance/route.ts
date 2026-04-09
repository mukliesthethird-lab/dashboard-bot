import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const [userRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
        
        if (!userRow[0]) {
            // Create user if not exists with default balance
            await pool.query('INSERT INTO slot_users (user_id, balance) VALUES (?, ?)', [userId, 500]);
            return NextResponse.json({ balance: 500 });
        }

        return NextResponse.json({ balance: userRow[0].balance });
    } catch (error: any) {
        console.error('Balance API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
