"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
    user_id: string;
    username: string;
    avatar: string | null;
    total: number;
}

    type LeaderboardType = 'wealth' | 'exp';
    
    const formatValue = (val: number, isWealth: boolean) => {
        if (!isWealth) return `${val.toLocaleString()} XP`;
        if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
        if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        return `$${val.toLocaleString()}`;
    };

    export default function Leaderboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<LeaderboardType>('wealth');

    useEffect(() => {
        setLoading(true);
        const typeParam = activeTab === 'wealth' ? 'balance' : 'xp';
        fetch(`/api/leaderboard?type=${typeParam}`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    setError(data.error || "Failed to fetch data");
                }
                setLoading(false);
            })
            .catch(() => {
                setError("Network Error");
                setLoading(false);
            });
    }, [activeTab]);

    const isWealth = activeTab === 'wealth';

    return (
        <main className={`min-h-screen bg-[#030305] text-white pt-28 pb-16 px-4 md:px-8 relative overflow-hidden transition-colors duration-1000`}>
            {/* Dynamic Background elements */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${isWealth ? 'bg-amber-500/10' : 'bg-indigo-500/10'}`} />
            <div className={`absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${isWealth ? 'bg-fuchsia-600/10' : 'bg-blue-600/10'}`} />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-up">
                    <div className={`inline-flex items-center justify-center p-3 glass-card rounded-2xl mb-6 shadow-2xl transition-all duration-500 ${isWealth ? 'shadow-amber-500/20 bg-amber-500/5' : 'shadow-indigo-500/20 bg-indigo-500/5'}`}>
                        <span className={`text-4xl animate-bounce`}>{isWealth ? '💰' : '⚡'}</span>
                    </div>

                    <div className="h-20 md:h-24 overflow-hidden relative mb-4">
                        <div className={`transition-all duration-700 transform ${isWealth ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'} absolute inset-0`}>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500">
                                    Hall of Wealth
                                </span>
                            </h1>
                        </div>
                        <div className={`transition-all duration-700 transform ${!isWealth ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} absolute inset-0`}>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-400 to-fuchsia-500">
                                    Hall of EXP
                                </span>
                            </h1>
                        </div>
                    </div>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto h-8">
                        {isWealth ? "The definitive ranking of the elite. Top 10 richest individuals globally." : "The global power grid. Top 10 most experienced individuals."}
                    </p>
                </div>

                {/* Creative Switcher */}
                <div className="flex justify-center mb-16 animate-fade-up" style={{ animationDelay: '100ms' }}>
                    <div className="glass-card p-1.5 rounded-2xl border border-white/5 flex gap-2 w-full max-w-md relative group">
                        <div
                            className={`absolute inset-y-1.5 transition-all duration-500 ease-out rounded-xl shadow-lg w-[calc(50%-6px)] ${isWealth ? 'left-1.5 bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/20' : 'left-[calc(50%+3px)] bg-gradient-to-r from-indigo-500 to-fuchsia-600 shadow-indigo-500/20'}`}
                        />
                        <button
                            onClick={() => setActiveTab('wealth')}
                            className={`flex-1 py-4 px-6 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-colors relative z-10 ${isWealth ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Hall of Wealth
                        </button>
                        <button
                            onClick={() => setActiveTab('exp')}
                            className={`flex-1 py-4 px-6 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-colors relative z-10 ${!isWealth ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Hall of EXP
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-6 transition-colors duration-500 ${isWealth ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]'}`}></div>
                        <p className="text-gray-400 font-bold text-xl tracking-widest uppercase animate-pulse">Loading Data...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 glass-card rounded-3xl border border-red-500/30">
                        <div className="text-5xl mb-4">🖥️</div>
                        <p className="text-red-400 font-bold text-xl uppercase tracking-widest">{error}</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl">
                        <div className="text-5xl mb-4">👻</div>
                        <p className="text-gray-400 font-bold text-xl">The leaderboard is empty.</p>
                    </div>
                ) : (
                    <div className="animate-fade-up" key={activeTab} style={{ animationDelay: '200ms' }}>

                        {/* THE PODIUM (Top 3) */}
                        <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mb-16 px-4">
                            {/* Rank 2 - Silver */}
                            {users[1] && (
                                <div className="w-full md:w-1/3 flex flex-col items-center group md:order-1 order-2">
                                    <div className="relative mb-4">
                                        <div className={`absolute inset-0 blur-xl rounded-full scale-110 group-hover:scale-150 transition-all duration-700 ${isWealth ? 'bg-slate-400/20' : 'bg-blue-400/20'}`} />
                                        <div className={`w-24 h-24 rounded-full border-[6px] overflow-hidden relative z-10 bg-[#0d0d14] transition-all duration-500 ${isWealth ? 'border-slate-300/80 shadow-[0_0_20px_rgba(148,163,184,0.5)]' : 'border-blue-400/80 shadow-[0_0_20px_rgba(96,165,250,0.5)]'}`}>
                                            <img src={users[1].avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="Rank 2" className="w-full h-full object-cover" />
                                        </div>
                                        <div className={`absolute -top-3 -right-3 w-8 h-8 font-black rounded-full flex items-center justify-center z-20 shadow-lg border-2 text-lg transition-colors duration-500 ${isWealth ? 'bg-slate-200 text-slate-800 border-slate-400' : 'bg-blue-200 text-blue-800 border-blue-400'}`}>2</div>
                                    </div>
                                    <div className="w-full relative">
                                        <div className={`absolute inset-x-0 -bottom-8 h-full blur-xl pointer-events-none transition-colors duration-1000 ${isWealth ? 'bg-gradient-to-t from-slate-500/10 to-transparent' : 'bg-gradient-to-t from-blue-500/10 to-transparent'}`} />
                                        <div className={`glass-card rounded-t-3xl rounded-b-xl p-6 text-center border-t-4 shadow-2xl relative z-10 group-hover:-translate-y-2 transition-all duration-300 ${isWealth ? 'bg-gradient-to-b from-slate-400/10 to-transparent border-slate-400/30 border-t-slate-400' : 'bg-gradient-to-b from-blue-400/10 to-transparent border-blue-400/30 border-t-blue-400'}`}>
                                            <h3 className="font-bold text-xl text-white truncate w-full mb-2">{users[1].username}</h3>
                                            <p className={`text-2xl font-black ${isWealth ? 'text-slate-300' : 'text-blue-300'}`}>
                                                {formatValue(users[1].total, isWealth)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rank 1 - Gold / Electric */}
                            {users[0] && (activeTab === 'wealth' || activeTab === 'exp') && (
                                <div className="w-full md:w-[40%] flex flex-col items-center group md:order-2 order-1 md:-translate-y-8 z-20">
                                    <div className="relative mb-6">
                                        <div className={`absolute inset-0 blur-2xl rounded-full scale-125 group-hover:scale-150 transition-all duration-700 ${isWealth ? 'bg-amber-500/40' : 'bg-indigo-500/40'}`} />
                                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 text-5xl animate-bounce z-30 transition-all duration-500 ${isWealth ? 'drop-shadow-[0_0_15px_rgba(245,158,11,1)]' : 'drop-shadow-[0_0_15px_rgba(99,102,241,1)]'}`}>
                                            {isWealth ? '👑' : '⚡'}
                                        </div>
                                        <div className={`w-32 h-32 rounded-full border-[6px] overflow-hidden relative z-10 bg-[#0d0d14] transition-all duration-500 ${isWealth ? 'border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)]' : 'border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.6)]'}`}>
                                            <img src={users[0].avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="Rank 1" className="w-full h-full object-cover" />
                                        </div>
                                        <div className={`absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 text-black font-black uppercase tracking-widest rounded-full z-20 shadow-2xl text-sm md:text-base border transition-all duration-500 ${isWealth ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 border-amber-200 shadow-amber-500/60' : 'bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-600 border-indigo-200 shadow-indigo-500/60'}`}>
                                            {isWealth ? 'Champion' : 'Elite'}
                                        </div>
                                    </div>
                                    <div className="w-full relative mt-2 md:mt-0">
                                        <div className={`absolute inset-x-0 -bottom-8 h-full blur-xl pointer-events-none transition-colors duration-1000 ${isWealth ? 'bg-gradient-to-t from-amber-500/20 to-transparent' : 'bg-gradient-to-t from-indigo-500/20 to-transparent'}`} />
                                        <div className={`glass-card rounded-t-3xl rounded-b-xl p-8 text-center border-t-4 shadow-2xl relative z-10 group-hover:-translate-y-3 transition-all duration-300 ${isWealth ? 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 border-amber-400/40 border-t-amber-400' : 'bg-gradient-to-b from-indigo-500/15 to-indigo-500/5 border-indigo-400/40 border-t-indigo-400'}`}>
                                            <h3 className="font-black text-2xl md:text-3xl text-white truncate w-full mb-3">{users[0].username}</h3>
                                            <p className={`text-3xl md:text-4xl font-black text-transparent bg-clip-text transition-all duration-500 ${isWealth ? 'bg-gradient-to-b from-amber-200 to-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]' : 'bg-gradient-to-b from-indigo-200 to-indigo-500 drop-shadow-[0_2px_10px_rgba(99,102,241,0.5)]'}`}>
                                                {formatValue(users[0].total, isWealth)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rank 3 - Bronze / Fuchsia */}
                            {users[2] && (
                                <div className="w-full md:w-1/3 flex flex-col items-center group md:order-3 order-3">
                                    <div className="relative mb-4">
                                        <div className={`absolute inset-0 blur-xl rounded-full scale-110 group-hover:scale-150 transition-all duration-700 ${isWealth ? 'bg-orange-600/20' : 'bg-fuchsia-600/20'}`} />
                                        <div className={`w-24 h-24 rounded-full border-[6px] overflow-hidden relative z-10 bg-[#0d0d14] transition-all duration-500 ${isWealth ? 'border-orange-500/80 shadow-[0_0_20px_rgba(234,88,12,0.5)]' : 'border-fuchsia-500/80 shadow-[0_0_20px_rgba(217,70,239,0.5)]'}`}>
                                            <img src={users[2].avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="Rank 3" className="w-full h-full object-cover" />
                                        </div>
                                        <div className={`absolute -top-3 -left-3 w-8 h-8 font-black rounded-full flex items-center justify-center z-20 shadow-lg border-2 text-lg transition-colors duration-500 ${isWealth ? 'bg-orange-300 text-orange-900 border-orange-500' : 'bg-fuchsia-300 text-fuchsia-900 border-fuchsia-500'}`}>3</div>
                                    </div>
                                    <div className="w-full relative">
                                        <div className={`absolute inset-x-0 -bottom-8 h-full blur-xl pointer-events-none transition-colors duration-1000 ${isWealth ? 'bg-gradient-to-t from-orange-500/10 to-transparent' : 'bg-gradient-to-t from-fuchsia-500/10 to-transparent'}`} />
                                        <div className={`glass-card rounded-t-3xl rounded-b-xl p-6 text-center border-t-4 shadow-2xl relative z-10 group-hover:-translate-y-2 transition-all duration-300 ${isWealth ? 'bg-gradient-to-b from-orange-600/10 to-transparent border-orange-500/30 border-t-orange-500' : 'bg-gradient-to-b from-fuchsia-600/10 to-transparent border-fuchsia-500/30 border-t-fuchsia-500'}`}>
                                            <h3 className="font-bold text-xl text-white truncate w-full mb-2">{users[2].username}</h3>
                                            <p className={`text-2xl font-black ${isWealth ? 'text-orange-400' : 'text-fuchsia-400'}`}>
                                                {formatValue(users[2].total, isWealth)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rank 4 - 10 */}
                        {users.length > 3 && (
                            <div className="space-y-3 glass-card bg-black/40 p-4 md:p-8 rounded-[2.5rem]">
                                {users.slice(3).map((user, index) => {
                                    const rank = index + 4;
                                    return (
                                        <div
                                            key={user.user_id}
                                            className={`flex items-center gap-4 md:gap-6 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] transition-all duration-300 group ${isWealth ? 'hover:border-amber-500/30' : 'hover:border-indigo-500/30'}`}
                                        >
                                            <div className={`w-12 text-center text-xl font-black text-gray-500 transition-colors ${isWealth ? 'group-hover:text-amber-400' : 'group-hover:text-indigo-400'}`}>
                                                #{rank}
                                            </div>
                                            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white/10 transition-colors flex-shrink-0 ${isWealth ? 'group-hover:border-amber-400/50' : 'group-hover:border-indigo-400/50'}`}>
                                                <img src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt={user.username} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-lg md:text-xl text-white truncate transition-all group-hover:text-transparent group-hover:bg-clip-text ${isWealth ? 'group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-orange-400' : 'group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-fuchsia-400'}`}>
                                                    {user.username}
                                                </h4>
                                            </div>
                                            <div className={`text-xl md:text-2xl font-black text-white transition-colors ${isWealth ? 'group-hover:text-emerald-400' : 'group-hover:text-indigo-400'}`}>
                                                {formatValue(user.total, isWealth)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Back Button */}
                <div className="mt-16 justify-center flex animate-fade-up" style={{ animationDelay: '400ms' }}>
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-3 px-8 py-4 glass-card hover:bg-white/10 text-white font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/10"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Headquarters
                    </Link>
                </div>
            </div>
        </main>
    );
}
