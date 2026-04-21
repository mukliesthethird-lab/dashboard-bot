import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeGame, performHit, performStand, performDouble, performSurrender, executeBotTurn, performDealerStep, BlackjackState, PlayerState, calculateHandValue, moveToNextActivePlayer } from '@/lib/blackjackEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    let connection;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id;
        const userName = session.user?.name || 'Player';
        const userAvatar = session.user?.image || undefined;

        const { roomId, action, seatNumber, betAmount } = await req.json();

        if (!roomId || !action) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Lock room row for transaction safety
            const [rooms]: any = await connection.query('SELECT * FROM casino_rooms WHERE id = ? FOR UPDATE', [roomId]);
            if (rooms.length === 0) throw new Error("Room not found");
            const room = rooms[0];

            if (action === 'DELETE_ROOM') {
                if (room.host_id !== userId) throw new Error("Only host can close table");
                await connection.query('DELETE FROM casino_rooms WHERE id = ?', [roomId]);
                await connection.commit();
                return NextResponse.json({ success: true, message: 'Table Closed' });
            }

            const [players]: any = await connection.query('SELECT * FROM casino_players WHERE room_id = ? ORDER BY seat_number ASC FOR UPDATE', [roomId]);

            let gameState: BlackjackState = typeof room.state === 'string' ? JSON.parse(room.state) : room.state;
            
            // ─── Build a SPARSE seat-indexed players array (same structure as client) ───
            // This ensures turn_index (seat number) matches what the client computes as myPlayerIndex.
            // Null slots represent empty seats.
            const sparsePlayers: (PlayerState | null)[] = Array(room.max_players).fill(null);
            for (const p of players) {
                const pState = typeof p.state === 'string' ? JSON.parse(p.state) : p.state;
                sparsePlayers[p.seat_number] = {
                    id: p.user_id,
                    name: pState.name || 'Unknown',
                    avatar: pState.avatar,
                    seat_number: p.seat_number,
                    chips_staked: p.bet,
                    cards: pState.cards || [],
                    status: pState.status,
                    isBot: pState.isBot || false,
                };
            }
            gameState.players = sparsePlayers as PlayerState[];

            // Ensure timer is valid (failsafe — should be set at room creation now)
            if (!gameState.turn_started_at) {
                gameState.turn_started_at = Date.now();
            }

            let stateChangedByAction = true; // Flag to save
            const now = Date.now();

            if (action === 'JOIN') {
                if (typeof seatNumber !== 'number' || seatNumber < 0 || seatNumber >= room.max_players) throw new Error("Invalid seat");
                if (players.find((p:any) => p.seat_number === seatNumber)) throw new Error("Seat occupied");
                if (players.find((p:any) => p.user_id === userId)) throw new Error("You are already at the table");
                
                await connection.query(
                    `INSERT INTO casino_players (room_id, user_id, seat_number, bet, state) VALUES (?, ?, ?, ?, ?)`,
                    [roomId, userId, seatNumber, 0, JSON.stringify({ cards: [], status: 'IDLE', name: userName, avatar: userAvatar })]
                );
            } 
            else if (action === 'PLACE_BET') {
                if (room.status === 'PLAYING') throw new Error("Game is currently in progress");
                const myPlayer = sparsePlayers.find(p => p && p.id === userId);
                if (!myPlayer) throw new Error("Not at this table");
                if (myPlayer.status === 'BET_PLACED') throw new Error("Bet already placed");
                if (!betAmount || betAmount < room.minimum_bet) throw new Error(`Minimum bet is ${room.minimum_bet}`);

                const [chipRow]: any = await connection.query('SELECT chips FROM casino_chips WHERE user_id = ? FOR UPDATE', [userId]);
                const currentChips = chipRow[0]?.chips || 0;
                if (currentChips < betAmount) throw new Error("Insufficient chips to place this bet");
                await connection.query('UPDATE casino_chips SET chips = chips - ? WHERE user_id = ?', [betAmount, userId]);
                
                await connection.query('UPDATE casino_players SET bet = ? WHERE room_id = ? AND user_id = ?', [betAmount, roomId, userId]);
                myPlayer.chips_staked = betAmount;
                myPlayer.status = 'BET_PLACED';
            }
            else if (action === 'CLOSE_TABLE') {
                if (room.host_id !== userId) throw new Error("Only host can flag close");
                gameState.is_closing = true;
            }
            else if (action === 'TICK') {
                stateChangedByAction = false;

                if (room.status === 'WAITING') {
                    if (now - (gameState.turn_started_at || 0) > 15000) {
                        // 15 seconds passed — Auto Start!
                        for (const p of sparsePlayers) {
                            if (!p) continue; // Skip empty seats
                            if (p.isBot) {
                                p.chips_staked = room.minimum_bet || 50;
                                p.status = 'JOINED';
                                await connection.query('UPDATE casino_players SET bet = ? WHERE room_id = ? AND user_id = ?', [p.chips_staked, roomId, p.id]);
                            } else if (p.status === 'BET_PLACED') {
                                p.status = 'JOINED';
                            } else {
                                // Player didn't bet — set to IDLE (spectator this round)
                                p.status = 'IDLE';
                            }
                        }

                        const activePlayers = sparsePlayers.filter(p => p && p.status === 'JOINED');
                        if (activePlayers.length > 0) {
                            initializeGame(gameState);
                            gameState.turn_started_at = Date.now();
                            gameState.results = [];
                            room.status = 'PLAYING';
                        } else {
                            // Nobody placed a bet — reset timer and wait again
                            gameState.turn_started_at = Date.now();
                        }
                        stateChangedByAction = true;
                    }
                }

                if (room.status === 'PLAYING') {
                    if (gameState.phase === 'PLAYER_TURN' && gameState.turn_index < gameState.players.length) {
                        const p = gameState.players[gameState.turn_index];
                        
                        // Skip null (empty seat) or any non-JOINED player
                        if (!p || p.status !== 'JOINED') {
                            moveToNextActivePlayer(gameState);
                            gameState.turn_started_at = Date.now();
                            stateChangedByAction = true;
                        } else if (p.isBot) {
                            if (now - (gameState.turn_started_at || 0) > 2500) {
                                executeBotTurn(gameState);
                                gameState.turn_started_at = Date.now();
                                stateChangedByAction = true;
                            }
                        } else {
                            // Human timeout (20 seconds of inactivity)
                            if (now - (gameState.turn_started_at || 0) > 20000) {
                                performStand(gameState, gameState.turn_index);
                                gameState.turn_started_at = Date.now();
                                stateChangedByAction = true;
                            }
                        }
                    } else if (gameState.phase === 'DEALER_TURN') {
                        if (now - (gameState.turn_started_at || 0) > 1500) {
                            performDealerStep(gameState);
                            gameState.turn_started_at = Date.now();
                            stateChangedByAction = true;
                        }
                    } else if (gameState.phase === 'PAYOUT') {
                        // Resolve payouts
                        const dealerTotal = calculateHandValue(gameState.dealer_cards, true).total;
                        const dealerBusted = dealerTotal > 21;
                        gameState.results = [];

                        for (const p of sparsePlayers) {
                            if (!p || p.status === 'IDLE' || p.status === 'WAITING_TURN') continue;
                            const val = calculateHandValue(p.cards, true).total;
                            let chipsWon = 0;
                            let resType: 'WIN' | 'LOSE' | 'BUSTED' | 'PUSH' | 'BLACKJACK' | 'SURRENDER' = 'LOSE';

                            if (p.status === 'SURRENDER') {
                                chipsWon = Math.floor(p.chips_staked * 0.5);
                                resType = 'SURRENDER';
                            }
                            else if (p.status === 'BUSTED') {
                                chipsWon = 0;
                                resType = 'BUSTED';
                            }
                            else if (p.status === 'BLACKJACK') {
                                if (dealerTotal === 21 && gameState.dealer_cards.length === 2) {
                                    chipsWon = p.chips_staked;
                                    resType = 'PUSH';
                                } else {
                                    chipsWon = Math.floor(p.chips_staked * 2.5);
                                    resType = 'BLACKJACK';
                                }
                            }
                            else {
                                // STAND/non-busted players
                                if (dealerBusted) {
                                    chipsWon = p.chips_staked * 2;
                                    resType = 'WIN';
                                } else if (val > dealerTotal) {
                                    chipsWon = p.chips_staked * 2;
                                    resType = 'WIN';
                                } else if (val === dealerTotal) {
                                    chipsWon = p.chips_staked;
                                    resType = 'PUSH';
                                } else {
                                    resType = 'LOSE';
                                }
                            }

                            if (chipsWon > 0 && !p.isBot) {
                                await connection.query('UPDATE casino_chips SET chips = chips + ? WHERE user_id = ?', [chipsWon, p.id]);
                            }

                            gameState.results!.push({
                                id: p.id,
                                name: p.name,
                                type: resType,
                                amount_staked: p.chips_staked,
                                amount_won: chipsWon
                            });
                        }
                        
                        room.status = 'FINISHED';
                        gameState.turn_started_at = Date.now();
                        stateChangedByAction = true;
                    }
                }

                // Auto Next Round after 5 seconds (if table not closing)
                if (room.status === 'FINISHED' && !gameState.is_closing) {
                    if (now - (gameState.turn_started_at || 0) > 5000) {
                        room.status = 'WAITING';
                        gameState.dealer_cards = [];
                        gameState.deck = [];
                        gameState.phase = 'WAITING';
                        gameState.turn_index = 0;
                        gameState.results = [];
                        gameState.turn_started_at = Date.now(); // fresh 15s betting window
                        
                        for (const p of sparsePlayers) {
                            if (!p) continue; // Skip empty seats
                            p.status = 'IDLE'; // Reset ALL players to IDLE — must re-bet each round
                            p.cards = [];
                            p.chips_staked = 0;
                            await connection.query('UPDATE casino_players SET bet = 0 WHERE room_id = ? AND user_id = ?', [roomId, p.id]);
                        }
                        
                        stateChangedByAction = true;
                    }
                }
            }
            else {
                // ─── Gameplay Actions (HIT, STAND, DOUBLE, SURRENDER) ───
                if (room.status !== 'PLAYING') throw new Error("Game is not active");
                
                // Find player by their seat_number position in the sparse array
                // This ensures myPlayerIndex (seat) matches gameState.turn_index (also seat-based)
                const myPlayerIndex = sparsePlayers.findIndex(p => p && p.id === userId);
                if (myPlayerIndex === -1) throw new Error("Not at this table");
                if (gameState.turn_index !== myPlayerIndex) throw new Error("Not your turn");

                if (action === 'HIT') {
                    const success = performHit(gameState, myPlayerIndex);
                    if (!success) throw new Error("Cannot hit right now");
                } else if (action === 'STAND') {
                    const success = performStand(gameState, myPlayerIndex);
                    if (!success) throw new Error("Cannot stand right now");
                } else if (action === 'DOUBLE') {
                    const myPlayer = sparsePlayers[myPlayerIndex]!;
                    const cost = myPlayer.chips_staked; 
                    const [chipRow]: any = await connection.query('SELECT chips FROM casino_chips WHERE user_id = ? FOR UPDATE', [userId]);
                    const currentChips = chipRow[0]?.chips || 0;
                    if (currentChips < cost) throw new Error("Insufficient chips to double");
                    
                    await connection.query('UPDATE casino_chips SET chips = chips - ? WHERE user_id = ?', [cost, userId]);
                    await connection.query('UPDATE casino_players SET bet = bet + ? WHERE room_id = ? AND user_id = ?', [cost, roomId, userId]);
                    
                    const success = performDouble(gameState, myPlayerIndex);
                    if (!success) throw new Error("Cannot double right now");
                } else if (action === 'SURRENDER') {
                    const success = performSurrender(gameState, myPlayerIndex);
                    if (!success) throw new Error("Cannot surrender right now");
                } else {
                    throw new Error("Unknown action");
                }

                // Reset per-turn timer
                gameState.turn_started_at = Date.now();
            }

            // ─── Persist changes to DB ───
            if (stateChangedByAction) {
                const dbState = {
                    deck: gameState.deck,
                    dealer_cards: gameState.dealer_cards,
                    turn_index: gameState.turn_index,
                    phase: gameState.phase,
                    is_closing: gameState.is_closing || false,
                    turn_started_at: gameState.turn_started_at,
                    results: gameState.results || []
                };

                await connection.query('UPDATE casino_rooms SET status = ?, state = ? WHERE id = ?', [room.status, JSON.stringify(dbState), roomId]);
                
                // Update each player's state (only non-null seats)
                for (const p of sparsePlayers) {
                    if (!p) continue;
                    const pState = {
                        cards: p.cards,
                        status: p.status,
                        isBot: p.isBot,
                        name: p.name,
                        avatar: p.avatar
                    };
                    await connection.query('UPDATE casino_players SET state = ? WHERE room_id = ? AND user_id = ?', [JSON.stringify(pState), roomId, p.id]);
                }
            }

            await connection.commit();
            return NextResponse.json({ success: true, message: `Action ${action} OK`, tickExecuted: stateChangedByAction });

        } catch (err: any) {
            await connection.rollback();
            require('fs').writeFileSync('BJ_ERROR.txt', err.stack || err.message);
            return NextResponse.json({ error: err.message }, { status: 400 });
        } finally {
            if (connection) connection.release();
        }

    } catch (error: any) {
        console.error('Blackjack Action URL POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
