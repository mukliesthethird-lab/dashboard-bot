"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loading from "@/components/Loading";

interface User { user_id: string; username: string; avatar: string | null; total: number; }

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
                if (Array.isArray(data)) setUsers(data);
                else setError(data.error || "Failed to fetch data");
                setLoading(false);
            })
            .catch(() => { setError("Network Error"); setLoading(false); });
    }, [activeTab]);

    const isWealth = activeTab === 'wealth';

    const medalColors = [
        { border: 'border-amber-400', text: 'text-amber-400', bg: 'bg-amber-400', shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]' },
        { border: 'border-slate-300', text: 'text-slate-300', bg: 'bg-slate-300', shadow: 'shadow-[0_0_15px_rgba(203,213,225,0.2)]' },
        { border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-500', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
    ];

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:px-8 relative">
            <div className="relative z-10 max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-up">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                        <span className="gradient-text">{isWealth ? 'Hall of Wealth' : 'Hall of EXP'}</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {isWealth ? "Top 10 richest individuals globally." : "Top 10 most experienced individuals globally."}
                    </p>
                </div>

                {/* Switcher */}
                <div className="flex justify-center mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-1 rounded-lg flex gap-1 w-full max-w-xs">
                        <button
                            onClick={() => setActiveTab('wealth')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${isWealth ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
                        >
                            💰 Wealth
                        </button>
                        <button
                            onClick={() => setActiveTab('exp')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${!isWealth ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
                        >
                            ⚡ EXP
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loading message="Loading Data..." /></div>
                ) : error ? (
                    <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--error-muted)]">
                        <p className="text-[var(--error)] font-semibold">{error}</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                        <div className="text-4xl mb-3">👻</div>
                        <p className="text-[var(--text-secondary)] font-medium">The leaderboard is empty.</p>
                    </div>
                ) : (
                    <div className="animate-fade-up space-y-2" key={activeTab} style={{ animationDelay: '160ms' }}>

                        {/* Podium (Top 3) */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 0, 2].map((idx) => {
                                const user = users[idx];
                                if (!user) return <div key={idx} />;
                                const rank = idx + 1;
                                const medal = medalColors[idx];
                                const isFirst = idx === 0;

                                return (
                                    <div key={user.user_id} className={`flex flex-col items-center p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-center ${isFirst ? 'md:-translate-y-3' : ''}`}>
                                        <div className="relative mb-3">
                                            <img
                                                src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                alt={user.username}
                                                className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 ${medal.border} object-cover`}
                                            />
                                            <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-lg ${medal.bg} text-[#000000] text-[13px] font-black flex items-center justify-center border-2 ${medal.border} ${medal.shadow} z-20`}>
                                                {rank}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-sm text-white truncate w-full mb-1">{user.username}</h3>
                                        <p className={`text-sm font-bold ${medal.text}`}>{formatValue(user.total, isWealth)}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Rank 4-10 */}
                        {users.length > 3 && (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
                                {users.slice(3).map((user, index) => {
                                    const rank = index + 4;
                                    return (
                                        <div
                                            key={user.user_id}
                                            className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border)] last:border-b-0"
                                        >
                                            <div className="w-8 text-center text-sm font-bold text-[var(--text-tertiary)]">#{rank}</div>
                                            <img
                                                src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                alt={user.username}
                                                className="w-9 h-9 rounded-lg border border-[var(--border)] object-cover"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm text-white truncate">{user.username}</h4>
                                            </div>
                                            <div className="text-sm font-semibold text-white tabular-nums">
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
                <div className="mt-10 flex justify-center animate-fade-up" style={{ animationDelay: '320ms' }}>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-hover)] font-medium text-sm rounded-lg transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
