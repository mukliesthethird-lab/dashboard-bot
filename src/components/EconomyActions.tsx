"use client";

import { useState, useEffect, useRef } from "react";
import CatLoader from "./CatLoader";
import ToastContainer, { useToast } from "./Toast";

interface User {
    user_id: string;
    username: string;
    avatar: string | null;
    balance: number;
}

interface EconomyStats {
    totalUsers: number;
    totalBalance: number;
    topUsers: User[];
}

interface EconomyActionsProps {
    guildId: string;
}

const defaultAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";

const formatCurrency = (amount: number) => {
    if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    return `$${amount.toLocaleString()}`;
};

export default function EconomyActions({ guildId }: EconomyActionsProps) {
    const [stats, setStats] = useState<EconomyStats>({ totalUsers: 0, totalBalance: 0, topUsers: [] });
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showMarketInsights, setShowMarketInsights] = useState(false);
    const [showEconomyConfig, setShowEconomyConfig] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const { toast, hideToast } = useToast();

    // Leaderboard search and pagination
    const [leaderboardSearch, setLeaderboardSearch] = useState("");
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const leaderboardPerPage = 10;

    const filteredLeaderboard = stats.topUsers.filter(user =>
        user.username.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
        user.user_id.includes(leaderboardSearch)
    );
    const totalLeaderboardPages = Math.ceil(filteredLeaderboard.length / leaderboardPerPage);
    const paginatedLeaderboard = filteredLeaderboard.slice(
        (leaderboardPage - 1) * leaderboardPerPage,
        leaderboardPage * leaderboardPerPage
    );

    const fetchStats = () => {
        setLoading(true);
        fetch('/api/economy?action=stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const closeModal = () => {
        setShowMarketInsights(false);
        setShowEconomyConfig(false);
        setShowLeaderboard(false);
        setLeaderboardSearch("");
        setLeaderboardPage(1);
    };

    if (loading) {
        return <CatLoader message="Loading economy data..." />;
    }

    const averageBalance = stats.totalUsers > 0 ? Math.round(stats.totalBalance / stats.totalUsers) : 0;

    return (
        <>
            {/* Stats Grid - Dark Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 mt-4">
                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg text-gray-400">👥</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Total Players</h3>
                    </div>
                    <div className="text-3xl font-bold text-gray-200">
                        {loading ? "..." : stats.totalUsers.toLocaleString()}
                    </div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg text-[#f0b232]">💵</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Total Economy</h3>
                    </div>
                    <div className="text-3xl font-bold text-gray-200">{loading ? "..." : formatCurrency(stats?.totalBalance ?? 0)}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-xl text-[#f0b232]">👑</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Richest Player</h3>
                    </div>
                    <div className="text-3xl font-bold text-[#f0b232]">
                        ${loading ? "..." : (stats.topUsers[0]?.balance || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Quick Actions - Dark Theme */}
            <div className="glass-card rounded-[8px] p-6 mb-4 border border-white/10">
                <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="text-[#f0b232]">⚡</span> Economy Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => setShowMarketInsights(true)}
                        className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#da373c]">📈</div>
                        <div className="font-semibold text-gray-200 text-sm">Market Insights</div>
                    </button>
                    <button
                        onClick={() => setShowEconomyConfig(true)}
                        className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">⚙️</div>
                        <div className="font-semibold text-gray-200 text-sm">Economy Config</div>
                    </button>
                    <button
                        onClick={() => { setShowLeaderboard(true); fetchStats(); }}
                        className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28 md:col-span-1 col-span-2"
                    >
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📊</div>
                        <div className="font-semibold text-gray-200 text-sm">Leaderboard</div>
                    </button>
                </div>
            </div>

            {/* Market Insights Modal */}
            {showMarketInsights && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">📈 Market Insights</h2>
                            <p className="text-gray-400 mt-1 text-sm">Wealth analysis across the system</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-black/20 rounded-[4px] border border-white/5">
                                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-1">Average Balance</div>
                                <div className="text-xl font-bold text-[#f0b232]">${averageBalance.toLocaleString()}</div>
                            </div>
                            <div className="p-4 bg-black/20 rounded-[4px] border border-white/5">
                                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-1">Wealth Concentration</div>
                                <div className="text-sm text-gray-300">
                                    The top 10 richest players hold <span className="font-bold text-amber-400">
                                        {formatCurrency(stats.topUsers.slice(0, 10).reduce((acc, u) => acc + Number(u.balance), 0))}
                                    </span>, roughly <span className="font-bold text-amber-400">
                                        {((stats.topUsers.slice(0, 10).reduce((acc, u) => acc + Number(u.balance), 0) / (stats.totalBalance || 1)) * 100).toFixed(1)}%
                                    </span> of the total economy.
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Economy Config Modal */}
            {showEconomyConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">⚙️ Economy Config</h2>
                            <p className="text-gray-400 mt-1 text-sm">Passive income & limit rates</p>
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: "Work Cooldown", value: "30 Minutes", icon: "⏰" },
                                { label: "Average Work Pay", value: "$200 - $800", icon: "⚒️" },
                                { label: "Daily Reward", value: "$2,000", icon: "📅" },
                                { label: "Interest Rate", value: "2.5% / Week", icon: "📈" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-[4px] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="text-gray-300 font-medium text-sm">{item.label}</span>
                                    </div>
                                    <span className="text-[#f0b232] font-bold text-sm">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition z-10">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-2">
                                <span className="text-[#f0b232]">📊</span> Top Players
                            </h2>
                        </div>

                        {/* Search Input */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={leaderboardSearch}
                                onChange={(e) => setLeaderboardSearch(e.target.value)}
                                placeholder="🔍 Search by username..."
                                className="w-full px-3 py-2 rounded-[3px] bg-black/20 text-gray-200 placeholder-[#87898c] focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-medium text-sm"
                            />
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-2 custom-scrollbar">
                            {filteredLeaderboard.length > 0 ? (
                                paginatedLeaderboard.map((user, index) => {
                                    const realIndex = (leaderboardPage - 1) * leaderboardPerPage + index;
                                    return (
                                        <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-[4px] border ${realIndex === 0 ? 'bg-[#f0b232]/10 border-[#f0b232]/30' : realIndex === 1 ? 'bg-[#b5bac1]/10 border-[#b5bac1]/20' : realIndex === 2 ? 'bg-[#f0b232]/5 border-[#f0b232]/10' : 'glass-card border-transparent'}`}>
                                            <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center font-bold text-sm shrink-0 text-gray-200">
                                                {realIndex === 0 ? "👑" : realIndex === 1 ? "🥈" : realIndex === 2 ? "🥉" : `#${realIndex + 1}`}
                                            </div>
                                            <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-200 truncate text-sm">@{user.username}</div>
                                                <div className="text-[11px] text-[#87898c]">{user.user_id}</div>
                                            </div>
                                            <div className="font-bold text-[#f0b232] shrink-0 text-sm">${user.balance.toLocaleString()}</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-[#87898c]">
                                    {leaderboardSearch ? "No users match your search" : "No players yet"}
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {filteredLeaderboard.length > leaderboardPerPage && (
                            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                                <button
                                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                                    disabled={leaderboardPage === 1}
                                    className="px-3 py-1.5 rounded-[3px] bg-white/10 hover:bg-white/20 text-white font-medium text-xs disabled:opacity-50 transition"
                                >
                                    ← Prev
                                </button>
                                <span className="text-[#87898c] text-xs font-semibold">
                                    Page {leaderboardPage} of {totalLeaderboardPages}
                                </span>
                                <button
                                    onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                                    disabled={leaderboardPage === totalLeaderboardPages}
                                    className="px-3 py-1.5 rounded-[3px] bg-white/10 hover:bg-white/20 text-white font-medium text-xs disabled:opacity-50 transition"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info Card - Dark Theme */}
            <div className="glass-card rounded-[8px] p-6 border border-white/10">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-200 mb-1">Economy System</h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                            The economy system is <strong className="text-[#f0b232] font-semibold">global</strong> across all servers.
                            Wealth distribution and activity are monitored to ensure balanced gameplay for everyone.
                        </p>
                    </div>
                </div>
            </div>
            {/* Toast Container */}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}


