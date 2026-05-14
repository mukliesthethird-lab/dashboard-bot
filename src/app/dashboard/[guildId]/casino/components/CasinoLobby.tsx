"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Coins, Plus, RefreshCw, ChevronRight, Loader2, Spade, Bot, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CreateRoomModal from "./CreateRoomModal";
import BlackjackGame from "./BlackjackGame";

interface Room {
    id: string;
    game_type: string;
    status: string;
    max_players: number;
    minimum_bet: number;
    host_name: string;
    host_avatar?: string;
    current_players: number;
}

interface Props {
    userChips: number;
    onChipsChange: (val: number) => void;
}

export default function CasinoLobby({ userChips, onChipsChange }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    const fetchRooms = useCallback(async () => {
        try {
            const res = await fetch("/api/casino/rooms?game_type=BLACKJACK");
            const data = await res.json();
            if (res.ok && data.success) {
                setRooms(data.rooms);
            }
        } catch (error) {
            console.error("Failed to fetch rooms", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh lobby every 5 seconds while not in a room
    useEffect(() => {
        if (activeRoomId) return;
        setLoading(true);
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, [activeRoomId, fetchRooms]);

    const handleJoin = (roomId: string) => setActiveRoomId(roomId);
    const handleLeave = () => setActiveRoomId(null);

    // If we are in a room, render the Game instead of Lobby
    if (activeRoomId) {
        return (
            <BlackjackGame
                userChips={userChips}
                onChipsChange={onChipsChange}
                roomId={activeRoomId}
                onLeaveTable={handleLeave}
            />
        );
    }

    const statusConfig: Record<string, { label: string; className: string; dotClass: string }> = {
        WAITING: { label: "Betting",  className: "bg-[var(--bg-secondary)]mber-500/15 text-amber-400 border-amber-500/30",  dotClass: "bg-[var(--bg-secondary)]mber-400" },
        PLAYING: { label: "In Game",  className: "bg-[var(--bg-elevated)]merald-500/15 text-emerald-400 border-emerald-500/30", dotClass: "bg-[var(--bg-elevated)]merald-400 animate-pulse" },
        FINISHED:{ label: "Finishing",className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30", dotClass: "bg-indigo-400 animate-pulse" },
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% -20%, #0d1f15 0%, #070710 50%, #050508 100%)" }}>
            
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-[var(--bg-elevated)]merald-900/20 blur-[100px] rounded-full"/>
            </div>

            <div className="relative z-10 flex flex-col h-full p-5 sm:p-8 overflow-y-auto">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-[var(--bg-elevated)]merald-500/10 border border-emerald-500/20">
                                <Spade className="w-5 h-5 text-emerald-400"/>
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Blackjack Tables</h2>
                        </div>
                        <p className="text-[var(--text-tertiary)] text-sm ml-12">Join an active table or host your own game</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchRooms}
                            className="p-3 rounded-xl bg-[var(--bg-hover)] border border-white/8 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
                            title="Refresh rooms"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/>
                        </button>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--bg-elevated)]merald-600 hover:bg-[var(--bg-elevated)]merald-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                        >
                            <Plus className="w-4 h-4"/> Host Table
                        </button>
                    </div>
                </div>

                {/* Auto-refresh indicator */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--bg-elevated)]merald-400 animate-pulse"/>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Auto-refreshing every 5s</span>
                </div>

                {/* Room Grid */}
                {loading && rooms.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin"/>
                            <span className="text-gray-600 text-xs font-black uppercase tracking-widest">Loading Tables...</span>
                        </div>
                    </div>
                ) : rooms.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-20"
                    >
                        <div className="w-20 h-20 rounded-xl bg-white/3 border border-white/8 flex items-center justify-center mb-5">
                            <Spade className="w-10 h-10 text-gray-600"/>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">No Active Tables</h3>
                        <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-xs">Be the first to host a Blackjack table and invite your friends!</p>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-elevated)]merald-600 hover:bg-[var(--bg-elevated)]merald-500 text-white font-black text-xs uppercase tracking-widest transition-all"
                        >
                            <Plus className="w-4 h-4"/> Create First Table
                        </button>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {rooms.map((room, i) => {
                                const st = statusConfig[room.status] || statusConfig['WAITING'];
                                const isFull = room.current_players >= room.max_players;
                                const occupancyPct = room.current_players / room.max_players;

                                return (
                                    <motion.div
                                        key={room.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.04 }}
                                        className={`relative bg-white/3 border rounded-xl p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 group
                                            ${isFull ? 'border-[var(--border)] opacity-60' : 'border-white/8 hover:border-white/15 hover:bg-[var(--bg-hover)]'}`}
                                    >
                                        {/* Card glow on hover */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                            style={{ background: "radial-gradient(ellipse at top left, rgba(16,185,129,0.04) 0%, transparent 60%)" }}
                                        />

                                        {/* Top info */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${st.className}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`}/>
                                                        {st.label}
                                                    </span>
                                                    {room.current_players > 0 && room.current_players < room.max_players && (
                                                        <span className="px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-black uppercase tracking-wider">
                                                            {room.max_players - room.current_players} seat{room.max_players - room.current_players !== 1 ? 's' : ''} open
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-base font-black text-white truncate">
                                                    {room.host_name}'s Table
                                                </h4>
                                                <p className="text-[10px] text-[var(--text-tertiary)] font-medium mt-0.5">Hosted by {room.host_name}</p>
                                            </div>
                                            {/* Min bet */}
                                            <div className="text-right flex-shrink-0 ml-2">
                                                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Min Bet</p>
                                                <div className="flex items-center gap-1 justify-end">
                                                    <Coins className="w-3 h-3 text-amber-400"/>
                                                    <span className="font-black text-white text-sm tabular-nums">{room.minimum_bet.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Occupancy bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                                                    <Users className="w-3 h-3"/>
                                                    <span className="text-[10px] font-bold">{room.current_players} / {room.max_players} players</span>
                                                </div>
                                                {room.minimum_bet > userChips && (
                                                    <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold">
                                                        <Lock className="w-2.5 h-2.5"/>Insufficient chips
                                                    </span>
                                                )}
                                            </div>
                                            <div className="h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${occupancyPct >= 1 ? 'bg-red-500' : occupancyPct >= 0.6 ? 'bg-[var(--bg-secondary)]mber-500' : 'bg-[var(--bg-elevated)]merald-500'}`}
                                                    style={{ width: `${Math.min(100, occupancyPct * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Seat dots */}
                                        <div className="flex gap-1 mb-4">
                                            {Array.from({ length: room.max_players }).map((_, i) => (
                                                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < room.current_players ? 'bg-[var(--bg-elevated)]merald-500' : 'bg-white/8'}`}/>
                                            ))}
                                        </div>

                                        {/* Join button */}
                                        <button
                                            onClick={() => handleJoin(room.id)}
                                            disabled={room.minimum_bet > userChips}
                                            className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                                                ${room.minimum_bet > userChips
                                                    ? 'bg-white/3 border border-[var(--border)] text-gray-600 cursor-not-allowed'
                                                    : isFull
                                                    ? 'bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/8 hover:text-white'
                                                    : 'bg-[var(--bg-elevated)]merald-600/80 hover:bg-[var(--bg-elevated)]merald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                                                }`}
                                        >
                                            {room.minimum_bet > userChips ? (
                                                <><Lock className="w-3.5 h-3.5"/>Need {(room.minimum_bet - userChips).toLocaleString()} more chips</>
                                            ) : isFull ? (
                                                <>Watch Table <ChevronRight className="w-3.5 h-3.5"/></>
                                            ) : (
                                                <>Join Table <ChevronRight className="w-3.5 h-3.5"/></>
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}
            </div>

            <CreateRoomModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                userChips={userChips}
                onRoomCreated={(roomId) => {
                    handleJoin(roomId);
                }}
            />
        </div>
    );
}
