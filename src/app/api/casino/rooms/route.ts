import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gameType = searchParams.get('game_type') || 'BLACKJACK';

        const [rooms]: any = await pool.query(
            `SELECT id, game_type, status, max_players, minimum_bet, host_name, created_at,
            (SELECT COUNT(*) FROM casino_players WHERE room_id = casino_rooms.id) as current_players
            FROM casino_rooms 
            WHERE game_type = ? AND status != 'FINISHED'
            ORDER BY created_at DESC`,
            [gameType]
        );

        return NextResponse.json({ success: true, rooms });
    } catch (error: any) {
        console.error('Rooms API GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const userName = session.user?.name || 'Unknown Host';

        const { game_type, minimum_bet, add_bot } = await req.json();

        if (!game_type || !minimum_bet || minimum_bet < 1) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // Generate short random room ID
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Initial state — turn_started_at set NOW so the 15s timer begins from room creation
        const initialState = {
            deck: [],
            dealer_cards: [],
            turn_index: 0,
            phase: 'WAITING',
            turn_started_at: Date.now(),
            results: [],
            is_closing: false,
        };

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Deduct the minimum bet from host's chips to sit down
            const [chipRow]: any = await connection.query('SELECT chips FROM casino_chips WHERE user_id = ? FOR UPDATE', [userId]);
            const currentChips = chipRow[0]?.chips || 0;

            if (currentChips < minimum_bet) {
                await connection.rollback();
                return NextResponse.json({ error: 'Insufficient chips to host this table' }, { status: 400 });
            }

            // Deduct bet
            await connection.query('UPDATE casino_chips SET chips = chips - ? WHERE user_id = ?', [minimum_bet, userId]);

            // Create Room
            await connection.query(
                `INSERT INTO casino_rooms (id, game_type, status, state, max_players, minimum_bet, host_id, host_name) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [roomId, game_type, 'WAITING', JSON.stringify(initialState), game_type === 'BLACKJACK' ? 5 : 9, minimum_bet, userId, userName]
            );

            // Add Host to room (Seat 0) — status IDLE so they can place a bet in the WAITING phase
            await connection.query(
                `INSERT INTO casino_players (room_id, user_id, seat_number, bet, state) VALUES (?, ?, ?, ?, ?)`,
                [roomId, userId, 0, 0, JSON.stringify({ cards: [], status: 'IDLE', name: userName })]
            );

            // Add Bot if requested
            if (add_bot) {
                await connection.query(
                    `INSERT INTO casino_players (room_id, user_id, seat_number, bet, state) VALUES (?, ?, ?, ?, ?)`,
                    [roomId, 'BOT_1', 1, minimum_bet, JSON.stringify({ cards: [], status: 'JOINED', isBot: true, name: 'ProBot_AI' })]
                );
            }

            await connection.commit();
            return NextResponse.json({ success: true, roomId });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error('Rooms API POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
