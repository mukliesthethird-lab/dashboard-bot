  "use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayingCard, { CardData } from "./PlayingCard";
import { Users, Plus, Loader2, AlertTriangle, ChevronLeft, Clock, Trophy, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { calculateHandValue } from "@/lib/blackjackEngine";

interface Props {
    userChips: number;
    roomId?: string;
    onChipsChange?: (newChips: number) => void;
    onLeaveTable?: () => void;
}

// Result type badge color/label map
const RESULT_CONFIG: Record<string, { label: string; color: string; glow: string; bg: string }> = {
    WIN:       { label: "WIN",       color: "text-emerald-400", glow: "shadow-[0_0_40px_rgba(16,185,129,0.6)]",  bg: "bg-emerald-500/20 border-emerald-500/50"  },
    BLACKJACK: { label: "BLACKJACK", color: "text-yellow-300",  glow: "shadow-[0_0_60px_rgba(253,224,71,0.7)]",  bg: "bg-yellow-500/20 border-yellow-500/60"    },
    PUSH:      { label: "PUSH",      color: "text-sky-400",     glow: "",                                         bg: "bg-sky-500/10 border-sky-500/30"          },
    LOSE:      { label: "LOSE",      color: "text-red-400",     glow: "",                                         bg: "bg-red-500/10 border-red-500/30"          },
    BUSTED:    { label: "BUST!",     color: "text-red-500",     glow: "",                                         bg: "bg-red-500/10 border-red-500/30"          },
    SURRENDER: { label: "SURRENDER", color: "text-orange-400",  glow: "",                                         bg: "bg-orange-500/10 border-orange-500/30"    },
};

// Timer ring component
function TimerRing({ seconds, max, color }: { seconds: number; max: number; color: string }) {
    const pct = seconds / max;
    const r = 18;
    const circ = 2 * Math.PI * r;
    const dash = circ * pct;
    const isUrgent = seconds <= 5;
    return (
        <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"/>
                <circle
                    cx="22" cy="22" r={r} fill="none"
                    stroke={isUrgent ? "#EF4444" : color}
                    strokeWidth="3.5"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }}
                />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white/70'}`}>
                {seconds}
            </span>
        </div>
    );
}

// Chip token visual
function ChipToken({ amount, size = "md" }: { amount: number; size?: "sm" | "md" | "lg" }) {
    const sizes = { sm: "w-8 h-8 text-[9px]", md: "w-11 h-11 text-[10px]", lg: "w-14 h-14 text-xs" };
    const sizeClass = sizes[size];
    
    // Color by value
    const chipColor = amount >= 1000 ? "from-purple-500 to-purple-700 border-purple-300/30" :
                      amount >= 500  ? "from-yellow-500 to-yellow-700 border-yellow-300/30" :
                      amount >= 100  ? "from-blue-500 to-blue-700 border-blue-300/30" :
                      "from-red-500 to-red-700 border-red-300/30";

    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-b ${chipColor} border-2 border-dashed shadow-lg flex items-center justify-center font-black text-white relative`}
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" }}
        >
            <div className="absolute inset-[3px] rounded-full border border-white/10"/>
            <span className="relative">{amount >= 1000 ? `${(amount/1000).toFixed(1)}k` : amount}</span>
        </div>
    );
}

// Player status badge
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        IDLE:          { label: "Spectating", className: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
        BET_PLACED:    { label: "✓ Bet In",   className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        JOINED:        { label: "Playing",    className: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
        WAITING_TURN:  { label: "Waiting",    className: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
        STAND:         { label: "Stand",      className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
        BUSTED:        { label: "BUST",       className: "text-red-500 bg-red-500/10 border-red-500/20" },
        BLACKJACK:     { label: "♠ 21!",      className: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
        SURRENDER:     { label: "Fold",       className: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    };
    const c = config[status] || { label: status, className: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
    return (
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.className}`}>
            {c.label}
        </span>
    );
}

