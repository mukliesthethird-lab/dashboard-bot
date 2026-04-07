"use client";

import { useState, useRef, useEffect } from "react";
import { CircleDollarSign, Trophy, Hexagon, Play, Square, Circle, Rocket } from "lucide-react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

export default function VIPCasinoPage() {
    const [activeTab, setActiveTab] = useState<"CRASH" | "ROULETTE">("CRASH");

    return (
        <div className="min-h-screen bg-[#020204] text-white selection:bg-amber-500/30 overflow-x-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <main className="relative z-10 pt-28 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto min-h-[calc(100vh-80px)] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black tracking-widest uppercase mb-4">
                            <CircleDollarSign className="w-4 h-4" />
                            Don Pollo VIP Casino
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                            Excellence in Gaming.
                        </h1>
                    </div>

                    <div className="flex bg-[#0b0c10] border border-white/5 p-1 rounded-2xl w-full md:w-[400px] shadow-2xl">
                        <button 
                            onClick={() => setActiveTab("CRASH")}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-sm uppercase tracking-wider relative ${
                                activeTab === "CRASH" ? 'text-white' : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            {activeTab === "CRASH" && (
                                <motion.div layoutId="casinoTab" className="absolute inset-0 bg-white/10 rounded-xl" />
                            )}
                            <span className="relative z-10">Spacex Crash</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab("ROULETTE")}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-sm uppercase tracking-wider relative ${
                                activeTab === "ROULETTE" ? 'text-white' : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            {activeTab === "ROULETTE" && (
                                <motion.div layoutId="casinoTab" className="absolute inset-0 bg-white/10 rounded-xl" />
                            )}
                            <span className="relative z-10">VIP Roulette</span>
                        </button>
                    </div>
                </div>

                {/* Game Container */}
                <div className="flex-1 bg-[#0b0c10] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative">
                    <AnimatePresence mode="wait">
                        {activeTab === "CRASH" ? (
                            <motion.div key="crash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 h-full w-full">
                                <PremiumCrashGame />
                            </motion.div>
                        ) : (
                            <motion.div key="roulette" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="absolute inset-0 h-full w-full">
                                <PremiumRouletteGame />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// ---------------------------------------------------------
// CRASH GAME COMPONENT
// ---------------------------------------------------------
function PremiumCrashGame() {
    const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "CASHED_OUT" | "CRASHED">("IDLE");
    const [multiplier, setMultiplier] = useState(1.00);
    const [crashPoint, setCrashPoint] = useState(0);
    
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const startGame = () => {
        const point = Math.max(1.01, 1.00 / (1.0 - Math.random()));
        const finalCrash = point > 50 ? 50.0 : +point.toFixed(2);
        
        setCrashPoint(finalCrash);
        setMultiplier(1.00);
        setGameState("PLAYING");
        startTimeRef.current = performance.now();
        
        const animate = (time: number) => {
            const elapsed = (time - startTimeRef.current) / 1000;
            // Easing formula
            let currentMult = 1.00 + Math.pow(elapsed * 0.7, 2.5);
            
            if (currentMult >= finalCrash) {
                setMultiplier(finalCrash);
                setGameState("CRASHED");
                return;
            }
            
            setMultiplier(currentMult);
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
    };

    const cashOut = () => {
        if (gameState !== "PLAYING") return;
        cancelAnimationFrame(requestRef.current);
        setGameState("CASHED_OUT");
    };

    useEffect(() => { return () => cancelAnimationFrame(requestRef.current); }, []);

    // Canvas/Visual calculations
    const visualMult = Math.min(Math.max(multiplier, 1), 5); // visually caps at 5x to stay on screen
    const progress = (visualMult - 1) / 4; // 0 to 1
    
    const xPos = progress * 75; // max 75% across
    const yPos = progress * 75; // max 75% up

    // Particle system configs (Explosion)
    const explosionParticles = Array.from({ length: 30 });

    return (
        <div className="w-full h-full flex flex-col md:flex-row relative bg-[#060608]">
            {/* Main Graph Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Sci-Fi Grid Background */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: '100px 100px',
                        transform: `scale(1.2) translateY(${gameState === 'PLAYING' ? (Date.now() % 100) * 0.1 : 0}px)`
                    }}
                />
                
                {/* The Path Tracing */}
                {(gameState === "PLAYING" || gameState === "CASHED_OUT" || gameState === "CRASHED") && (
                    <svg className="absolute bottom-10 left-10 w-[calc(100%-40px)] h-[calc(100%-80px)] pointer-events-none overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="crashLine" x1="0" y1="1" x2="1" y2="0">
                                <stop offset="0%" stopColor={gameState === 'CRASHED' ? '#ef4444' : '#f59e0b'} stopOpacity="0" />
                                <stop offset="100%" stopColor={gameState === 'CRASHED' ? '#ef4444' : '#f59e0b'} stopOpacity="1" />
                            </linearGradient>
                            <filter id="neon">
                                <feGaussianBlur stdDeviation="5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path 
                            d={`M 0 1000 Q ${xPos}% 1000, ${xPos}% ${100 - yPos}%`}
                            fill="none" 
                            stroke="url(#crashLine)"
                            strokeWidth="4" 
                            strokeLinecap="round"
                            style={{ filter: "url(#neon)" }}
                        />
                        
                        {/* Shaded Area under curve */}
                        <path 
                            d={`M 0 1000 Q ${xPos}% 1000, ${xPos}% ${100 - yPos}% L ${xPos}% 1000 Z`}
                            fill="url(#crashLine)" 
                            opacity="0.1"
                        />
                    </svg>
                )}

                {/* The Ship / Explosion */}
                {gameState !== "IDLE" && (
                    <motion.div 
                        className="absolute bottom-10 left-10 pointer-events-none"
                        style={{
                            x: `calc(${xPos}vw * 0.7)`,
                            y: `calc(-${yPos}vh * 0.6 + 50%)`,
                        }}
                    >
                        {gameState === "CRASHED" ? (
                            <div className="relative flex justify-center items-center">
                                {/* Explosion Particles */}
                                {explosionParticles.map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"
                                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                        animate={{
                                            x: (Math.random() - 0.5) * 400,
                                            y: (Math.random() - 0.5) * 400,
                                            scale: 0,
                                            opacity: 0
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                ))}
                                {/* Core flash */}
                                <motion.div 
                                    initial={{ scale: 0, opacity: 1 }} 
                                    animate={{ scale: 10, opacity: 0 }} 
                                    transition={{ duration: 0.5 }}
                                    className="absolute w-12 h-12 bg-white rounded-full blur-md"
                                />
                            </div>
                        ) : gameState === "CASHED_OUT" ? (
                            <div className="relative">
                                {/* Successful landing/parachute mock */}
                                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-16 -left-8 text-emerald-400">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="relative group">
                                {/* Advanced Rocket SVG */}
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fce7f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-[45deg] filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5-4 5-4v5"/>
                                    <circle cx="15" cy="9" r="1"/>
                                </svg>
                                {/* Thruster flame */}
                                <motion.div 
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 0.1 }}
                                    className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-tr from-transparent via-amber-500 to-red-500 blur-sm rounded-full mix-blend-screen"
                                />
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Big Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`font-black tracking-tighter tabular-nums ${
                            gameState === "CRASHED" ? "text-red-500 text-8xl" : 
                            gameState === "CASHED_OUT" ? "text-emerald-500 text-8xl" : 
                            "text-white text-9xl md:text-[10rem]"
                        }`}
                        style={{
                            textShadow: gameState === 'CRASHED' ? '0 0 100px rgba(239, 68, 68, 0.5)' :
                                        gameState === 'CASHED_OUT' ? '0 0 100px rgba(16, 185, 129, 0.5)' :
                                        '0 0 100px rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        {multiplier.toFixed(2)}x
                    </motion.div>
                    
                    {gameState === "CRASHED" && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 text-red-500 font-bold px-6 py-2 border border-red-500/20 bg-red-500/10 backdrop-blur-md rounded-full uppercase tracking-widest text-sm flex items-center gap-2">
                            <Square className="w-4 h-4" /> Network Crashed
                        </motion.div>
                    )}
                    {gameState === "CASHED_OUT" && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 text-emerald-400 font-bold px-6 py-2 border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-md rounded-full uppercase tracking-widest text-sm flex items-center gap-2">
                            <Hexagon className="w-4 h-4 fill-emerald-500/20" /> Assets Secured
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className="w-full md:w-[350px] bg-[#0a0b0e] border-l border-white/5 p-6 flex flex-col md:h-full z-20">
                <div className="mb-8">
                    <h2 className="text-xl font-black mb-1 flex items-center gap-2"><Rocket className="w-5 h-5 text-amber-500" /> SPACEX MODE</h2>
                    <p className="text-gray-500 text-xs font-medium">Bail out before the structural failure.</p>
                </div>

                <div className="space-y-6 flex-1">
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Bet Size</label>
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500/10 p-2 rounded-lg">
                                <CircleDollarSign className="w-5 h-5 text-amber-500" />
                            </div>
                            <input 
                                type="number" 
                                defaultValue="500" 
                                disabled={gameState === "PLAYING"} 
                                className="bg-transparent text-white font-black text-2xl w-full focus:outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    {gameState === "IDLE" || gameState === "CRASHED" || gameState === "CASHED_OUT" ? (
                        <button 
                            onClick={startGame}
                            className="w-full py-5 rounded-2xl font-black text-[#020204] text-lg bg-white hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            <Play className="w-5 h-5 fill-current" /> DEPLOY ASSETS
                        </button>
                    ) : (
                        <button 
                            onClick={cashOut}
                            className="w-full py-5 rounded-2xl font-black text-white text-lg bg-emerald-500 hover:bg-emerald-600 transition-all shadow-[0_0_40px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
                        >
                            <Square className="w-5 h-5 fill-current" /> EJECT (CASH OUT)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------
// PREMUM ROULETTE GAME COMPONENT 
// ---------------------------------------------------------
function PremiumRouletteGame() {
    const [isSpinning, setIsSpinning] = useState(false);
    const [resultDegree, setResultDegree] = useState(0);
    const [lastResult, setLastResult] = useState<{ color: string, number: number } | null>(null);

    // Advanced Wheel Layout (European Roulette: Green 0, Red/Black 1-36)
    // For simplicity, mimicking the Discord bot's 15 slots (0 green, 1-7 red, 8-14 black)
    const segments = 15;
    const degreePerSegment = 360 / segments;
    const slots: { id: number, color: string, uiColor: string }[] = [];
    
    // Map slots
    for (let i = 0; i < segments; i++) {
        let color = i === 0 ? "green" : (i % 2 !== 0 ? "red" : "black");
        let uiColor = color === "green" ? "#10b981" : color === "red" ? "#dc2626" : "#262626";
        slots.push({ id: i, color, uiColor });
    }

    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setLastResult(null);
        
        const winningIndex = Math.floor(Math.random() * segments);
        const winningSlot = slots[winningIndex];
        
        // Target angle (middle of the target segment)
        const targetAngle = winningIndex * degreePerSegment + (degreePerSegment / 2);
        
        // Full spins to add drama (e.g. 5 spins = 1800 deg)
        // We calculate total rotation relative to the fixed top pointer (0 deg).
        // Since wheel rotates clockwise relative to a fixed pointer at the Top,
        // landing on `targetAngle` means we need to rotate wheel by 360 - targetAngle.
        const baseSpins = 360 * 6; // 6 full rotations
        const finalTransform = baseSpins + (360 - targetAngle);
        
        // Add to current rotation safely to maintain css direction
        const currentSpins = Math.floor(resultDegree / 360) * 360;
        setResultDegree(currentSpins + finalTransform);
        
        setTimeout(() => {
            setIsSpinning(false);
            setLastResult({ color: winningSlot.color, number: winningSlot.id });
        }, 6000); // Wait for the 6s Framer motion animation to end
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-[#080b0f]">
            {/* Betting Panel (Left) */}
            <div className="w-full md:w-[400px] border-r border-white/5 p-6 flex flex-col z-20 bg-[#0a0c10]">
                <div className="mb-8">
                    <h2 className="text-xl font-black mb-1 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> VIP ROULETTE</h2>
                    <p className="text-gray-500 text-xs font-medium">Place your chips on the felt.</p>
                </div>
                
                <div className="flex-1 space-y-6">
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-4">
                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Bet Size</label>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-dashed border-white/30 flex items-center justify-center font-black text-xs text-white/50 shadow-inner mix-blend-screen">10</div>
                                <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-dashed border-white/30 flex items-center justify-center font-black text-xs text-white/50 shadow-inner mix-blend-screen mix-blend-screen">50</div>
                            </div>
                            <input type="number" defaultValue="1000" disabled={isSpinning} className="bg-transparent text-white font-black text-2xl w-full text-right focus:outline-none ml-auto" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-red-500/20 to-red-500/5 hover:to-red-500/10 border border-red-500/30 rounded-2xl transition hover:-translate-y-1">
                            <div className="w-4 h-4 rounded-full bg-red-500 mb-2 shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                            <span className="font-bold text-white text-sm">RED</span>
                            <span className="text-xs text-gray-500">2x Payout</span>
                        </button>
                        <button className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-gray-500/20 to-gray-500/5 hover:to-gray-500/10 border border-gray-500/30 rounded-2xl transition hover:-translate-y-1">
                            <div className="w-4 h-4 rounded-full bg-gray-900 border border-white/20 mb-2 shadow-[0_0_15px_rgba(0,0,0,0.8)]" />
                            <span className="font-bold text-white text-sm">BLACK</span>
                            <span className="text-xs text-gray-500">2x Payout</span>
                        </button>
                        <button className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 hover:to-emerald-500/10 border border-emerald-500/30 rounded-2xl transition hover:-translate-y-1">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
                            <span className="font-bold text-white text-sm">GREEN</span>
                            <span className="text-xs text-gray-500">14x Payout</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    <button 
                        onClick={spinWheel}
                        disabled={isSpinning}
                        className="w-full py-5 rounded-2xl font-black text-[#020204] text-lg bg-amber-500 hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:grayscale"
                    >
                        <Circle className="w-5 h-5 stroke-[3]" /> NO MORE BETS
                    </button>
                </div>
            </div>

            {/* Cinematic Wheel Area (Right) */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center" style={{ perspective: '1000px' }}>
                
                {/* 3D Wheel Container */}
                <div 
                    className="relative flex justify-center items-center w-full h-full"
                    style={{ transformStyle: 'preserve-3d', transform: 'rotateX(50deg) scale(1.2)', transformOrigin: 'center center' }}
                >
                    {/* The physical table felt */}
                    <div className="absolute w-[800px] h-[800px] bg-gradient-to-br from-emerald-900/40 to-black rounded-full blur-3xl opacity-50" style={{ transform: 'translateZ(-100px)' }} />
                    
                    {/* The Fixed Outer Rim (Wood/Metal casing) */}
                    <div className="absolute w-[460px] h-[460px] rounded-full bg-[#111] border-[15px] border-[#251810] shadow-[0_50px_50px_rgba(0,0,0,0.8),inset_0_10px_30px_rgba(0,0,0,1)] flex items-center justify-center">
                        
                        {/* The Fixed Pointer */}
                        <div className="absolute top-0 w-4 h-8 bg-zinc-300 rounded-b-md z-30 shadow-[0_5px_10px_rgba(0,0,0,0.8)] filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] border-b-2 border-white/50" style={{ transform: 'translateY(-50%) translateZ(20px)' }} />

                        {/* Rotating Wheel Logic (Framer Motion) */}
                        <motion.div 
                            className="w-[400px] h-[400px] rounded-full border-4 border-[#1a1a1a] flex items-center justify-center relative shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: resultDegree }}
                            transition={{ duration: 6, ease: [0.1, 0.9, 0.2, 1] }} // Heavy decel curve simulating wheel physics
                            style={{ 
                                background: `conic-gradient(${slots.map((s, i) => `${s.uiColor} ${i * degreePerSegment}deg ${(i + 1) * degreePerSegment}deg`).join(', ')})`,
                            }}
                        >
                            {/* Inner cone effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-full mix-blend-overlay" />
                            
                            {/* Dividers & Numbers */}
                            {slots.map((s, i) => (
                                <div key={i} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: `rotate(${i * degreePerSegment + (degreePerSegment/2)}deg)` }}>
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-black text-xs tracking-tighter" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                                        {s.id}
                                    </div>
                                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/20" style={{ transform: `translateX(-50%) rotate(${degreePerSegment/2}deg)`, transformOrigin: 'center center' }} />
                                </div>
                            ))}

                            {/* Center Turret (Spinning opposite / independently visual) */}
                            <div className="w-48 h-48 rounded-full bg-gradient-to-b from-[#333] to-[#111] border-8 border-black/50 shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_2px_5px_rgba(255,255,255,0.1)] flex items-center justify-center relative">
                                <div className="absolute inset-2 border-2 border-dashed border-white/10 rounded-full animate-[spin_10s_linear_reverse_infinite]" />
                                <div className="w-16 h-16 bg-[#251810] rounded-full shadow-[inset_0_5px_10px_rgba(0,0,0,0.8)] border border-white/5 flex items-center justify-center">
                                    <img src="/donpollo-icon.jpg" className="w-8 h-8 rounded-full opacity-50 grayscale" alt="DP" />
                                </div>
                            </div>
                            
                            {/* The Ball (If we had separate logic we'd rotate it differently, here we just attach it to an internal track for simplicity) */}
                            {isSpinning && (
                                <motion.div 
                                    className="absolute inset-[30px] rounded-full border border-white/0 pointer-events-none"
                                    animate={{ rotate: [-360, 0] }}
                                    transition={{ duration: 6, ease: [0.2, 0.8, 0.3, 1] }} 
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.5)]" />
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Outcome UI Overlay */}
                <AnimatePresence>
                    {lastResult && !isSpinning && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-10 z-50 bg-[#0a0c10]/90 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-2xl text-center"
                        >
                            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Winning Number</p>
                            <div className={`text-6xl font-black mb-2 ${lastResult.color === "red" ? "text-red-500" : lastResult.color === "green" ? "text-emerald-500" : "text-white"}`}>
                                {lastResult.number} {lastResult.color.toUpperCase()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
