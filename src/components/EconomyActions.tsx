"use client";

import { useState, useEffect, useRef } from "react";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";

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

export default function EconomyActions({ guildId }: EconomyActionsProps) {
    const [stats, setStats] = useState<EconomyStats>({ totalUsers: 0, totalBalance: 0, topUsers: [] });
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showGiveMoney, setShowGiveMoney] = useState(false);
    const [showResetUser, setShowResetUser] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // User search/select
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searching, setSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [amount, setAmount] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Confirmation state
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<string>("");
    const [confirmMessage, setConfirmMessage] = useState<string>("");
    const [isDestructive, setIsDestructive] = useState(false);

    // Leaderboard search and pagination
    const [leaderboardSearch, setLeaderboardSearch] = useState("");
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const leaderboardPerPage = 10;

    // Computed: filtered and paginated leaderboard
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

    // Search users when typing
    useEffect(() => {
        if (searchQuery.length >= 3) {
            setSearching(true);
            const timer = setTimeout(() => {
                fetch(`/api/economy?action=search&user_id=${searchQuery}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setSearchResults(data);
                        }
                        setSearching(false);
                    })
                    .catch(() => setSearching(false));
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleGiveMoney = async () => {
        if (!selectedUser || !amount) return;
        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/economy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'give',
                    user_id: selectedUser.user_id,
                    amount: parseInt(amount),
                    guild_id: guildId
                })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: `Successfully gave $${amount} to @${selectedUser.username}!` });
                setSelectedUser(null);
                setAmount("");
                fetchStats();
            } else {
                setMessage({ type: "error", text: data.error || "Failed to give money" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSubmitting(false);
    };

    const handleResetUser = async () => {
        if (!selectedUser) return;
        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/economy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset',
                    user_id: selectedUser.user_id,
                    guild_id: guildId
                })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: `Reset @${selectedUser.username}'s balance!` });
                setSelectedUser(null);
                fetchStats();
                setShowResetUser(false);
            } else {
                setMessage({ type: "error", text: data.error || "Failed to reset user" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSubmitting(false);
    };

    // Confirmation functions
    const askConfirm = (action: string, message: string, destructive: boolean = false) => {
        setConfirmAction(action);
        setConfirmMessage(message);
        setIsDestructive(destructive);
        setShowConfirm(true);
    };

    const executeConfirmedAction = async () => {
        switch (confirmAction) {
            case 'give': await handleGiveMoney(); break;
            case 'reset': await handleResetUser(); break;
        }
    };

    const closeModal = () => {
        setShowGiveMoney(false);
        setShowResetUser(false);
        setShowLeaderboard(false);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        setAmount("");
        setLeaderboardSearch("");
        setLeaderboardPage(1);
    };

    if (loading) {
        return <CatLoader message="Loading economy data..." />;
    }

    return (
        <>
            {/* Stats Grid - Dark Theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-card rounded-2xl p-6">
                    <div className="text-4xl mb-3">👥</div>
                    <div className="text-3xl font-black text-white">
                        {loading ? "..." : stats.totalUsers.toLocaleString()}
                    </div>
                    <div className="text-amber-400 font-bold text-sm">Total Players</div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                    <div className="text-4xl mb-3">💵</div>
                    <div className="text-3xl font-black text-white">
                        ${loading ? "..." : stats.totalBalance.toLocaleString()}
                    </div>
                    <div className="text-amber-400 font-bold text-sm">Total Economy</div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                    <div className="text-4xl mb-3">👑</div>
                    <div className="text-3xl font-black text-white">
                        ${loading ? "..." : (stats.topUsers[0]?.balance || 0).toLocaleString()}
                    </div>
                    <div className="text-amber-400 font-bold text-sm">Richest Player</div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                    {message.type === "success" ? "✅" : "❌"} {message.text}
                </div>
            )}

            {/* Quick Actions - Dark Theme */}
            <div className="glass-card rounded-3xl p-6 mb-8">
                <h2 className="text-xl font-black text-white mb-4">⚡ Economy Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => { setShowGiveMoney(true); setMessage(null); }}
                        className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">💸</div>
                        <div className="font-bold text-white text-sm">Give Money</div>
                    </button>
                    <button
                        onClick={() => { setShowResetUser(true); setMessage(null); }}
                        className="p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">🗑️</div>
                        <div className="font-bold text-white text-sm">Reset User</div>
                    </button>
                    <button
                        onClick={() => { setShowLeaderboard(true); fetchStats(); }}
                        className="p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">📊</div>
                        <div className="font-bold text-white text-sm">Leaderboard</div>
                    </button>
                </div>
            </div>

            {/* Give Money Modal - Dark Theme */}
            {showGiveMoney && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-[#16161f] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">💸</div>
                            <h2 className="text-2xl font-black text-white">Give Money</h2>
                            <p className="text-gray-400 text-sm">Add money to a user's balance</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Select User</label>
                                {selectedUser ? (
                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                        <div className="flex-1">
                                            <div className="font-bold text-white">@{selectedUser.username}</div>
                                            <div className="text-xs text-gray-400">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-400 text-xl">✕</button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by User ID (min 3 chars)..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none font-medium text-white"
                                            autoFocus
                                        />
                                        {searching && <div className="absolute right-3 top-3 text-amber-400">⏳</div>}
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-[#16161f] rounded-xl border border-white/10 shadow-xl max-h-60 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.user_id}
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition text-left"
                                                    >
                                                        <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-white">@{user.username}</div>
                                                            <div className="text-xs text-gray-500">{user.user_id}</div>
                                                        </div>
                                                        <div className="font-bold text-amber-400">${user.balance.toLocaleString()}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    min="1"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none font-medium text-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition border border-white/10">Cancel</button>
                            <button onClick={() => askConfirm('give', `Berikan $${amount} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser || !amount} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition disabled:opacity-50">
                                {submitting ? "..." : "Give Money"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset User Modal - Dark Theme */}
            {showResetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-[#16161f] rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-red-500/30" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🗑️</div>
                            <h2 className="text-2xl font-black text-white">Reset User</h2>
                            <p className="text-red-400 text-sm font-bold">⚠️ This will delete all user's economy data!</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Select User</label>
                            {selectedUser ? (
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                                    <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <div className="font-bold text-white">@{selectedUser.username}</div>
                                        <div className="text-xs text-gray-400">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-400 text-xl">✕</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by User ID (min 3 chars)..."
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-red-500/50 focus:outline-none font-medium text-white"
                                        autoFocus
                                    />
                                    {searching && <div className="absolute right-3 top-3 text-amber-400">⏳</div>}
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-[#16161f] rounded-xl border border-white/10 shadow-xl max-h-60 overflow-y-auto">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.user_id}
                                                    onClick={() => handleSelectUser(user)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 transition text-left"
                                                >
                                                    <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                                    <div className="flex-1">
                                                        <div className="font-bold text-white">@{user.username}</div>
                                                        <div className="text-xs text-gray-500">{user.user_id}</div>
                                                    </div>
                                                    <div className="font-bold text-amber-400">${user.balance.toLocaleString()}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition border border-white/10">Cancel</button>
                            <button onClick={() => askConfirm('reset', `⚠️ RESET semua data economy @${selectedUser?.username}? Tindakan ini TIDAK bisa dibatalkan!`, true)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                                {submitting ? "..." : "Reset User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-[#16161f] rounded-3xl p-6 md:p-8 max-w-lg w-full mx-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-4">
                            <div className="text-5xl mb-2">📊</div>
                            <h2 className="text-2xl font-black text-white">Top Players</h2>
                        </div>

                        {/* Search Input */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={leaderboardSearch}
                                onChange={(e) => setLeaderboardSearch(e.target.value)}
                                placeholder="🔍 Search by username..."
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none font-medium text-sm text-white"
                            />
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                            {filteredLeaderboard.length > 0 ? (
                                paginatedLeaderboard.map((user, index) => {
                                    const realIndex = (leaderboardPage - 1) * leaderboardPerPage + index;
                                    return (
                                        <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${realIndex === 0 ? 'bg-amber-500/20 border border-amber-500/30' : realIndex === 1 ? 'bg-gray-500/10' : realIndex === 2 ? 'bg-orange-500/10' : 'bg-white/5'}`}>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-sm shrink-0 text-white">
                                                {realIndex === 0 ? "👑" : realIndex === 1 ? "🥈" : realIndex === 2 ? "🥉" : `#${realIndex + 1}`}
                                            </div>
                                            <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full border-2 border-white/10 shadow shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white truncate">@{user.username}</div>
                                                <div className="text-xs text-gray-500">{user.user_id}</div>
                                            </div>
                                            <div className="font-black text-amber-400 shrink-0">${user.balance.toLocaleString()}</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
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
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 font-bold text-sm disabled:opacity-50 hover:bg-white/10 transition"
                                >
                                    ← Prev
                                </button>
                                <span className="text-gray-400 text-sm font-medium">
                                    Page {leaderboardPage} of {totalLeaderboardPages}
                                </span>
                                <button
                                    onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                                    disabled={leaderboardPage === totalLeaderboardPages}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 font-bold text-sm disabled:opacity-50 hover:bg-white/10 transition"
                                >
                                    Next →
                                </button>
                            </div>
                        )}

                        <button onClick={closeModal} className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition border border-white/10">Close</button>
                    </div>
                </div>
            )}

            {/* ConfirmationModal */}
            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={executeConfirmedAction}
                title="Konfirmasi"
                message={confirmMessage}
                confirmText="Ya, Lanjutkan"
                cancelText="Batal"
                isDestructive={isDestructive}
            />

            {/* Info Card - Dark Theme */}
            <div className="glass-card rounded-3xl p-6">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                        <h3 className="text-lg font-black text-white mb-1">Economy System</h3>
                        <p className="text-gray-400">
                            The economy system is <strong className="text-amber-400">global</strong> across all servers.
                            Search users by their User ID to manage their balance.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
