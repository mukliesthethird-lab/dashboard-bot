"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Trophy, Coins, Sparkles, ChevronRight, LayoutDashboard, Database, Spade } from "lucide-react";
import SlotGame from "./components/SlotGame";
import RouletteGame from "./components/RouletteGame";
import CrashGame from "./components/CrashGame";
import ChipExchangeModal from "./components/ChipExchangeModal";
import CasinoLobby from "./components/CasinoLobby";
import Loading from "@/components/Loading";

export default function InteractiveCasinoPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<"CRASH" | "ROULETTE" | "SLOTS" | "BLACKJACK">("CRASH");
    const [balance, setBalance] = useState<number>(0);
    const [chips, setChips] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isExchangeOpen, setIsExchangeOpen] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await fetch("/api/user/balance");
                if (res.ok) {
                    const data = await res.json();
                    setBalance(data.balance);
                    setChips(data.chips || 0);
                }
            } catch (err) { console.error("Failed to fetch balance", err); }
            finally { setLoading(false); }
        };
        fetchBalance();
    }, []);

    const tabs = [
        { id: "CRASH", name: "SpaceX Crash", icon: <Rocket className="w-3.5 h-3.5" /> },
        { id: "ROULETTE", name: "Roulette", icon: <Trophy className="w-3.5 h-3.5" /> },
        { id: "SLOTS", name: "Slots", icon: <Sparkles className="w-3.5 h-3.5" /> },
        { id: "BLACKJACK", name: "Blackjack", icon: <Spade className="w-3.5 h-3.5" /> },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loading message="Loading Casino" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-[var(--bg-primary)] text-white font-sans overflow-hidden flex flex-col">
            <main className="relative z-10 w-full max-w-[1700px] mx-auto pt-20 pb-3 px-4 md:px-6 flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-center mb-4 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        Gaming <span className="gradient-text">Excellence.</span>
                    </h1>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex gap-2">
                            {/* Coins */}
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-2 px-3 flex items-center gap-2">
                                <Coins className="w-3.5 h-3.5 text-emerald-400" />
                                <div>
                                    <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider leading-none">Coins</p>
                                    <div className="text-sm font-bold text-white tabular-nums leading-none mt-0.5">{balance.toLocaleString()}</div>
                                </div>
                            </div>
                            {/* Chips */}
                            <button onClick={() => setIsExchangeOpen(true)} className="bg-[var(--accent-muted)] border border-[var(--border-accent)] rounded-lg py-2 px-3 flex items-center gap-2 hover:brightness-110 transition group">
                                <Database className="w-3.5 h-3.5 text-[var(--accent)]" />
                                <div className="text-left">
                                    <p className="text-[9px] font-semibold text-[var(--accent)] uppercase tracking-wider leading-none opacity-70">Chips</p>
                                    <div className="text-sm font-bold text-white tabular-nums leading-none mt-0.5">{chips.toLocaleString()}</div>
                                </div>
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-1 rounded-lg flex gap-1 overflow-x-auto max-w-full no-scrollbar">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`whitespace-nowrap px-3.5 py-2 rounded-md font-semibold text-xs transition-all flex items-center gap-1.5
                                        ${activeTab === tab.id ? 'bg-white text-black' : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)]'}
                                    `}
                                >
                                    {tab.icon}
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Game Stage */}
                <div className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl relative overflow-hidden min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 h-full w-full"
                        >
                            {activeTab === 'CRASH' && <CrashGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'ROULETTE' && <RouletteGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'SLOTS' && <SlotGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'BLACKJACK' && <CasinoLobby userChips={chips} onChipsChange={setChips} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="mt-2 flex justify-between items-center text-[8px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                    <div>© 2026 DON POLLO ENTERPRISE</div>
                </div>
            </main>

            <ChipExchangeModal
                isOpen={isExchangeOpen}
                onClose={() => setIsExchangeOpen(false)}
                coinsBalance={balance}
                chipsBalance={chips}
                onSuccess={(newCoins, newChips) => { setBalance(newCoins); setChips(newChips); }}
            />
        </div>
    );
}
