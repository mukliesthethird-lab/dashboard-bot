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
        const { game, bet, target, betType, betValue } = body;

        if (!game || !bet || bet < 10) {
            return NextResponse.json({ error: 'Invalid bet amount (min: 10)' }, { status: 400 });
        }

        const [userRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
        if (!userRow[0] || userRow[0].balance < bet) {
            return NextResponse.json({ error: 'Saldo tidak cukup' }, { status: 400 });
        }

        if (game === 'crash') {
            const action = body.action || 'auto'; // 'auto', 'start', 'claim'

            if (action === 'auto' || action === 'start') {
                if (action === 'auto' && (!target || target <= 1.0)) {
                    return NextResponse.json({ error: 'Target multiplier must be greater than 1.0' }, { status: 400 });
                }

                // Deduct initial bet
                await pool.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [bet, userId]);

                // Math to determine crash point
                let crashPoint = 1.00;
                if (Math.random() >= 0.05) {
                    crashPoint = parseFloat(Math.max(1.01, 1.00 / (1.0 - Math.random())).toFixed(2));
                    if (crashPoint > 50.0) crashPoint = 50.0;
                }

                if (action === 'start') {
                    // Just start the game, return the result hidden for simulation
                    return NextResponse.json({
                        success: true,
                        crashPoint,
                        newBalance: userRow[0].balance - bet
                    });
                }

                // Standard Auto logic
                let won = false;
                let finalBalance = userRow[0].balance - bet;
                if (crashPoint >= target) {
                    won = true;
                    const winnings = Math.floor(bet * target);
                    await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [winnings, userId]);
                    finalBalance += winnings;
                    await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', [userId, 'WEB_CRASH_WIN', bet, winnings]);
                } else {
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

            if (action === 'claim') {
                const { multiplier } = body;
                if (!multiplier || multiplier <= 1.0) {
                    return NextResponse.json({ error: 'Invalid multiplier claim' }, { status: 400 });
                }

                const winnings = Math.floor(bet * multiplier);
                await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [winnings, userId]);
                
                await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', 
                    [userId, 'WEB_CRASH_MANUAL_WIN', bet, winnings]);

                const [updatedRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);
                return NextResponse.json({
                    success: true,
                    newBalance: updatedRow[0].balance,
                    winnings
                });
            }
        }

        if (game === 'slots') {
            const symbols = ["🍒", "🍋", "🍇", "🍊", "🍉", "💎", "⭐"];
            const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel3 = symbols[Math.floor(Math.random() * symbols.length)];
            const resultReels = [reel1, reel2, reel3];

            let winnings = 0;
            let resultText = "LOSE";

            // Logic matching Slot.py
            if (reel1 === reel2 && reel2 === reel3) {
                if (reel1 === "💎") {
                    winnings = bet * 20;
                    resultText = "DIAMOND JACKPOT";
                } else if (reel1 === "⭐") {
                    winnings = bet * 15;
                    resultText = "STAR JACKPOT";
                } else {
                    winnings = bet * 10;
                    resultText = "JACKPOT";
                }
            } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                winnings = Math.floor(bet * 1.5);
                resultText = "DOUBLE MATCH";
            } else {
                winnings = -bet;
                resultText = "LOSE";
            }

            // Apply results to DB
            const finalChange = winnings > 0 ? winnings : -bet;
            if (winnings > 0) {
                await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [winnings, userId]);
            } else {
                await pool.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [bet, userId]);
            }

            await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', 
                [userId, winnings > 0 ? 'WEB_SLOTS_WIN' : 'WEB_SLOTS_LOSS', bet, finalChange]);

            const [updatedRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);

            return NextResponse.json({
                success: true,
                reels: resultReels,
                won: winnings > 0,
                winnings,
                resultText,
                newBalance: updatedRow[0].balance
            });
        }

        if (game === 'roulette') {
            const winningNumber = Math.floor(Math.random() * 37); // 0-36
            let won = false;
            let winnings = 0;

            // Advanced Betting Types
            if (betType === 'number') {
                if (winningNumber === parseInt(betValue)) {
                    won = true;
                    winnings = bet * 35;
                }
            } else if (betType === 'color') {
                const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
                const winningColor = winningNumber === 0 ? 'green' : (redNumbers.includes(winningNumber) ? 'red' : 'black');
                if (winningColor === betValue) {
                    won = true;
                    winnings = bet * (betValue === 'green' ? 14 : 1); // Bot uses 14x for green, 2x total (1x gain) for R/B
                }
            } else if (betType === 'even_odd') {
                if (winningNumber !== 0) {
                    const isEven = winningNumber % 2 === 0;
                    if ((betValue === 'even' && isEven) || (betValue === 'odd' && !isEven)) {
                        won = true;
                        winnings = bet;
                    }
                }
            }

            if (won) {
                await pool.query('UPDATE slot_users SET balance = balance + ? WHERE user_id = ?', [winnings, userId]);
            } else {
                await pool.query('UPDATE slot_users SET balance = balance - ? WHERE user_id = ?', [bet, userId]);
            }

            await pool.query('INSERT INTO casino_logs (user_id, game_type, bet_amount, result_amount) VALUES (?, ?, ?, ?)', 
                [userId, won ? 'WEB_ROULETTE_WIN' : 'WEB_ROULETTE_LOSS', bet, won ? winnings : -bet]);

            const [updatedRow]: any = await pool.query('SELECT balance FROM slot_users WHERE user_id = ?', [userId]);

            return NextResponse.json({
                success: true,
                winningNumber,
                won,
                winnings,
                newBalance: updatedRow[0].balance
            });
        }

        return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    } catch (error: any) {
        console.error('Casino POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
