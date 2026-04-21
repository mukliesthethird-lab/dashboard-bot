import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RATE = 100; // 1 Chip = 100 Coins

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const { action, amount } = await req.json();

        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Start Transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Get current balances
            const [userRow]: any = await connection.query('SELECT balance FROM slot_users WHERE user_id = ? FOR UPDATE', [userId]);
            let currentCoins = userRow[0]?.balance || 0;
            if (!userRow[0]) {
                await connection.query('INSERT INTO slot_users (user_id, balance) VALUES (?, ?)', [userId, 0]);
                currentCoins = 0;
            }

            const [chipRow]: any = await connection.query('SELECT chips FROM casino_chips WHERE user_id = ? FOR UPDATE', [userId]);
            let currentChips = chipRow[0]?.chips || 0;
            if (!chipRow[0]) {
                await connection.query('INSERT INTO casino_chips (user_id, chips) VALUES (?, ?)', [userId, 0]);
                currentChips = 0;
            }

            if (action === 'buy_chips') {
                const coinCost = amount * RATE;
                if (currentCoins < coinCost) {
                    await connection.rollback();
                    return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
                }
                
                await connection.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [coinCost, userId]);
                await connection.query('UPDATE casino_chips SET chips = chips + ? WHERE user_id = ?', [amount, userId]);
                
            } else if (action === 'cashout') {
                if (currentChips < amount) {
                    await connection.rollback();
                    return NextResponse.json({ error: 'Insufficient chips' }, { status: 400 });
                }

                const coinGain = amount * RATE;
                await connection.query('UPDATE casino_chips SET chips = chips - ? WHERE user_id = ?', [amount, userId]);
                await connection.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [coinGain, userId]);
                
            } else {
                await connection.rollback();
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
            }

            await connection.commit();
            
            // Fetch updated balances
            const [newUserRow]: any = await connection.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
            const [newChipRow]: any = await connection.query('SELECT chips FROM casino_chips WHERE user_id = ?', [userId]);

            return NextResponse.json({ 
                success: true, 
                newCoins: newUserRow[0].balance,
                newChips: newChipRow[0].chips 
            });

        } catch (err: any) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error('Exchange API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
