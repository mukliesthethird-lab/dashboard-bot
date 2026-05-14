"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Bot, Coins, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    userChips: number;
    onRoomCreated: (roomId: string) => void;
}

export default function CreateRoomModal({ isOpen, onClose, userChips, onRoomCreated }: Props) {
    const [minBet, setMinBet] = useState<number>(100);
    const [addBot, setAddBot] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (minBet < 10) {
            setError("Minimum bet must be at least 10 Chips.");
            return;
        }
        if (minBet > userChips) {
            setError("You don't have enough chips to host with this minimum bet.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/casino/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_type: "BLACKJACK", minimum_bet: minBet, add_bot: addBot }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onRoomCreated(data.roomId);
                onClose();
            } else {
                setError(data.error || "Failed to create room.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-[#0A0A0F] border border-[var(--border)] rounded-xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Glow Effects */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[var(--bg-elevated)]merald-500/20 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-400" />
                                HOST A TABLE
                            </h2>
                            <button onClick={onClose} className="p-2 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] rounded-full text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Minimum Bet Input */}
                        <div className="mb-6">
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Coins className="w-4 h-4 text-emerald-400" />
                                Minimum Bet (Chips)
                            </label>
                            <input
                                type="number"
                                value={minBet}
                                onChange={(e) => setMinBet(Number(e.target.value))}
                                min={10}
                                max={userChips}
                                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-2 font-medium">To host, you will immediately bet this minimum amount upon creation.</p>
                        </div>

                        {/* AI Bot Toggle */}
                        <div className="mb-6 bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => setAddBot(!addBot)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${addBot ? 'bg-[var(--bg-elevated)]merald-500/20 text-emerald-400' : 'bg-gray-800 text-[var(--text-tertiary)]'}`}>
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Add Pro AI Bot</p>
                                    <p className="text-[10px] text-[var(--text-tertiary)]">Bot will join to fill empty seats</p>
                                </div>
                            </div>
                            {/* Simple Toggle Switch */}
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${addBot ? 'bg-[var(--bg-elevated)]merald-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${addBot ? 'left-5' : 'left-0.5'}`} />
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm font-bold">
                                <ShieldAlert className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleCreate}
                            disabled={loading || minBet < 10 || minBet > userChips}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-white/10 disabled:to-white/10 disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Room"}
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
