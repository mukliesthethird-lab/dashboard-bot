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
        <div className="min-h-screen bg-[#020205] text-white selection:bg-indigo-500/30 font-sans">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-[1600px] mx-auto pt-32 pb-16 px-4 md:px-8 min-h-screen flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                            Excellence in <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Gaming.</span>
                        </h1>
                    </div>

                    <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-4">
                        {/* Balance Card */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 pr-12 relative overflow-hidden flex items-center gap-4 group hover:border-indigo-500/30 transition-all">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:scale-110 transition-transform">
                                <Coins className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Balance</p>
                                <div className="text-2xl font-black text-white">
                                    {balance.toLocaleString()} <span className="text-xs text-gray-500 uppercase">Coins</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="bg-white/5 border border-white/10 p-1.5 rounded-[2rem] flex gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2
                                        ${activeTab === tab.id ? 'bg-white text-black shadow-xl shadow-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                    `}
                                >
                                    {tab.icon}
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Game Stage */}
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 h-full w-full"
                        >
                            {activeTab === 'CRASH' && <CrashGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'ROULETTE' && <RouletteGame userBalance={balance} onBalanceChange={setBalance} />}
                            {activeTab === 'SLOTS' && <SlotGame userBalance={balance} onBalanceChange={setBalance} />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Meta */}
                <div className="mt-8 flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <div>
                        © 2026 Don Pollo Enterprise
                    </div>
                </div>
            </main>
        </div>
    );
}