export default function BlackjackGame({ userChips, roomId, onChipsChange, onLeaveTable }: Props) {
    const { data: session } = useSession();
    const userId = (session?.user as any)?.id;

    const [gameState, setGameState] = useState<any>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [betInput, setBetInput] = useState<number>(0);
    const [showResultPopup, setShowResultPopup] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [lastStatus, setLastStatus] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

    const isHostRef = useRef(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Derived state (needs gameState)
    const status = gameState?.status;
    const currentLiveState = gameState?.state;
    const minimum_bet = gameState?.minimum_bet;
    
    const myPlayerIndex = currentLiveState?.players
        ? currentLiveState.players.findIndex((p: any) => p && p.id === userId)
        : -1;

    const myPlayer = myPlayerIndex !== -1 ? currentLiveState?.players[myPlayerIndex] : null;

    // isMyTurn: only when PLAYING, in PLAYER_TURN phase, it's my seat's turn, AND my status is still JOINED
    const isMyTurn = status === 'PLAYING' 
        && currentLiveState?.phase === 'PLAYER_TURN' 
        && currentLiveState?.turn_index === myPlayerIndex
        && myPlayerIndex !== -1
        && myPlayer?.status === 'JOINED'; // Explicit JOINED check — prevents ghost turn after bust

    const myResult = currentLiveState?.results?.find((r: any) => r.id === userId);

    // Update isHost ref whenever gameState changes (avoids polling restart)
    useEffect(() => {
        if (gameState) {
            isHostRef.current = userId === gameState.host_id;
        }
    }, [gameState, userId]);

    // Timer countdown — purely client-side tick
    useEffect(() => {
        if (!currentLiveState?.turn_started_at) return;
        const max = status === 'WAITING' ? 15 : 20;
        const compute = () => {
            const passed = Math.floor((Date.now() - currentLiveState.turn_started_at) / 1000);
            setTimeRemaining(Math.max(0, max - passed));
        };
        compute();
        const t = setInterval(compute, 500);
        return () => clearInterval(t);
    }, [currentLiveState?.turn_started_at, status]);

    // Win/Lose popup trigger
    useEffect(() => {
        if (status === 'FINISHED' && lastStatus !== 'FINISHED') {
            setShowResultPopup(true);
            // Also refresh chips balance after payout
            if (onChipsChange) {
                fetch('/api/user/balance').then(r => r.json()).then(d => {
                    if (d.chips !== undefined) onChipsChange(d.chips);
                }).catch(() => {});
            }
            const t = setTimeout(() => setShowResultPopup(false), 5000);
            return () => clearTimeout(t);
        }
        // Reset bet input when a new WAITING round begins
        if (status === 'WAITING' && lastStatus === 'FINISHED' && minimum_bet) {
            setBetInput(minimum_bet);
        }
        setLastStatus(status);
    }, [status]);

    // Show notification helper
    const showNotif = useCallback((text: string, type: "info" | "error" | "success" = "info") => {
        setNotification({ text, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Stable polling loop — deps do NOT include gameState to avoid restart on every fetch
    const fetchState = useCallback(async () => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/casino/blackjack/state?roomId=${roomId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setGameState((prev: any) => {
                        // Set initial bet on first load
                        if (!prev && data.minimum_bet) {
                            setBetInput(data.minimum_bet);
                        }
                        return data;
                    });
                }
            } else if (res.status === 404) {
                // Room deleted — go back to lobby instead of hard reload
                onLeaveTable?.();
                return;
            }
        } catch (err) {
            console.error("State fetch error:", err);
        }
    }, [roomId, onLeaveTable]);

    const sendTick = useCallback(async () => {
        if (!roomId || !isHostRef.current) return;
        try {
            await fetch("/api/casino/blackjack/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, action: 'TICK' }),
            });
        } catch {}
    }, [roomId]);

    // Main polling interval — set up once and never restart
    useEffect(() => {
        if (!roomId) return;
        fetchState(); // Initial fetch

        const loop = async () => {
            await sendTick();
            await fetchState();
        };

        pollingRef.current = setInterval(loop, 1500);
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [roomId, fetchState, sendTick]);

    if (!gameState || !currentLiveState) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#070710]">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-5" />
                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-xs">Loading Table...</p>
            </div>
        );
    }

    const handleAction = async (action: string, seatNumber?: number) => {
        setLoadingAction(true);
        try {
            const res = await fetch("/api/casino/blackjack/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, action, seatNumber, betAmount: betInput }),
            });
            const data = await res.json();
            if (res.ok) {
                // Optimistic chips update ONLY after confirmed server success
                if (action === 'PLACE_BET' && onChipsChange) {
                    onChipsChange(userChips - betInput);
                } else if (action === 'DOUBLE' && onChipsChange && myPlayer) {
                    onChipsChange(userChips - myPlayer.chips_staked);
                }
                await fetchState();
            } else {
                showNotif(data.error || "Action failed", "error");
            }
        } catch (err) {
            showNotif("Connection error", "error");
        } finally {
            setLoadingAction(false);
        }
    };

    const currentTurnPlayer = status === 'PLAYING' && currentLiveState.phase === 'PLAYER_TURN'
        ? currentLiveState.players[currentLiveState.turn_index]
        : null;

    const dealerHandVal = calculateHandValue(currentLiveState.dealer_cards || [], false); // false = respect hidden

    return (
        <div className="w-full h-full flex flex-col overflow-hidden relative" style={{ background: "radial-gradient(ellipse at 50% 0%, #0d1f15 0%, #070710 50%, #050508 100%)" }}>
            
            {/* ── Background atmosphere ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-900/25 blur-[120px] rounded-full"/>
                <div className="absolute bottom-0 left-1/4 w-[300px] h-[200px] bg-indigo-900/15 blur-[100px] rounded-full"/>
                <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-indigo-900/15 blur-[100px] rounded-full"/>
            </div>

            {/* ── Top bar ── */}
            <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-black/20 backdrop-blur-md flex-shrink-0">
                <button
                    onClick={onLeaveTable}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Leave Table
                </button>

                {/* Phase / Status indicator */}
                <div className="flex items-center gap-2">
                    {status === 'WAITING' && (
                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Betting Phase</span>
                            <span className="text-[10px] text-amber-400/60 font-bold">{timeRemaining}s</span>
                        </div>
                    )}
                    {status === 'PLAYING' && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                {currentLiveState.phase === 'DEALER_TURN' ? 'Dealer Turn' : 
                                 currentLiveState.phase === 'PAYOUT' ? 'Resolving...' : 'In Play'}
                            </span>
                        </div>
                    )}
                    {status === 'FINISHED' && (
                        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Round Over · Restarting</span>
                        </div>
                    )}
                </div>

                {/* My chips */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                    <ChipToken amount={userChips} size="sm"/>
                    <span className="text-xs font-black text-white tabular-nums">{userChips.toLocaleString()}</span>
                </div>
            </div>

            {/* ── Closing alert ── */}
            <AnimatePresence>
                {currentLiveState.is_closing && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-red-600 border border-red-400/50 text-white font-black text-[10px] px-8 py-2.5 rounded-full shadow-[0_0_40px_rgba(220,38,38,0.5)] uppercase tracking-widest flex items-center gap-2"
                    >
                        <AlertTriangle className="w-3.5 h-3.5"/>
                        Table closing after this round
                        <AlertTriangle className="w-3.5 h-3.5"/>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toast notification ── */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute bottom-32 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border backdrop-blur-md ${
                            notification.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                            notification.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                            'bg-white/10 border-white/20 text-white'
                        }`}
                    >
                        {notification.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Result popup ── */}
            <AnimatePresence>
                {showResultPopup && status === 'FINISHED' && myResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.7, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                        className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className={`relative border rounded-3xl p-10 flex flex-col items-center backdrop-blur-xl shadow-2xl pointer-events-auto ${RESULT_CONFIG[myResult.type]?.bg || 'bg-white/10 border-white/20'} ${RESULT_CONFIG[myResult.type]?.glow || ''}`}>
                            {/* Stars for blackjack */}
                            {myResult.type === 'BLACKJACK' && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1">
                                    {['★','★','★'].map((s, i) => (
                                        <motion.span key={i} animate={{ y: [0, -8, 0], rotate: [0, 15, -15, 0] }} transition={{ delay: i * 0.15, repeat: Infinity, duration: 1.5 }}
                                            className="text-yellow-400 text-xl">
                                            {s}
                                        </motion.span>
                                    ))}
                                </div>
                            )}
                            <span className={`text-5xl font-black uppercase tracking-widest mb-3 ${RESULT_CONFIG[myResult.type]?.color || 'text-white'}`}>
                                {RESULT_CONFIG[myResult.type]?.label || myResult.type}
                            </span>
                            {myResult.amount_won > 0 ? (
                                <span className="text-white text-2xl font-black flex items-center gap-2">
                                    <span className="text-emerald-400">+</span>{myResult.amount_won.toLocaleString()} <span className="text-gray-400 text-sm">chips</span>
                                </span>
                            ) : myResult.type === 'PUSH' ? (
                                <span className="text-sky-400 text-lg font-bold">Chips Returned</span>
                            ) : (
                                <span className="text-red-400/70 text-xl font-black">−{myResult.amount_staked.toLocaleString()} chips</span>
                            )}
                            <button onClick={() => setShowResultPopup(false)} className="mt-6 text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
                                Dismiss
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Main content area — dealer + players — scrollable if content overflow ── */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-around px-4 py-2 relative z-10 overflow-hidden">

                {/* ═══ DEALER ZONE ═══ */}
                <div className="flex flex-col items-center w-full max-w-4xl">
                    {/* Dealer label */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/10"/>
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                            <div className="w-6 h-6 rounded-full bg-emerald-800/50 border border-emerald-500/30 flex items-center justify-center text-sm">🕴️</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">The Dealer</span>
                            {/* Show dealer total (only visible cards) */}
                            {currentLiveState.dealer_cards?.length > 0 && status !== 'WAITING' && (
                                <span className="bg-white/10 border border-white/10 text-white px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums">
                                    {dealerHandVal.total > 0 ? dealerHandVal.total : '?'}
                                    {dealerHandVal.isSoft && dealerHandVal.total < 21 ? ' soft' : ''}
                                </span>
                            )}
                        </div>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/10"/>
                    </div>

                    {/* Dealer cards */}
                    <div className="flex gap-1.5 sm:gap-2 justify-center items-end" style={{ minHeight: '5.5rem' }}>
                        {status === 'WAITING' ? (
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 mt-8">Awaiting Bets</div>
                        ) : (
                            <AnimatePresence>
                                {currentLiveState.dealer_cards?.map((card: any, idx: number) => (
                                    <PlayingCard key={idx} card={card} index={idx} />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* ═══ TABLE FELT ═══ (decorative divider) */}
                <div className="w-full max-w-4xl flex items-center gap-4 my-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"/>
                    <div className="text-[9px] font-black text-white/8 uppercase tracking-[0.4em]">
                        {status === 'PLAYING' && currentLiveState.phase === 'PLAYER_TURN' && currentTurnPlayer
                            ? `${currentTurnPlayer.name}'s Turn`
                            : status === 'PLAYING' && currentLiveState.phase === 'DEALER_TURN'
                            ? "Dealer's Turn"
                            : 'Blackjack · Min ' + minimum_bet}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"/>
                </div>

                {/* ═══ PLAYER SEATS ═══ */}
                <div className="w-full max-w-5xl">
                    <div className="flex justify-center gap-3 sm:gap-4 lg:gap-6 flex-wrap">
                        {currentLiveState.players.map((player: any, idx: number) => {
                            const isActive = status === 'PLAYING' && currentLiveState.turn_index === idx;
                            const isMe = player?.id === userId;
                            const handVal = player?.cards?.length > 0 ? calculateHandValue(player.cards, false).total : null;
                            const isBusted = player?.status === 'BUSTED';
                            const isBlackjack = player?.status === 'BLACKJACK';
                            const playerResult = currentLiveState.results?.find((r: any) => r.id === player?.id);

                            return (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    {/* ── Player cards ── */}
                                    {player ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            {/* Cards row */}
                                            <div className={`flex gap-1 justify-center items-end relative ${isBusted ? 'opacity-50' : ''}`} style={{ minHeight: '5.5rem' }}>
                                                <AnimatePresence>
                                                    {player.cards?.length > 0 ? player.cards.map((card: any, cIdx: number) => (
                                                        <PlayingCard key={cIdx} card={card} index={cIdx} />
                                                    )) : (
                                                        // Empty card placeholder (waiting for game to start)
                                                        status === 'WAITING' ? (
                                                            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/5 opacity-20" />
                                                        ) : null
                                                    )}
                                                </AnimatePresence>
                                                
                                                {/* Result overlay on card */}
                                                {playerResult && status === 'FINISHED' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className={`absolute -top-2 -right-2 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${RESULT_CONFIG[playerResult.type]?.bg || 'bg-white/10 border-white/20'} ${RESULT_CONFIG[playerResult.type]?.color || 'text-white'}`}
                                                    >
                                                        {RESULT_CONFIG[playerResult.type]?.label || playerResult.type}
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Bet stacked chips */}
                                            {player.chips_staked > 0 && (
                                                <div className="relative flex justify-center">
                                                    <ChipToken amount={player.chips_staked} size="sm"/>
                                                </div>
                                            )}

                                            {/* Player info card */}
                                            <div className={`
                                                relative px-2.5 py-1.5 rounded-2xl border transition-all duration-300 min-w-[90px] sm:min-w-[110px] text-center
                                                ${isActive 
                                                    ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.3)]' 
                                                    : isMe 
                                                    ? 'border-indigo-500/40 bg-indigo-500/8 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                                    : 'border-white/8 bg-white/3'
                                                }
                                            `}>
                                                {/* Active player pulse ring */}
                                                {isActive && (
                                                    <div className="absolute -inset-1 rounded-2xl border border-emerald-400/20 animate-ping"/>
                                                )}

                                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                                    {player.avatar ? (
                                                        <img src={player.avatar} alt="" className="w-4 h-4 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"/>
                                                    ) : player.isBot ? (
                                                        <span className="text-sm">🤖</span>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full bg-indigo-500/50 flex-shrink-0"/>
                                                    )}
                                                    <span className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[80px]">
                                                        {player.name}
                                                        {isMe && <span className="text-indigo-400 ml-1">(you)</span>}
                                                    </span>
                                                    {handVal !== null && (
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                                            isBusted ? 'bg-red-500/20 text-red-400' :
                                                            isBlackjack ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-white/10 text-white/70'
                                                        }`}>
                                                            {handVal}
                                                        </span>
                                                    )}
                                                </div>
                                                <StatusBadge status={player.status} />

                                                {/* Bot thinking indicator */}
                                                {isActive && player.isBot && (
                                                    <div className="flex items-center justify-center gap-0.5 mt-1">
                                                        {[0,1,2].map(i => (
                                                            <motion.div key={i} animate={{ y: [0, -3, 0] }} transition={{ delay: i * 0.12, repeat: Infinity, duration: 0.6 }}
                                                                className="w-1 h-1 rounded-full bg-emerald-400"/>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        /* Empty seat */
                                        <div className="flex flex-col items-center gap-2 mt-8 opacity-50 hover:opacity-90 transition-opacity">
                                            <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/10 bg-white/2"/>
                                            <button
                                                onClick={() => handleAction('JOIN', idx)}
                                                disabled={loadingAction || myPlayerIndex !== -1 || status !== 'WAITING'}
                                                className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl border border-dashed border-white/20 bg-white/3 hover:bg-white/8 hover:border-white/40 transition-all disabled:pointer-events-none min-w-[100px] sm:min-w-[120px]"
                                            >
                                                <Plus className="w-4 h-4 text-white/40"/>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Sit Down</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>{/* end game content */}

            {/* ═══ CONTROL BAR — always pinned at bottom, never clipped ═══ */}
            <div className="relative z-20 flex-shrink-0 w-full px-3 sm:px-5 pb-3 pt-1.5">
                    <AnimatePresence mode="wait">
                        {/* WAITING — bet controls */}
                        {status === 'WAITING' && (
                            <motion.div key="waiting-controls"
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 border border-white/8 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md"
                            >
                                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                    <TimerRing seconds={timeRemaining} max={15} color="#F59E0B"/>
                                    {myPlayerIndex !== -1 && myPlayer?.status === 'IDLE' ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            {/* Bet presets */}
                                            <div className="flex gap-1">
                                                {[minimum_bet, minimum_bet * 2, minimum_bet * 5].filter(v => v <= userChips).map(v => (
                                                    <button key={v} onClick={() => setBetInput(v)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black border transition-all ${betInput === v ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                                        {v}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="number"
                                                value={betInput}
                                                onChange={e => setBetInput(Math.max(minimum_bet, Math.min(userChips, Number(e.target.value))))}
                                                className="w-24 bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none transition-colors tabular-nums"
                                                min={minimum_bet}
                                                max={userChips}
                                            />
                                            <button
                                                onClick={() => handleAction('PLACE_BET')}
                                                disabled={loadingAction || betInput < minimum_bet || betInput > userChips}
                                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-gray-500 rounded-xl text-black font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:shadow-none"
                                            >
                                                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Place Bet'}
                                            </button>
                                        </div>
                                    ) : myPlayer?.status === 'BET_PLACED' ? (
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <span className="text-xs font-black uppercase tracking-widest">Bet of {myPlayer.chips_staked.toLocaleString()} placed ✓</span>
                                            <span className="text-xs text-gray-500">Waiting for round to start...</span>
                                        </div>
                                    ) : myPlayerIndex === -1 ? (
                                        <span className="text-gray-500 text-xs font-bold">Sit at a seat above to join the next round</span>
                                    ) : (
                                        <span className="text-gray-500 text-xs font-bold">Spectating this round...</span>
                                    )}
                                </div>

                                {/* Host controls */}
                                {isHostRef.current && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        {currentLiveState.is_closing ? (
                                            <button onClick={() => handleAction('DELETE_ROOM')} disabled={loadingAction}
                                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                                                Terminate Table
                                            </button>
                                        ) : (
                                            <button onClick={() => handleAction('CLOSE_TABLE')} disabled={loadingAction}
                                                className="px-5 py-2.5 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-500 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                                                Flag Close
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PLAYING — game actions (only when it's your turn) */}
                        {status === 'PLAYING' && (
                            <motion.div key="playing-controls"
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="bg-black/40 border border-white/8 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md"
                            >
                                {isMyTurn ? (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <TimerRing seconds={timeRemaining} max={20} color="#10B981"/>
                                            <div>
                                                <p className="text-emerald-400 font-black text-sm uppercase tracking-widest">Your Turn</p>
                                                <p className="text-gray-500 text-[10px]">Hand: <span className="text-white font-bold">{myPlayer?.cards ? calculateHandValue(myPlayer.cards, false).total : 0}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap justify-center">
                                            <button onClick={() => handleAction('SURRENDER')} disabled={loadingAction}
                                                className="px-4 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-1.5">
                                                <Minus className="w-3.5 h-3.5"/>Surrender
                                            </button>
                                            <button onClick={() => handleAction('STAND')} disabled={loadingAction}
                                                className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40">
                                                Stand
                                            </button>
                                            <button onClick={() => handleAction('DOUBLE')} disabled={loadingAction || userChips < (myPlayer?.chips_staked || 0)}
                                                title={userChips < (myPlayer?.chips_staked || 0) ? "Not enough chips" : "Double your bet and draw 1 card"}
                                                className="px-4 py-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40">
                                                Double ×2
                                            </button>
                                            <button onClick={() => handleAction('HIT')} disabled={loadingAction}
                                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-40 disabled:shadow-none flex items-center gap-1.5">
                                                Hit <ArrowRight className="w-3.5 h-3.5"/>
                                            </button>
                                        </div>
                                    </div>
                                ) : currentLiveState.phase === 'DEALER_TURN' ? (
                                    <div className="flex items-center gap-3 justify-center">
                                        <div className="flex items-center gap-1">
                                            {[0,1,2].map(i => (
                                                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ delay: i*0.2, repeat: Infinity, duration: 0.8 }}
                                                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                                            ))}
                                        </div>
                                        <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">Dealer is playing their hand...</span>
                                    </div>
                                ) : currentTurnPlayer && !isMyTurn ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <TimerRing seconds={timeRemaining} max={20} color="#6366F1"/>
                                            <div>
                                                <p className="text-gray-400 text-xs font-bold">Waiting for</p>
                                                <p className="text-white font-black text-sm">{currentTurnPlayer.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                            {currentLiveState.phase === 'PAYOUT' ? 'Resolving payouts...' : 'Waiting...'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                                        {currentLiveState.phase === 'PAYOUT' ? 'Calculating payouts...' : 'Waiting...'}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* FINISHED — round summary */}
                        {status === 'FINISHED' && (
                            <motion.div key="finished-controls"
                                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                className="bg-black/40 border border-white/8 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md"
                            >
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <p className="text-indigo-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                            <Trophy className="w-4 h-4"/>Round Results
                                        </p>
                                        {/* All player results inline */}
                                        {currentLiveState.results?.map((r: any) => (
                                            <div key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black ${RESULT_CONFIG[r.type]?.bg || 'bg-white/10 border-white/10'} ${RESULT_CONFIG[r.type]?.color || 'text-white'}`}>
                                                <span className="text-white/60 font-medium">{r.name}:</span>
                                                <span>{RESULT_CONFIG[r.type]?.label || r.type}</span>
                                                {r.amount_won > 0 ? (
                                                    <span className="text-emerald-400 font-bold ml-1">+{r.amount_won.toLocaleString()}</span>
                                                ) : r.type !== 'PUSH' && (
                                                    <span className="text-red-400/60 font-bold ml-1">-{r.amount_staked.toLocaleString()}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isHostRef.current && currentLiveState.is_closing ? (
                                            <button onClick={() => handleAction('DELETE_ROOM')} disabled={loadingAction}
                                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                                                Terminate
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-cyan-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Next round starting...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
            </div>{/* end control bar */}
        </div>
    );
}
