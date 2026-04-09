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
            <div className="flex-1 relative flex flex-col overflow-hidden border-r border-white/5">
                
                {/* Parallax Starfield */}
                <div className="absolute inset-0 z-0 bg-[#020308]">
                    <motion.div 
                        animate={{ 
                            y: gameState === 'PLAYING' ? [-1000, 0] : 0,
                        }}
                        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"
                    />
                </div>

                {/* Atmospheric Glow */}
                <div 
                    className="absolute inset-0 transition-colors duration-1000 pointer-events-none z-[1]"
                    style={{ 
                        background: `radial-gradient(circle at center, ${getThemeColor().replace('1)', '0.15)')} 0%, transparent 70%)` 
                    }}
                />

                {/* HUD Header */}
                <div className="relative z-20 p-8 flex justify-between items-start pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Mission Status</span>
                        <span className={`text-sm font-bold uppercase tracking-widest ${gameState === 'PLAYING' ? 'text-white animate-pulse' : 'text-gray-500'}`}>
                            {gameState === 'IDLE' ? 'Ready for Ignition' : gameState === 'PLAYING' ? 'Orbital Ascent' : gameState === 'CRASHED' ? 'CRITICAL FAILURE' : 'SYSTEMS SECURED'}
                        </span>
                    </div>

                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-right">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Current Altitude</span>
                        <span className="text-xl font-black text-white tabular-nums">{altitude.toLocaleString()} <span className="text-xs text-blue-400">KM</span></span>
                    </div>
                </div>

                {/* Multiplier Stage */}
                <div className="flex-1 relative z-10 flex flex-col items-center justify-center -mt-20">
                    {/* Multiplier Content */}
                    <motion.div 
                        animate={gameState === 'PLAYING' ? { 
                            scale: [1, 1.01, 1],
                            rotate: [0, (Math.random() - 0.5) * 0.5, 0]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="relative"
                    >
                        <div 
                            className="text-[12rem] lg:text-[18rem] font-black tracking-tighter leading-none tabular-nums transition-colors duration-500"
                            style={{ 
                                color: gameState === 'CRASHED' ? '#ef4444' : gameState === 'CASHED_OUT' ? '#10b981' : 'white',
                                textShadow: `0 0 100px ${getThemeColor().replace('1)', '0.3)')}`
                            }}
                        >
                            {currentMultiplier.toFixed(2)}<span className="text-4xl lg:text-5xl opacity-20 ml-2">x</span>
                        </div>
                    </motion.div>
                </div>

                {/* Full-Screen Glitch Overlay (Moved to Root of Cinematic Area) */}
                <AnimatePresence>
                    {gameState === 'CRASHED' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-black backdrop-blur-[12px] flex flex-col items-center justify-center overflow-hidden"
                        >
                            {/* Static/Noise layer */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.2),rgba(0,255,0,0.1),rgba(0,0,255,0.2))] z-10 bg-[length:100%_4px,6px_100%] opacity-80" />
                            
                            <motion.div 
                                animate={{ 
                                    x: [-10, 10, -5, 5, 0],
                                    skewX: [0, 10, -10, 0],
                                    filter: ["hue-rotate(0deg)", "hue-rotate(360deg)", "hue-rotate(0deg)"]
                                }} 
                                transition={{ repeat: Infinity, duration: 0.1 }}
                                className="flex flex-col items-center relative z-20"
                            >
                                <div className="text-[10px] font-black text-red-600 tracking-[1em] uppercase mb-8 opacity-50 animate-pulse">Critical System Failure - E0x432</div>
                                <h2 className="text-6xl md:text-8xl font-black text-red-500 tracking-[-0.05em] uppercase mb-2 drop-shadow-[0_0_50px_rgba(239,68,68,1)] italic">
                                    SIGNAL LOST
                                </h2>
                                <div className="h-px w-64 bg-red-600/50 mb-6" />
                                <div className="px-8 py-3 bg-red-600 text-black font-black uppercase text-sm tracking-[0.4em] transform -skew-x-12">
                                    Mission Terminated
                                </div>
                                <div className="mt-8 font-mono text-[8px] text-red-900/40 uppercase tracking-widest max-w-xs text-center leading-relaxed">
                                    Re-establishing connection with Starship control... <br/>
                                    Atmospheric interference detected.
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Telemetry Footer */}
                <div className="relative z-20 p-8 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-1 text-blue-400">
                            <Activity className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Velocity</span>
                        </div>
                        <div className="text-2xl font-black text-white tabular-nums tracking-tighter">{velocity} <span className="text-[10px] opacity-40">km/s</span></div>
                        <motion.div animate={{ height: gameState === 'PLAYING' ? "40%" : "0%" }} className="absolute left-0 bottom-0 w-1 bg-blue-500" />
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-1 text-purple-400">
                            <Gauge className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">G-Force</span>
                        </div>
                        <div className="text-2xl font-black text-white tabular-nums tracking-tighter">{gForce} <span className="text-[10px] opacity-40">G</span></div>
                        <motion.div animate={{ height: gameState === 'PLAYING' ? "60%" : "0%" }} className="absolute left-0 bottom-0 w-1 bg-purple-500" />
                    </div>

                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-1 text-emerald-400">
                            <Navigation className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Target Mlt</span>
                        </div>
                        <div className="text-2xl font-black text-white tabular-nums tracking-tighter">{targetMultiplier.toFixed(2)} <span className="text-[10px] opacity-40">x</span></div>
                        <motion.div animate={{ height: (currentMultiplier / targetMultiplier) * 100 + "%" }} className="absolute left-0 bottom-0 w-1 bg-emerald-500" />
                    </div>

                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-1 text-amber-500">
                            <Cpu className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Phase</span>
                        </div>
                        <div className="text-2xl font-black text-white tabular-nums tracking-tighter">
                            {currentMultiplier < 2 ? 'LIFT' : currentMultiplier < 5 ? 'ORB' : currentMultiplier < 10 ? 'DS' : 'STLR'}
                        </div>
                        <motion.div animate={{ height: gameState === 'PLAYING' ? "100%" : "0%" }} className="absolute left-0 bottom-0 w-1 bg-amber-500" />
                    </div>
                </div>

                {/* Background Rocket visual (Small & Subtle) */}
                <AnimatePresence>
                    {gameState === 'PLAYING' && (
                        <motion.div 
                            initial={{ y: 0, opacity: 0 }}
                            animate={{ 
                                y: [0, -5, 5, 0],
                                x: [0, 2, -2, 0],
                                opacity: 1 
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute bottom-40 right-40 opacity-10 pointer-events-none"
                        >
                            <Rocket className="w-64 h-64 -rotate-[45deg] text-white blur-[2px]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sidebar Controls - Improved Spacing & Cleanliness */}
            <div className="w-full lg:w-[450px] bg-[#05060b] border-l border-white/5 p-8 flex flex-col relative z-20">
                <div className="mb-12 flex items-center justify-between border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-white" />
                            </div>
                            STARSHIP OPS
                        </h2>
                    </div>
                </div>

                <div className="space-y-10 flex-1">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                             Launch Capital
                        </label>
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all focus-within:border-blue-500/50 focus-within:bg-white/[0.08]">
                            <Coins className="w-6 h-6 text-blue-400" />
                            <input 
                                type="number" 
                                value={isNaN(bet) ? "" : bet} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setBet(isNaN(val) ? 0 : val);
                                }}
                                disabled={gameState === 'PLAYING'}
                                className="bg-transparent text-4xl font-black text-white w-full outline-none p-0 hide-arrows"
                            />
                        </div>
                    </div>

                    <div className={`space-y-4 transition-all duration-500 ${isAutoExit ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                 Auto-Exit Target
                            </label>
                        </div>
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4 transition-all focus-within:border-emerald-500/50 focus-within:bg-white/[0.08]">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            <input 
                                type="number" 
                                step="0.1"
                                value={isNaN(targetMultiplier) ? "" : targetMultiplier} 
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setTargetMultiplier(isNaN(val) ? 0 : val);
                                }}
                                disabled={gameState === 'PLAYING' || !isAutoExit}
                                className="bg-transparent text-4xl font-black text-white w-full outline-none p-0 hide-arrows"
                            />
                            <span className="text-2xl font-black text-gray-600">X</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 cursor-pointer ${isAutoExit ? 'bg-blue-600' : 'bg-gray-700'}`} onClick={() => gameState === 'IDLE' && setIsAutoExit(!isAutoExit)}>
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isAutoExit ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Automatic Escape</span>
                        </div>
                        <AlertTriangle className={`w-4 h-4 ${isAutoExit ? 'text-gray-600' : 'text-amber-500'}`} />
                    </div>

                    <div className={`p-6 rounded-2xl border transition-all duration-500 ${isAutoExit ? 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20' : 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20'}`}>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mb-4">
                            <span className={isAutoExit ? 'text-blue-400' : 'text-amber-400'}>{isAutoExit ? 'Projected Return' : 'Manual Intensity'}</span>
                            <span className="text-emerald-500">Success Rate: Optm</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl font-black text-white">
                                {isAutoExit ? (bet * targetMultiplier).toLocaleString() : (bet * currentMultiplier).toFixed(0)} 
                                <span className="text-xs text-gray-500 ml-2">C</span>
                            </span>
                            <span className="text-xl font-black text-emerald-500">
                                +{isAutoExit ? ((targetMultiplier - 1) * 100).toFixed(0) : ((currentMultiplier - 1) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}
                </div>

                <div className="mt-12 space-y-4">
                    {gameState === 'PLAYING' ? (
                        <button 
                            onClick={handleManualCashOut}
                            className={`w-full py-8 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group
                                ${isAutoExit ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-[1.02] active:scale-95'}
                            `}
                        >
                            {isAutoExit ? (
                                <>
                                    <Zap className="w-6 h-6 animate-pulse" />
                                    MISSION IN PROGRESS
                                </>
                            ) : (
                                <>
                                    <Navigation className="w-6 h-6 animate-bounce" />
                                    INITIATE LANDING
                                </>
                            )}
                            {/* Pulse background for manual gain */}
                            {!isAutoExit && <div className="absolute inset-0 bg-white/20 animate-ping opacity-20" />}
                        </button>
                    ) : (
                        <button 
                            onClick={startPlay}
                            className="w-full py-8 rounded-[2rem] bg-white text-black font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-500 hover:text-white hover:scale-[1.02] active:scale-95 transition-all shadow-2xl relative group"
                        >
                            <Play className="w-6 h-6 fill-current" />
                            CONFIRM IGNITION
                        </button>
                    )}
                    <div className="flex items-center justify-center gap-4 opacity-30 group">
                        <div className="h-px flex-1 bg-white/20" />
                        <span className="text-[9px] font-black uppercase tracking-[0.4em]">Don Pollo Enterprise</span>
                        <div className="h-px flex-1 bg-white/20" />
                    </div>
                </div>
            </div>
        </div>
    );
}
