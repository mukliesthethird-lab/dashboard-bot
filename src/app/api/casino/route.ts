import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const body = await request.json();
        const { game, bet, target } = body;

        if (!game || !bet || bet < 10) {
            return NextResponse.json({ error: 'Invalid bet amount (min: 10)' }, { status: 400 });
        }

        const [userRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
        if (!userRow[0] || userRow[0].balance < bet) {
            return NextResponse.json({ error: 'Saldo tidak cukup' }, { status: 400 });
        }

        if (game === 'crash') {
            if (!target || target <= 1.0) {
                return NextResponse.json({ error: 'Target multiplier must be greater than 1.0' }, { status: 400 });
            }

            // Deduct initial bet
            await pool.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [bet, userId]);

            // Math to determine crash point (same as Python logic)
            let crashPoint = 1.00;
            if (Math.random() >= 0.05) {
                crashPoint = parseFloat(Math.max(1.01, 1.00 / (1.0 - Math.random())).toFixed(2));
                if (crashPoint > 50.0) crashPoint = 50.0;
            }

            let won = false;
            let resultAmount = -bet;
            let finalBalance = userRow[0].balance - bet;

            if (crashPoint >= target) {
                won = true;
                const winnings = Math.floor(bet * target);
                resultAmount = winnings;
                await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [winnings, userId]);
                finalBalance += winnings;
                
                // Track win in logs
                await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', [userId, 'WEB_CRASH_WIN', bet, winnings]);
            } else {
                // Track loss
                await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', [userId, 'WEB_CRASH_LOSS', bet, -bet]);
            }

            return NextResponse.json({
                success: true,
                crashPoint,
                won,
                target,
                winnings: won ? Math.floor(bet * target) : 0,
                newBalance: finalBalance
            });
        }

        return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    } catch (error: any) {
        console.error('Casino POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
