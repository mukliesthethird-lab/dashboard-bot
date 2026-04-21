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
        const [chipRow]: any = await pool.query('SELECT chips FROM casino_chips WHERE user_id = ?', [userId]);
        
        let finalBalance = 0;
        let finalChips = 0;

        if (!userRow[0]) {
            // Create user if not exists with default balance
            await pool.query('INSERT INTO slot_users (user_id, balance) VALUES (?, ?)', [userId, 500]);
            finalBalance = 500;
        } else {
            finalBalance = userRow[0].balance;
        }

        if (!chipRow[0]) {
            await pool.query('INSERT INTO casino_chips (user_id, chips) VALUES (?, ?)', [userId, 0]);
            finalChips = 0;
        } else {
            finalChips = chipRow[0].chips;
        }

        return NextResponse.json({ balance: finalBalance, chips: finalChips });
    } catch (error: any) {
        console.error('Balance API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
