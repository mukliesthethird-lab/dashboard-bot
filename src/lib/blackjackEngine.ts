export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface PlayingCard {
    suit: CardSuit;
    value: CardValue;
    isHidden?: boolean;
}

export interface PlayerState {
    id: string; // "BOT_1", or discord user_id
    name: string;
    avatar?: string;
    seat_number: number;
    chips_staked: number;
    cards: PlayingCard[];
    status: "IDLE" | "BET_PLACED" | "JOINED" | "WAITING_TURN" | "STAND" | "BUSTED" | "BLACKJACK" | "FINISHED" | "SURRENDER";
    isBot?: boolean;
    db_id?: number | string;
}

export interface PayoutResult {
    id: string;
    name: string;
    // NOTE: 'BUSTED' maps to a lost hand — client can check this for display
    type: 'WIN' | 'LOSE' | 'BUSTED' | 'PUSH' | 'BLACKJACK' | 'SURRENDER';
    amount_won: number;
    amount_staked: number;
}

export interface BlackjackState {
    deck: PlayingCard[];
    dealer_cards: PlayingCard[];
    turn_index: number;
    phase: "WAITING" | "DEALING" | "PLAYER_TURN" | "DEALER_TURN" | "PAYOUT";
    players: PlayerState[]; // Array of size up to 5
    is_closing?: boolean;
    turn_started_at?: number;
    results?: PayoutResult[];
}

// === TERMINAL STATUSES: Player is done and turn should be skipped ===
const TERMINAL_STATUSES = new Set<PlayerState["status"]>([
    "IDLE", "FINISHED", "SURRENDER", "BUSTED", "BLACKJACK", "STAND", "WAITING_TURN"
]);
// NOTE: "WAITING_TURN" is a pre-game status — engine treats it as not yet active
// Only "JOINED" means the player is currently in-play and needs their turn.

