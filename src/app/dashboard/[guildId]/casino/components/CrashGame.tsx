"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Rocket, Play, Bomb, ShieldCheck, Zap, Coins,
    Activity, Gauge, Navigation, AlertTriangle,
    ChevronRight, Cpu, WifiOff
} from "lucide-react";

interface CrashGameProps {
    userBalance: number;
    onBalanceChange: (newBalance: number) => void;
}

export default function CrashGame({ userBalance, onBalanceChange }: CrashGameProps) {
    const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "CASHED_OUT" | "CRASHED">("IDLE");
    const [bet, setBet] = useState(100);
    const [targetMultiplier, setTargetMultiplier] = useState(2.0);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
    const [error, setError] = useState<string | null>(null);
    const [isAutoExit, setIsAutoExit] = useState(true);
    const [currentPayout, setCurrentPayout] = useState(0);

    const animationRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const crashPointRef = useRef<number>(0);

    // Telemetry Derived Values
    const velocity = useMemo(() => (currentMultiplier * 1.5).toFixed(2), [currentMultiplier]);
    const gForce = useMemo(() => (1 + (currentMultiplier > 1 ? (currentMultiplier - 1) * 2 : 0)).toFixed(1), [currentMultiplier]);
    const altitude = useMemo(() => Math.floor(Math.pow(currentMultiplier, 3) * 100), [currentMultiplier]);

    const startPlay = async () => {
        if (userBalance < bet) {
            setError("Insufficient Capital");
            return;
        }
        setError(null);
        setGameState("PLAYING");
        setCurrentMultiplier(1.00);

        try {
            const response = await fetch("/api/casino", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    game: "crash",
                    bet,
                    target: isAutoExit ? targetMultiplier : 0,
                    action: isAutoExit ? 'auto' : 'start'
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            crashPointRef.current = data.crashPoint;
            startTimeRef.current = performance.now();

            const animate = (time: number) => {
                const elapsed = (time - startTimeRef.current) / 1000;
                const mult = 1.00 + Math.pow(elapsed * 0.8, 2);

                if (mult >= crashPointRef.current) {
                    setCurrentMultiplier(crashPointRef.current);
                    setGameState("CRASHED");
                    onBalanceChange(data.newBalance);
                    setTimeout(() => setGameState("IDLE"), 3000);
                    return;
                }

                if (isAutoExit && mult >= targetMultiplier && data.won) {
                    setCurrentMultiplier(targetMultiplier);
                    setGameState("CASHED_OUT");
                    onBalanceChange(data.newBalance);
                    setTimeout(() => setGameState("IDLE"), 3000);
                    return;
                }

                setCurrentMultiplier(mult);
                animationRef.current = requestAnimationFrame(animate);
            };
            animationRef.current = requestAnimationFrame(animate);

        } catch (err: any) {
            setError(err.message);
            setGameState("IDLE");
        }
    };

    const handleManualCashOut = async () => {
        if (gameState !== 'PLAYING') return;

        const finalMult = currentMultiplier;
        cancelAnimationFrame(animationRef.current);
        setGameState("CASHED_OUT");

        try {
            const response = await fetch("/api/casino", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    game: "crash",
                    action: "claim",
                    bet,
                    multiplier: finalMult
                }),
            });

            const data = await response.json();
            if (response.ok) {
                onBalanceChange(data.newBalance);
                setCurrentPayout(data.winnings);
            }
        } catch (err) {
            console.error("Cashout failed", err);
        }

        setTimeout(() => setGameState("IDLE"), 3000);
    };

    useEffect(() => () => cancelAnimationFrame(animationRef.current), []);

    // Get color based on altitude/multiplier
    const getThemeColor = () => {
        if (currentMultiplier < 2) return "rgba(59, 130, 246, 1)"; // Blue
        if (currentMultiplier < 5) return "rgba(168, 85, 247, 1)"; // Purple
        if (currentMultiplier < 10) return "rgba(236, 72, 153, 1)"; // Pink
        return "rgba(245, 158, 11, 1)"; // Gold
    };

    return (
        <div className="w-full h-full flex flex-col lg:flex-row bg-[#020308] overflow-hidden selection:bg-blue-500/30">
            {/* Cinematic Mission Control Area */}
            <div className="flex-1 relative flex flex-col overflow-hidden border-r border-white/5 min-h-0">

                {/* Parallax Starfield */}
                <div className="absolute inset-0 z-0 bg-[#020308]">
                    <motion.div
                        animate={{
                            y: gameState === 'PLAYING' ? [-1000, 0] : 0,
                        }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"
                    />
                </div>

                {/* HUD Header - Compact */}
                <div className="relative z-20 p-4 lg:p-6 flex justify-between items-start pointer-events-none shrink-0">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-xl">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Status</span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${gameState === 'PLAYING' ? 'text-white animate-pulse' : 'text-gray-500'}`}>
                            {gameState === 'IDLE' ? 'Ready' : gameState === 'PLAYING' ? 'Ascent' : gameState === 'CRASHED' ? 'FAILURE' : 'SECURED'}
                        </span>
                    </div>

                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-xl text-right">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">ALTITUDE</span>
                        <span className="text-base font-black text-white tabular-nums">{altitude.toLocaleString()} <span className="text-[10px] text-blue-400">KM</span></span>
                    </div>
                </div>

                {/* Multiplier Stage - Centered & Filling Space */}
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center min-h-0">
                    <motion.div
                        animate={gameState === 'PLAYING' ? {
                            scale: [1, 1.01, 1],
                            rotate: [0, (Math.random() - 0.5) * 0.4, 0]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="relative"
                    >
                        <div
                            className="text-[10rem] lg:text-[14rem] font-black tracking-tighter leading-none tabular-nums transition-colors duration-500"
                            style={{
                                color: gameState === 'CRASHED' ? '#ef4444' : gameState === 'CASHED_OUT' ? '#10b981' : 'white',
                                textShadow: `0 0 100px ${getThemeColor().replace('1)', '0.3)')}`
                            }}
                        >
                            {currentMultiplier.toFixed(2)}<span className="text-3xl lg:text-4xl opacity-20 ml-2">x</span>
                        </div>
                    </motion.div>
                </div>

                {/* Telemetry Footer - Compact Layout */}
                <div className="relative z-20 p-4 lg:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gradient-to-t from-black/80 to-transparent shrink-0">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-3 rounded-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 text-blue-400">
                            <Activity className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Velocity</span>
                        </div>
                        <div className="text-lg font-black text-white tabular-nums tracking-tighter">{velocity} <span className="text-[10px] opacity-40">km/s</span></div>
                        <motion.div animate={{ height: gameState === 'PLAYING' ? "40%" : "0%" }} className="absolute left-0 bottom-0 w-0.5 bg-blue-500" />
                    </div>

                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-3 rounded-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 text-purple-400">
                            <Gauge className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">G-Force</span>
                        </div>
                        <div className="text-lg font-black text-white tabular-nums tracking-tighter">{gForce} <span className="text-[10px] opacity-40">G</span></div>
                        <motion.div animate={{ height: gameState === 'PLAYING' ? "60%" : "0%" }} className="absolute left-0 bottom-0 w-0.5 bg-purple-500" />
                    </div>

                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-3 rounded-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 text-emerald-400">
                            <Navigation className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Target</span>
                        </div>
                        <div className="text-lg font-black text-white tabular-nums tracking-tighter">{targetMultiplier.toFixed(2)}x</div>
                        <motion.div animate={{ height: (currentMultiplier / targetMultiplier) * 100 + "%" }} className="absolute left-0 bottom-0 w-0.5 bg-emerald-500" />
                    </div>

                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-3 rounded-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 text-amber-500">
                            <Cpu className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Phase</span>
                        </div>
                        <div className="text-lg font-black text-white uppercase tracking-tighter">
                            {currentMultiplier < 2 ? 'LIFT' : currentMultiplier < 5 ? 'ORB' : 'DEEP'}
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {gameState === 'CRASHED' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                            <h2 className="text-5xl font-black text-red-500 uppercase italic tracking-tighter mb-2">Signal Lost</h2>
                            <div className="px-6 py-2 bg-red-600 text-black font-black uppercase text-xs tracking-widest rotate-2">Terminated</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sidebar Controls - Viewport Constrained */}
            <div className="w-full lg:w-[380px] bg-[#05060b] border-l border-white/5 p-6 lg:p-8 flex flex-col relative z-20 overflow-y-auto no-scrollbar shrink-0">
                <div className="mb-8 border-b border-white/5 pb-6">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        STARSHIP OPS
                    </h2>
                </div>

                <div className="space-y-8 flex-1">
                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Wager Capital</label>
                        <div className="relative bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 focus-within:border-blue-500/50 transition-all">
                            <Coins className="w-5 h-5 text-blue-400" />
                            <input
                                type="number"
                                value={bet}
                                onChange={(e) => setBet(parseInt(e.target.value) || 0)}
                                disabled={gameState === 'PLAYING'}
                                className="bg-transparent text-3xl font-black text-white w-full outline-none p-0"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/[0.03] border border-white/5 p-3 rounded-xl">
                            <div className="flex flex-col">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Auto-Exit System</label>
                                <span className="text-[8px] font-medium text-zinc-600 uppercase">Automatic landing protocol</span>
                            </div>
                            <button 
                                onClick={() => setIsAutoExit(!isAutoExit)} 
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 p-1 flex items-center ${isAutoExit ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-zinc-800 border border-white/10'}`}
                            >
                                <motion.div 
                                    animate={{ x: isAutoExit ? 24 : 0 }}
                                    className={`w-4 h-4 rounded-full shadow-lg ${isAutoExit ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                                />
                            </button>
                        </div>
                        <div className="relative bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 focus-within:border-emerald-500/50 transition-all">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <input
                                type="number"
                                step="0.1"
                                value={targetMultiplier}
                                onChange={(e) => setTargetMultiplier(parseFloat(e.target.value) || 0)}
                                disabled={gameState === 'PLAYING' || !isAutoExit}
                                className="bg-transparent text-3xl font-black text-white w-full outline-none p-0"
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-xl border bg-white/[0.02] border-white/5">
                        <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-3">Projected ROI</div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-black text-white">
                                {isAutoExit ? (bet * targetMultiplier).toLocaleString() : (bet * currentMultiplier).toFixed(0)}
                                <span className="text-[10px] text-zinc-500 ml-1">Coins</span>
                            </span>
                            <span className="text-lg font-black text-emerald-500">
                                +{isAutoExit ? ((targetMultiplier - 1) * 100).toFixed(0) : ((currentMultiplier - 1) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    {error && <div className="text-red-500 text-[9px] font-black uppercase mb-4 py-2 border-y border-red-500/20">{error}</div>}

                    {gameState === 'PLAYING' ? (
                        <button
                            onClick={handleManualCashOut}
                            className={`w-full py-6 rounded-[1.8rem] font-black text-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden
                                ${isAutoExit ? 'bg-zinc-800 text-zinc-600' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-xl shadow-emerald-500/10'}
                            `}
                        >
                            <Zap className="w-5 h-5" />
                            {isAutoExit ? 'AUTO-PILOT' : 'ABORT & CLAIM'}
                        </button>
                    ) : (
                        <button
                            onClick={startPlay}
                            className="w-full py-6 rounded-[1.8rem] bg-white text-black font-black text-xl flex items-center justify-center gap-3 hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            IGNITION
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
