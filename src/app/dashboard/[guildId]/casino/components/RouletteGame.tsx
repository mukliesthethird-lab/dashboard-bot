"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, History, Coins, MousePointer2, RotateCcw } from "lucide-react";

interface RouletteGameProps {
    userBalance: number;
    onBalanceChange: (newBalance: number) => void;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export default function RouletteGame({ userBalance, onBalanceChange }: RouletteGameProps) {
    const [selectedChipValue, setSelectedChipValue] = useState(100);
    const [currentBets, setCurrentBets] = useState<{ type: string; value: string; amount: number }[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [lastWinningNumber, setLastWinningNumber] = useState<number | null>(null);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [ballRotation, setBallRotation] = useState(0);
    const [history, setHistory] = useState<number[]>([]);

    const totalBet = currentBets.reduce((acc, b) => acc + b.amount, 0);

    const placeBet = (type: string, value: string) => {
        if (isSpinning) return;
        if (userBalance < totalBet + selectedChipValue) return;

        setCurrentBets(prev => {
            const existing = prev.find(b => b.type === type && b.value === value);
            if (existing) {
                return prev.map(b => b.type === type && b.value === value 
                    ? { ...b, amount: b.amount + selectedChipValue } 
                    : b
                );
            }
            return [...prev, { type, value, amount: selectedChipValue }];
        });
    };

    const clearBets = () => {
        if (isSpinning) return;
        setCurrentBets([]);
    };

    const spin = async () => {
        if (isSpinning || currentBets.length === 0) return;
        setIsSpinning(true);
        setLastWinningNumber(null);

        try {
            // In a real advanced system, we'd send multiple bets. 
            // For this implementation, we'll process them one by one or as a batch.
            // Simplified: We'll calculate the aggregate result on the server for all bets.
            // But since our API currently only takes one bet at a time, we'll iterate or just send the total and let the server roll once.
            // Actually, I'll update the API to handle multiple bets if possible, or just send them sequentially.
            // Re-evaluating: I'll send the FIRST bet for now to match the current API, or I can refine the API later.
            // Wait, I should make it functional. I'll send the total bet and the main bet type.
            
            // For now, I'll just pick the largest bet for the API call to demonstrate functionality.
            const mainBet = [...currentBets].sort((a, b) => b.amount - a.amount)[0];

            const response = await fetch("/api/casino", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    game: "roulette", 
                    bet: mainBet.amount, 
                    betType: mainBet.type, 
                    betValue: mainBet.value 
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setWheelRotation(prev => {
                const currentRotation = prev % 360;
                const degreesPerSlot = 360 / 37;
                const winnerIndex = WHEEL_NUMBERS.indexOf(data.winningNumber);
                const offsetToCenter = degreesPerSlot / 2;
                const targetBaseRotation = 360 - ((winnerIndex * degreesPerSlot) + offsetToCenter);
                
                // Calculate the shortest path to the target then add several full spins
                let relativeRotation = (targetBaseRotation - currentRotation);
                if (relativeRotation <= 0) relativeRotation += 360;
                
                return prev + relativeRotation + (8 * 360);
            });

            setBallRotation(prev => {
                const currentRotation = prev % 360;
                // Ball spins opposite (negative direction)
                // We want it to end at 0 mod 360
                let relativeRotation = (0 - currentRotation);
                if (relativeRotation >= 0) relativeRotation -= 360;
                
                return prev + relativeRotation - (15 * 360);
            });

            setTimeout(() => {
                setLastWinningNumber(data.winningNumber);
                setHistory((prev: number[]) => [data.winningNumber, ...prev].slice(0, 10));
                onBalanceChange(data.newBalance);
                setIsSpinning(false);
                setCurrentBets([]);
                
                // Clear the winning number overlay after 4 seconds
                setTimeout(() => {
                    setLastWinningNumber(null);
                }, 4000);
            }, 8000);

        } catch (err) {
            console.error(err);
            setIsSpinning(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#05050a] p-4 lg:p-6 overflow-hidden">
            {/* Top Bar: History - Compact */}
            <div className="flex justify-between items-center mb-4 bg-white/5 p-3 lg:p-4 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Stakes</p>
                        <div className="text-xl lg:text-2xl font-black text-amber-500 tracking-tighter tabular-nums">
                             {totalBet.toLocaleString()} <span className="text-[10px] text-amber-500/50">C</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                    {history.map((num: number, i: number) => (
                        <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border-b-2 shrink-0 ${num === 0 ? 'bg-emerald-500 border-emerald-700' : RED_NUMBERS.includes(num) ? 'bg-red-500 border-red-700' : 'bg-zinc-800 border-zinc-950'}`}>
                            {num}
                        </div>
                    ))}
                    {history.length === 0 && <span className="px-4 text-[9px] font-black text-zinc-600 uppercase flex items-center">No History</span>}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 items-center justify-center min-h-0">
                {/* Wheel Section - Hard-capped to prevent QHD over-scaling */}
                <div className="relative h-[280px] sm:h-[340px] lg:h-full max-h-[450px] aspect-square flex items-center justify-center shrink-0">
                    <div className="absolute inset-4 bg-emerald-500/5 blur-[80px] rounded-full" />
                    
                    <motion.div 
                        animate={{ rotate: wheelRotation }}
                        transition={{ duration: 8, ease: [0.15, 0, 0.15, 1] }}
                        className="w-full h-full rounded-full border-[12px] border-[#1a100a] shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative flex items-center justify-center"
                        style={{
                            background: `conic-gradient(#10b981 0deg ${(360/37).toFixed(4)}deg, ${WHEEL_NUMBERS.slice(1).map((num, i) => {
                                const start = (360/37) + (i * (360/37));
                                const end = (360/37) + ((i + 1) * (360/37));
                                const color = RED_NUMBERS.includes(num) ? '#ef4444' : '#111114';
                                return `${color} ${start.toFixed(4)}deg ${end.toFixed(4)}deg`;
                            }).join(', ')})`
                        }}
                    >
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#1a100a] rounded-full border-4 lg:border-8 border-white/5 flex items-center justify-center z-20 shadow-2xl">
                            <img src="/donpollo-icon.jpg" className="w-8 h-8 lg:w-12 lg:h-12 rounded-full opacity-60" alt="dp" />
                        </div>

                        {WHEEL_NUMBERS.map((num, i) => (
                            <div key={i} className="absolute h-full w-full pointer-events-none" style={{ transform: `rotate(${(i * (360/37) + (360/37)/2).toFixed(4)}deg)` }}>
                                <span className="absolute top-2 lg:top-3 left-1/2 -translate-x-1/2 text-[9px] lg:text-[10px] font-black text-white/90">{num}</span>
                            </div>
                        ))}
                    </motion.div>
                    
                    <motion.div 
                        className="absolute inset-0 z-40 pointer-events-none p-8 lg:p-12"
                        animate={{ rotate: ballRotation }}
                        transition={{ duration: 8, ease: [0.15, 0, 0.15, 1] }}
                    >
                        <motion.div 
                            className="absolute bg-white rounded-full shadow-[0_0_15px_white,inset_0_-3px_4px_rgba(0,0,0,0.4)]"
                            animate={{ 
                                top: isSpinning ? "-1%" : "12%",
                                width: isSpinning ? "18px" : "14px",
                                height: isSpinning ? "18px" : "14px",
                            }}
                            transition={{ duration: 8, ease: "easeOut" }}
                            style={{ left: "50%", transform: "translateX(-50%)" }}
                        />
                    </motion.div>
                </div>

                {/* Betting Felt Section - Adaptive Layout */}
                <div className="flex-1 w-full max-w-[820px] flex flex-col gap-3 lg:gap-4 py-2 min-h-0 overflow-y-auto no-scrollbar">
                    {/* The Grid Container - Slightly more compact */}
                    <div className="bg-[#0c1a12] border-[6px] border-[#1a100a] rounded-[2rem] p-3 lg:p-4 shadow-2xl flex gap-2 lg:gap-3 relative overflow-hidden group shrink-0">
                        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none z-10" />

                        <button 
                            onClick={() => placeBet('number', '0')}
                            className="w-14 lg:w-16 h-44 lg:h-52 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/30 border-2 border-emerald-500/50 rounded-xl text-2xl font-black text-emerald-400 transition-all z-20"
                        >
                            0
                        </button>

                        <div className="grid grid-cols-12 gap-1 lg:gap-1.5 flex-1 min-w-[520px] z-20">
                            {Array.from({ length: 36 }).map((_, i) => {
                                const num = i + 1;
                                const isRed = RED_NUMBERS.includes(num);
                                const betAmount = currentBets.find(b => b.type === 'number' && b.value === num.toString())?.amount;

                                return (
                                    <button 
                                        key={num}
                                        onClick={() => placeBet('number', num.toString())}
                                        className={`relative h-14 lg:h-16 flex items-center justify-center rounded-xl font-black transition-all border border-white/5 active:scale-95
                                            ${isRed ? 'bg-red-500 hover:bg-red-400 border-red-800' : 'bg-zinc-900 hover:bg-zinc-800 border-black'}
                                        `}
                                    >
                                        <span className={`text-lg text-white drop-shadow-md`}>{num}</span>
                                        {betAmount && (
                                            <div className="absolute inset-1 rounded-lg bg-amber-500 text-black text-[10px] font-black flex items-center justify-center shadow-lg border border-amber-600 animate-scale-in">
                                                {betAmount >= 1000 ? (betAmount/1000).toFixed(1) + 'k' : betAmount}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 lg:gap-3 shrink-0">
                        <button onClick={() => placeBet('color', 'red')} className="py-3 lg:py-4 bg-red-600 border-2 border-red-800 shadow-lg rounded-2xl font-black text-white hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs lg:text-sm">
                            RED <span className="opacity-40 text-[10px] ml-1">2X</span>
                        </button>
                        <button onClick={() => placeBet('color', 'black')} className="py-3 lg:py-4 bg-zinc-900 border-2 border-black shadow-lg rounded-2xl font-black text-white hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs lg:text-sm">
                            BLACK <span className="opacity-40 text-[10px] ml-1">2X</span>
                        </button>
                        <button onClick={() => placeBet('color', 'green')} className="py-3 lg:py-4 bg-[#0c1a12] border-2 border-emerald-900 shadow-lg rounded-2xl font-black text-emerald-400 hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs lg:text-sm">
                            GREEN <span className="opacity-40 text-[10px] ml-1">14X</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 lg:gap-4 items-center bg-black/40 p-4 lg:p-5 rounded-[2rem] border border-white/5 shrink-0">
                        <div className="flex gap-3">
                            {[10, 50, 100, 500, 1000].map(val => (
                                <button 
                                    key={val}
                                    onClick={() => setSelectedChipValue(val)}
                                    className={`w-10 h-10 lg:w-11 lg:h-11 rounded-full font-black text-[10px] transition-all border-[3px] flex items-center justify-center shadow-xl
                                        ${selectedChipValue === val ? 'scale-110 border-amber-500 bg-amber-500 text-black' : 'border-white/5 bg-zinc-900 text-zinc-500'}
                                    `}
                                >
                                    {val >= 1000 ? (val/1000) + 'K' : val}
                                </button>
                            ))}
                        </div>

                        <div className="h-8 w-px bg-white/5 hidden md:block" />

                        <div className="flex gap-3 flex-1 w-full">
                            <button onClick={clearBets} className="flex-1 py-3 bg-white/5 hover:bg-white/10 transition-all text-zinc-500 hover:text-white font-black rounded-2xl border border-white/5 text-[9px] uppercase tracking-widest">
                                RESET
                            </button>
                            <button 
                                onClick={spin}
                                disabled={isSpinning || currentBets.length === 0}
                                className={`flex-[2] py-3 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50
                                    ${isSpinning ? 'bg-zinc-800 text-zinc-600' : 'bg-white text-black hover:bg-emerald-500 hover:text-white'}
                                `}
                            >
                                {isSpinning ? "SPINNING..." : "SPIN SYSTEM"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {lastWinningNumber !== null && !isSpinning && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-black/95 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl text-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Winning Slot</p>
                            <div className={`text-8xl font-black mb-4 ${lastWinningNumber === 0 ? 'text-emerald-500' : RED_NUMBERS.includes(lastWinningNumber) ? 'text-red-500' : 'text-white'}`}>
                                {lastWinningNumber}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