// 1. Deck Generation
export function generateDeck(): PlayingCard[] {
    const suits: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
    const values: CardValue[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    let deck: PlayingCard[] = [];
    // 6-deck shoe for proper casino blackjack
    for(let d = 0; d < 6; d++) {
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
    }
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 2. Hand Value Calculation
export function calculateHandValue(cards: PlayingCard[], includeHidden = false): { total: number, isSoft: boolean } {
    let total = 0;
    let aces = 0;
    
    for (const card of cards) {
        if (!card || !card.value) continue;
        if (!includeHidden && card.isHidden) continue;
        // Skip masked/hidden cards sent to client (value = "?")
        if ((card.value as string) === '?') continue;
        
        if (["J", "Q", "K"].includes(card.value)) {
            total += 10;
        } else if (card.value === "A") {
            aces += 1;
            total += 11;
        } else {
            const parsed = parseInt(card.value as any);
            total += isNaN(parsed) ? 0 : parsed;
        }
    }

    // Adjust for Aces if busted
    while (total > 21 && aces > 0) {
        total -= 10;
        aces -= 1;
    }
    
    const isSoft = aces > 0 && total <= 21;

    return { total, isSoft };
}

// 3. Game Cycle Initializer
export function initializeGame(state: BlackjackState) {
    state.deck = generateDeck();
    state.phase = "DEALING";
    state.turn_index = 0;

    // Deal 2 cards to active (JOINED) players only
    // state.players is a sparse seat-indexed array — null slots are empty seats
    for (const player of state.players) {
        if (!player || player.status !== 'JOINED') {
            if (player) player.cards = [];
            continue;
        }
        player.cards = [state.deck.pop()!, state.deck.pop()!];
        
        const val = calculateHandValue(player.cards, true).total;
        if (val === 21) {
            player.status = "BLACKJACK";
        } else {
            player.status = "JOINED";
        }
    }

    // Deal 2 cards to dealer (second card face-down)
    state.dealer_cards = [
        state.deck.pop()!, 
        { ...state.deck.pop()!, isHidden: true }
    ];

    // If dealer has blackjack, go straight to reveal
    if (calculateHandValue(state.dealer_cards, true).total === 21) {
        state.phase = "DEALER_TURN";
    } else {
        state.phase = "PLAYER_TURN";
        state.turn_index = 0;
        moveToNextActivePlayer(state);
    }
    return state;
}

// Helper: advance turn to the next player who is still JOINED (active, unmoved)
export function moveToNextActivePlayer(state: BlackjackState) {
    // Scan forward from current turn_index
    while (state.turn_index < state.players.length) {
        const p = state.players[state.turn_index];
        // A valid active player is one with status === "JOINED"
        if (p && p.status === "JOINED") {
            return; // This player needs to act
        }
        state.turn_index++;
    }
    // All players have acted — dealer's turn
    state.phase = "DEALER_TURN";
}

// 4. Action: Hit
export function performHit(state: BlackjackState, playerIndex: number) {
    if (state.phase !== "PLAYER_TURN" || state.turn_index !== playerIndex) return false;
    
    const player = state.players[playerIndex];
    if (player.status !== "JOINED") return false;

    player.cards.push(state.deck.pop()!);
    
    const val = calculateHandValue(player.cards, true).total;
    if (val > 21) {
        player.status = "BUSTED";
        moveToNextActivePlayer(state);
    } else if (val === 21) {
        // Automatic stand on 21
        player.status = "STAND";
        moveToNextActivePlayer(state);
    }
    return true;
}

// 5. Action: Stand
export function performStand(state: BlackjackState, playerIndex: number) {
    if (state.phase !== "PLAYER_TURN" || state.turn_index !== playerIndex) return false;
    
    const player = state.players[playerIndex];
    player.status = "STAND";
    moveToNextActivePlayer(state);
    return true;
}

// 5b. Action: Double Down
export function performDouble(state: BlackjackState, playerIndex: number) {
    if (state.phase !== "PLAYER_TURN" || state.turn_index !== playerIndex) return false;
    
    const player = state.players[playerIndex];
    if (player.status !== "JOINED") return false;

    // Draw exactly ONE card
    player.cards.push(state.deck.pop()!);
    // Bet doubling in state (actual DB deduction handled in API route)
    player.chips_staked *= 2; 

    const val = calculateHandValue(player.cards, true).total;
    if (val > 21) {
        player.status = "BUSTED";
    } else {
        player.status = "STAND"; // Forced stand after double
    }
    
    moveToNextActivePlayer(state);
    return true;
}

// 5c. Action: Surrender (Fold for half bet back)
export function performSurrender(state: BlackjackState, playerIndex: number) {
    if (state.phase !== "PLAYER_TURN" || state.turn_index !== playerIndex) return false;
    
    const player = state.players[playerIndex];
    if (player.status !== "JOINED") return false;

    player.status = "SURRENDER";
    moveToNextActivePlayer(state);
    return true;
}

// 6. Bot Logic — Standard Basic Strategy
export function executeBotTurn(state: BlackjackState) {
    const p = state.players[state.turn_index];
    if (!p || !p.isBot || p.status !== "JOINED") return false;

    const handVal = calculateHandValue(p.cards, true);
    const dealerVisibleCard = calculateHandValue([state.dealer_cards[0]]).total;

    // Soft 17 special rule: always hit on soft 17
    if (handVal.isSoft && handVal.total === 17) {
        performHit(state, state.turn_index);
        return true;
    }

    // Basic Strategy:
    if (handVal.total <= 11) {
        // Always hit — can't bust
        performHit(state, state.turn_index);
    } else if (handVal.total >= 17) {
        // Stand on hard 17+
        performStand(state, state.turn_index);
    } else {
        // 12–16: depends on dealer upcard
        if (dealerVisibleCard >= 7) {
            // Dealer is strong — push our luck
            performHit(state, state.turn_index);
        } else {
            // Dealer weak — stand and let them bust
            performStand(state, state.turn_index);
        }
    }

    return true;
}

// 7. Dealer Turn Step (called once per tick)
export function performDealerStep(state: BlackjackState): boolean {
    // First: reveal the hidden card
    if (state.dealer_cards.length > 0 && state.dealer_cards[1]?.isHidden) {
        state.dealer_cards[1].isHidden = false;
        return true; 
    }

    const val = calculateHandValue(state.dealer_cards, true).total;
    if (val < 17) {
        // Dealer hits on 16 or less
        state.dealer_cards.push(state.deck.pop()!);
        return true;
    } else {
        // Dealer stands on 17+
        state.phase = "PAYOUT";
        return false;
    }
}
