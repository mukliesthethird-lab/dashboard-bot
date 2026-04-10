"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Trophy, Coins, Sparkles, ChevronRight, LayoutDashboard } from "lucide-react";
import SlotGame from "./components/SlotGame";
import RouletteGame from "./components/RouletteGame";
import CrashGame from "./components/CrashGame";

export default function InteractiveCasinoPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<"CRASH" | "ROULETTE" | "SLOTS">("CRASH");
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const res = await fetch("/api/user/balance"); // I'll need to ensure this endpoint exists or create a simple one
                if (res.ok) {
                    const data = await res.json();
                    setBalance(data.balance);
                }
            } catch (err) {
                console.error("Failed to fetch balance", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBalance();
    }, []);

    const tabs = [
        { id: "CRASH", name: "SpaceX Crash", icon: <Rocket className="w-4 h-4" /> },
        { id: "ROULETTE", name: "Premium Roulette", icon: <Trophy className="w-4 h-4" /> },
        { id: "SLOTS", name: "Golden Slots", icon: <Sparkles className="w-4 h-4" /> },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020205] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-black animate-pulse uppercase tracking-[0.3em]">Loading Casino</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#020205] text-white selection:bg-indigo-500/30 font-sans overflow-hidden flex flex-col">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full" />
            </div>

            <main className="relative z-10 w-full max-w-[1700px] mx-auto pt-24 pb-4 px-4 md:px-8 flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Header Section - Compact */}
                <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                            Gaming <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent italic">Excellence.</span>
                        </h1>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        {/* Balance Card - Compact */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl py-2 px-6 flex items-center gap-4 transition-all hover:bg-white/[0.08]">
                            <Coins className="w-5 h-5 text-indigo-400" />
                            <div>
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Balance</p>
                                <div className="text-lg font-black text-white tabular-nums">
                                    {balance.toLocaleString()} <span className="text-[10px] text-gray-500 uppercase">Coins</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs - Slim */}
                        <div className="bg-white/5 border border-white/10 p-1 rounded-[1.8rem] flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-5 py-2.5 rounded-[1.4rem] font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2
                                        ${activeTab === tab.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    {tab.icon}
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Game Stage - Viewport Filled */}
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 h-full w-full"
                        >
                            {activeTab === 'CRASH' && <CrashGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'ROULETTE' && <RouletteGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'SLOTS' && <SlotGame userBalance={balance} onBalanceChange={setBalance} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Meta - Small & Integrated */}
                <div className="mt-3 flex justify-between items-center text-[8px] font-black text-white/10 uppercase tracking-[0.4em]">
                    <div>© 2026 DON POLLO ENTERPRISE</div>
                    <div className="flex gap-4">
                    </div>
                </div>
            </main>
        </div>
    );
}
