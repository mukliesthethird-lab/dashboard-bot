"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
    Play, Trophy, Sparkles, AlertCircle,
    Coins, Zap, Crown, Star, Flame, Loader2
} from "lucide-react";

interface SlotGameProps {
    userBalance: number;
    onBalanceChange: (newBalance: number) => void;
}

const SYMBOLS = ["🍒", "🍋", "🍇", "🍊", "🍉", "💎", "⭐"];
const SYMBOL_COLORS: Record<string, string> = {
    "🍒": "text-red-500",
    "🍋": "text-yellow-400",
    "🍇": "text-purple-500",
    "🍊": "text-orange-500",
    "🍉": "text-green-500",
    "💎": "text-blue-400",
    "⭐": "text-amber-400"
};

const REEL_COUNT = 3;
const SYMBOLS_PER_REEL = 50; // Total symbols in the rolling strip

export default function SlotGame({ userBalance, onBalanceChange }: SlotGameProps) {
    const [bet, setBet] = useState(100);
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelsData, setReelsData] = useState<string[][]>([
        ["💎", "💎", "💎"], // Reel 1
        ["💎", "💎", "💎"], // Reel 2
        ["💎", "💎", "💎"]  // Reel 3
    ]);
    const [lastResult, setLastResult] = useState<{ wins: number; text: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showJackpot, setShowJackpot] = useState(false);

    // Controls for animation
    const reelControls = [useAnimation(), useAnimation(), useAnimation()];
    const shakeControls = useAnimation();
    const [isJackpotHit, setIsJackpotHit] = useState(false);
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; s: number; color: string }[]>([]);

    const generateReelStrip = (targetSymbol: string, prevSymbols: string[]) => {
        const strip = [...prevSymbols]; // Start with the 3 symbols currently visible
        // Fill the rest of the strip (e.g. 47 more symbols)
        for (let i = 0; i < SYMBOLS_PER_REEL - 3; i++) {
            strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        }
        // Place target symbol such that it will be in the center (length - 2)
        strip[strip.length - 2] = targetSymbol;
        return strip;
    };

    const spin = async () => {
        if (isSpinning) return;
        if (userBalance < bet) {
            setError("Insufficient balance!");
            return;
        }
        setError(null);
        setIsSpinning(true);
        setLastResult(null);
        setShowJackpot(false);

        try {
            const response = await fetch("/api/casino", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game: "slots", bet }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Internal Error");

            // Get current visible symbols (the ones at the end of the previous strip)
            const currentSymbols = reelsData.map(strip => strip.slice(-3));

            // Generate full strips starting with current symbols and ending with winning results
            const newStrips = data.reels.map((symbol: string, i: number) => 
                generateReelStrip(symbol, currentSymbols[i])
            );
            setReelsData(newStrips);

            // Reset position and start staggered animations
            const spinPromises = reelControls.map((ctrl, i) => {
                ctrl.set({ y: 0 }); // RESET POSITION BEFORE SPIN
                return ctrl.start({
                    y: -(SYMBOLS_PER_REEL - 3) * 120,
                    transition: {
                        duration: 3 + i * 0.8,
                        ease: [0.45, 0.05, 0.55, 1], // Realistic slowing down
                    }
                });
            });

            await Promise.all(spinPromises);

            // Final updates
            onBalanceChange(data.newBalance);
            setLastResult({ wins: data.winnings, text: data.resultText });

            // Handle Celebrations
            if (data.resultText.includes("JACKPOT") || data.resultText.includes("MAJOR")) {
                const isJackpot = data.resultText.includes("JACKPOT");
                setIsJackpotHit(true);
                
                // 1. Shake Machine
                shakeControls.start({
                    x: [0, -20, 20, -15, 15, -10, 10, -5, 5, 0],
                    transition: { duration: 0.5, ease: "easeInOut" }
                });

                // 2. Burst Particles
                const newParticles = Array.from({ length: 30 }).map((_, i) => ({
                    id: Date.now() + i,
                    x: Math.random() * 400 - 200,
                    y: Math.random() * 400 - 200,
                    s: Math.random() * 2 + 1,
                    color: isJackpot ? "#fbbf24" : "#fcd34d"
                }));
                setParticles(newParticles);
                setTimeout(() => setParticles([]), 2000);
                setTimeout(() => setIsJackpotHit(false), 3000);
            }

            // Return reels to index 0 visually but updated with final symbol
            // To prevent jump, we'd need a more complex circular loop. 
            // For now, we'll just keep them at the end of the strip.
            // Reset state for next spin:
            // setReelsData(prev => prev.map((strip, i) => [strip[strip.length-1], strip[strip.length-1], strip[strip.length-1]]));
            // controls.forEach(c => c.set({ y: 0 }));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSpinning(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#020308] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1)_0%,transparent_50%)]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />

            <div className="relative z-10 w-full max-w-5xl flex flex-col gap-10">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500" />
                        <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 flex items-center gap-4 italic tracking-tighter">
                            <Crown className="w-10 h-10 text-amber-500" />
                            DON POLLO SLOTS
                        </h2>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500" />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center relative">
                    {/* Particles Container */}
                    <div className="absolute inset-0 z-50 pointer-events-none">
                        {particles.map((p) => (
                            <motion.div
                                key={p.id}
                                initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
                                animate={{ x: `calc(50% + ${p.x}px)`, y: `calc(50% + ${p.y}px)`, opacity: 0, scale: p.s, rotate: 360 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute"
                                style={{ color: p.color }}
                            >
                                <Sparkles className="w-8 h-8 fill-current" />
                            </motion.div>
                        ))}
                    </div>

                    {/* PREMIUM CSS SLOT MACHINE FRAME */}
                    <motion.div 
                        animate={shakeControls}
                        className={`flex-1 max-w-[600px] relative p-8 rounded-[3.5rem] bg-zinc-900 border-x-4 border-t-2 border-b-[12px] transition-colors duration-300
                            ${isJackpotHit ? 'border-amber-500 shadow-[0_0_100px_rgba(245,158,11,0.4)]' : 'border-zinc-950 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]'}
                            flex flex-col items-center
                        `}
                    >
                        <div className="absolute top-6 flex gap-6">
                            {[0,1,2,3,4,5,6].map(i => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSpinning || isJackpotHit ? 'animate-pulse bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-zinc-800'}`} style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>

                        <div className={`w-full mt-6 bg-[#050508] rounded-[2.5rem] p-6 flex gap-3 border-[6px] relative overflow-hidden group transition-colors duration-300
                            ${isJackpotHit ? 'border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.2)]' : 'border-black/40'}
                        `}>
                            <AnimatePresence>
                                {isJackpotHit && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 0.8, 0] }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute inset-0 bg-white z-50 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>

                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none z-30" />
                            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,1)] z-20 pointer-events-none rounded-[2rem]" />

                            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[140px] z-10 pointer-events-none">
                                <div className="absolute inset-0 bg-amber-500/[0.03] border-y-2 border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)]" />
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-10 bg-amber-500 rounded-r-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-10 bg-amber-500 rounded-l-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                            </div>

                            {[0, 1, 2].map((reelIndex) => (
                                <div key={reelIndex} className="flex-1 h-[360px] overflow-hidden relative">
                                    <motion.div
                                        animate={reelControls[reelIndex]}
                                        initial={{ y: 0 }}
                                        className="flex flex-col items-center"
                                    >
                                        {reelsData[reelIndex].map((symbol, i) => (
                                            <div
                                                key={i}
                                                className="h-[120px] w-full flex items-center justify-center text-7xl md:text-8xl relative"
                                                style={{ filter: isSpinning ? 'blur(4px)' : 'none' }}
                                            >
                                                {!isSpinning && i === reelsData[reelIndex].length - 2 && lastResult && lastResult.wins > 0 && (
                                                    <motion.div 
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                                        className="absolute inset-0 bg-white rounded-full blur-2xl"
                                                    />
                                                )}
                                                <span className={`${SYMBOL_COLORS[symbol]} drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] relative z-10 ${!isSpinning && i === reelsData[reelIndex].length - 2 && lastResult && lastResult.wins > 0 ? 'scale-110' : ''} transition-transform`}>
                                                    {symbol}
                                                </span>
                                            </div>
                                        ))}
                                    </motion.div>
                                    {reelIndex < 2 && (
                                        <div className="absolute right-0 top-1/4 h-1/2 w-px bg-white/5 z-20" />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="w-full mt-6 flex justify-between items-center px-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1">Authentic Gear</span>
                                <span className="text-[9px] font-bold text-zinc-500">Not a financial advisor</span>
                            </div>
                            <div className="flex gap-1.5 p-2 bg-black/40 rounded-full border border-white/5">
                                <div className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-amber-500 animate-ping' : 'bg-red-500'}`} />
                                <div className={`w-2 h-2 rounded-full ${isSpinning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
                            </div>
                        </div>
                    </motion.div>

                    <div className="w-full lg:w-[400px] flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="text-xl flex gap-1">💎💎💎</div>
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Jackpot</span>
                                </div>
                                <span className="text-xl font-black text-amber-500 italic">20X</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="text-xl flex gap-1">⭐⭐⭐</div>
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Major</span>
                                </div>
                                <span className="text-xl font-black text-white italic">15X</span>
                            </div>
                        </div>

                        <div className="bg-[#0b0c14] border border-white/5 p-8 rounded-[2.5rem] flex flex-col flex-1">
                            <div className="mb-auto">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 block">Current Configuration</label>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {[100, 500, 1000, 5000].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => !isSpinning && setBet(v)}
                                            className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${bet === v
                                                ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                                                : 'bg-white/5 text-zinc-500 border-transparent hover:border-white/10 hover:text-white'}`}
                                        >
                                            {v >= 1000 ? (v / 1000) + 'K' : v}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative mb-8 group">
                                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                        <Coins className="w-4 h-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                                    </div>
                                    <input 
                                        type="number"
                                        value={bet}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setBet(val);
                                        }}
                                        disabled={isSpinning}
                                        placeholder="Custom Amount"
                                        className="w-full bg-white/5 border-2 border-transparent focus:border-white/10 focus:bg-white/[0.08] rounded-2xl py-4 pl-12 pr-4 text-white font-black text-sm outline-none transition-all placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Koin</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <AnimatePresence mode="wait">
                                    {lastResult ? (
                                        <motion.div
                                            key="result"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="text-center"
                                        >
                                            <div className={`text-4xl font-black italic tracking-tighter uppercase ${lastResult.wins > 0 ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'text-zinc-600'}`}>
                                                {lastResult.text}
                                            </div>
                                            {lastResult.wins > 0 && (
                                                <div className="text-sm font-black text-amber-500/80 mt-1 uppercase tracking-[0.2em] animate-pulse">
                                                    Payout: +{lastResult.wins.toLocaleString()} Coins
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <div key="ready" className="text-center opacity-20">
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">System Ready</span>
                                        </div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={spin}
                                    disabled={isSpinning}
                                    className={`w-full py-8 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl
                                        ${isSpinning
                                            ? 'bg-zinc-800 text-zinc-600 grayscale cursor-not-allowed opacity-50'
                                            : 'bg-white text-black hover:bg-emerald-500 hover:text-white hover:scale-[1.02] active:scale-95 shadow-white/10'}
                                    `}
                                >
                                    {isSpinning ? <Loader2 className="w-8 h-8 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
                                    {isSpinning ? 'REELING...' : 'SPIN SYSTEM'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] font-black flex items-center gap-3">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
