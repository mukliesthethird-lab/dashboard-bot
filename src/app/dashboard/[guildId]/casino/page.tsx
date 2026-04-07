"use client";

import { useState, useEffect, useRef } from "react";
import Toast from "@/components/Toast";

export default function CasinoCrashPage() {
    const [balance, setBalance] = useState(0);
    const [bet, setBet] = useState(10);
    const [target, setTarget] = useState(2.00);
    const [playing, setPlaying] = useState(false);
    
    // Animation states
    const [multiplier, setMultiplier] = useState(1.00);
    const [crashed, setCrashed] = useState(false);
    const [wonData, setWonData] = useState<{ amount: number, won: boolean } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const animFrameRef = useRef<number | null>(null);

    // Initial load balance (borrowed from market API or we could duplicate a quick fetch)
    useEffect(() => {
        fetch("/api/market?action=assets")
            .then(res => res.json())
            .then(data => { if (data.balance) setBalance(data.balance); })
            .catch(() => {});
    }, []);

    const playCrash = async () => {
        if (bet < 10) return setToast({ message: "Minimal bet 10 koin", type: "error" });
        if (target <= 1.0) return setToast({ message: "Target Auto-Cashout harus > 1.00", type: "error" });
        if (balance < bet) return setToast({ message: "Saldo tidak cukup!", type: "error" });

        setPlaying(true);
        setCrashed(false);
        setWonData(null);
        setMultiplier(1.00);

        try {
            const res = await fetch("/api/casino", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game: 'crash', bet, target })
            });
            const data = await res.json();

            if (!res.ok) {
                setPlaying(false);
                return setToast({ message: data.error, type: "error" });
            }

            // Immediately deduct balance visually for better UX
            setBalance(d => d - bet);

            const { crashPoint, won, winnings, newBalance } = data;

            // Animate multiplier going up
            let currentMult = 1.00;
            // The speed curve: exponential growth
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000; // seconds
                // Formula for exponential growth
                currentMult = Math.min(1.00 + Math.pow(elapsed, 1.8), crashPoint);
                
                setMultiplier(currentMult);

                if (currentMult >= crashPoint) {
                    // Game Over / Real Crash Point reached
                    setCrashed(true);
                    setPlaying(false);
                    setWonData({ amount: winnings, won });
                    setBalance(newBalance);
                } else {
                    animFrameRef.current = requestAnimationFrame(animate);
                }
            };

            animFrameRef.current = requestAnimationFrame(animate);

        } catch (e: any) {
            setPlaying(false);
            setToast({ message: "Terjadi kesalahan koneksi", type: "error" });
        }
    };

    // Cleanup animation
    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    return (
        <div className="space-y-6 pt-16 lg:pt-0 max-w-5xl mx-auto px-4 pb-20">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white">Live Casino 🎰</h1>
                    <p className="text-gray-400 mt-2">Bermain Crash Game auto-cashout secara real-time.</p>
                </div>
                <div className="flex items-center gap-3 bg-[#05050a]/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <span className="text-xl">💰</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Saldo Koin</p>
                        <p className="text-2xl font-black text-white">{balance.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Control Panel */}
                <div className="bg-[#05050a]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-6 h-fit">
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Pasang Taruhan</h2>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Jumlah Taruhan (Koin)</label>
                        <input 
                            type="number" 
                            min="10"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                            value={bet}
                            onChange={(e) => setBet(parseInt(e.target.value) || 0)}
                            disabled={playing}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Auto Cash-Out (Target)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                min="1.01"
                                step="0.01"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors"
                                value={target}
                                onChange={(e) => setTarget(parseFloat(e.target.value) || 1.0)}
                                disabled={playing}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">X</span>
                        </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Potensi Menang</span>
                            <span className="text-emerald-400 font-bold">{(bet * target).toLocaleString()} Koin</span>
                        </div>
                    </div>

                    <button 
                        onClick={playCrash}
                        disabled={playing}
                        className={`w-full font-black py-4 rounded-xl transition-all active:scale-95 text-lg
                            ${playing 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02]'
                            }
                        `}
                    >
                        {playing ? 'MENUNGGU CRASH...' : 'PASANG TARUHAN (PLAY)'}
                    </button>
                    
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Sistem berjalan secara server-side layaknya kasino asli. Manipulasi klien tidak dimungkinkan.
                    </p>
                </div>

                {/* Crash Canvas Display */}
                <div className="lg:col-span-2 relative bg-gradient-to-b from-[#0a0a0f] to-[#05050a]/80 border border-white/10 rounded-3xl overflow-hidden min-h-[400px] flex items-center justify-center p-6 shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl">
                        <div className={`w-40 h-40 rounded-full ${crashed && !wonData?.won ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    </div>

                    <div className={`text-center relative z-10 transition-transform duration-300 ${playing ? 'scale-110' : 'scale-100'}`}>
                        {/* Status Messages above multiplier */}
                        {wonData?.won && crashed ? (
                            <div className="mb-4 inline-block px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-black animate-pulse">
                                KAMU CASH OUt DI {target.toFixed(2)}x !
                            </div>
                        ) : null}

                        <h2 
                            className={`text-[120px] md:text-[150px] font-black tracking-tighter leading-none
                            ${(crashed && !wonData?.won) ? 'text-rose-500' : (wonData?.won && crashed ? 'text-emerald-400' : 'text-white')}
                            drop-shadow-2xl font-mono`}
                        >
                            {multiplier.toFixed(2)}<span className="text-4xl md:text-6xl text-gray-400">x</span>
                        </h2>

                        {/* Status Message below multiplier */}
                        {crashed ? (
                            <h3 className={`text-3xl font-bold mt-4 animate-bounce ${wonData?.won ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {wonData?.won ? `+${wonData?.amount.toLocaleString()} KOIN 🤑` : `CRASHED! 💥`}
                            </h3>
                        ) : playing ? (
                            <div className="mt-8 flex justify-center gap-2">
                                <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                                <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping delay-75"></div>
                                <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping delay-150"></div>
                            </div>
                        ) : (
                            <h3 className="text-xl font-bold mt-4 text-gray-500">Mulai permainan untuk meluncurkan grafik</h3>
                        )}
                    </div>

                    {/* Faux graph trail line behind the number */}
                    {playing && (
                         <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20 pointer-events-none overflow-hidden">
                             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path 
                                    d={`M 0 100 Q 50 ${100 - (multiplier * 2)} 100 ${100 - (multiplier * 5)}`} 
                                    fill="none" 
                                    stroke="url(#gradient)" 
                                    strokeWidth="2"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#3498db" stopOpacity="0" />
                                        <stop offset="100%" stopColor="#2ecc71" stopOpacity="1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
}
