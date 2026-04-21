import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        
        if (!roomId) {
            return NextResponse.json({ error: 'roomId required' }, { status: 400 });
        }

        // Fetch room
        const [rooms]: any = await pool.query('SELECT * FROM casino_rooms WHERE id = ?', [roomId]);
        if (!rooms || rooms.length === 0) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const room = rooms[0];
        
        // Fetch players
        const [players]: any = await pool.query('SELECT * FROM casino_players WHERE room_id = ? ORDER BY seat_number ASC', [roomId]);

        // Merge state
        let gameState = typeof room.state === 'string' ? JSON.parse(room.state) : room.state;
        
        let clientPlayers = [];
        for (let i = 0; i < room.max_players; i++) {
            const p = players.find((pl: any) => pl.seat_number === i);
            if (p) {
                const pState = typeof p.state === 'string' ? JSON.parse(p.state) : p.state;
                clientPlayers.push({
                    id: p.user_id,
                    name: pState.name || 'Unknown',
                    avatar: pState.avatar,
                    seat_number: p.seat_number,
                    chips_staked: p.bet,
                    cards: pState.cards || [],
                    status: pState.status,
                    isBot: pState.isBot || false
                });
            } else {
                clientPlayers.push(null);
            }
        }

        // Mask the Dealer's Hidden Card so clients can't cheat
        if (gameState.dealer_cards && gameState.dealer_cards.length > 1) {
            if (gameState.phase !== "DEALER_TURN" && gameState.phase !== "PAYOUT") {
                gameState.dealer_cards = gameState.dealer_cards.map((card: any) => {
                    if (card.isHidden) {
                        return { suit: "hidden", value: "?", isHidden: true };
                    }
                    return card;
                });
            }
        }

        gameState.players = clientPlayers;

        return NextResponse.json({ 
            success: true, 
            status: room.status, 
            minimum_bet: room.minimum_bet,
            host_id: room.host_id,
            state: gameState 
        });

    } catch (error: any) {
        console.error('Blackjack state GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
