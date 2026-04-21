"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ArrowRightLeft, X, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    coinsBalance: number;
    chipsBalance: number;
    onSuccess: (newCoins: number, newChips: number) => void;
}

export default function ChipExchangeModal({ isOpen, onClose, coinsBalance, chipsBalance, onSuccess }: Props) {
    const RATE = 100; // 100 Coins = 1 Chip
    const [action, setAction] = useState<"buy_chips" | "cashout">("buy_chips");
    const [amount, setAmount] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExchange = async () => {
        if (!amount || amount <= 0) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/casino/exchange", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, amount: Number(amount) }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                onSuccess(data.newCoins, data.newChips);
                setAmount("");
                onClose();
            } else {
                setError(data.error || "Exchange failed.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const maxAmount = action === "buy_chips" ? Math.floor(coinsBalance / RATE) : chipsBalance;

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
                        className="relative w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                    >
                        {/* Glow Effects */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                                CASINO HUB
                            </h2>
                            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Action Toggle */}
                        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                            <button
                                onClick={() => setAction("buy_chips")}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${action === "buy_chips" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "text-gray-400 hover:text-white"}`}
                            >
                                Buy Chips
                            </button>
                            <button
                                onClick={() => setAction("cashout")}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${action === "cashout" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "text-gray-400 hover:text-white"}`}
                            >
                                Cashout
                            </button>
                        </div>

                        {/* Current Balances */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Coins</p>
                                <p className="text-lg font-black text-white">{coinsBalance.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
                                <p className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Chips</p>
                                <p className="text-lg font-black text-white">{chipsBalance.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="mb-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                                Amount ({action === "buy_chips" ? "Chips to Buy" : "Chips to Cashout"})
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                    min="1"
                                    max={maxAmount}
                                />
                                <button
                                    onClick={() => setAmount(maxAmount)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded"
                                >
                                    MAX
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs font-medium px-1">
                                <span className="text-gray-500 bg-white/5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">1 Chip = {RATE} Coins</span>
                                {amount && typeof amount === 'number' && (
                                    <span className="text-emerald-400 font-bold">
                                        {action === "buy_chips" ? `Cost: ${(amount * RATE).toLocaleString()} Coins` : `Get: ${(amount * RATE).toLocaleString()} Coins`}
                                    </span>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm font-bold">
                                <ShieldAlert className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleExchange}
                            disabled={loading || !amount || amount <= 0 || amount > maxAmount}
                            className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:from-white/10 disabled:to-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Exchange"}
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
