"use client";

import { useState, useEffect, useRef } from "react";

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
    const askConfirm = (action: string, message: string) => {
        setConfirmAction(action);
        setConfirmMessage(message);
        setShowConfirm(true);
    };

    const executeConfirmedAction = async () => {
        setShowConfirm(false);
        switch (confirmAction) {
            case 'give': await handleGiveMoney(); break;
            case 'reset': await handleResetUser(); break;
        }
    };

    const closeModal = () => {
        setShowGiveMoney(false);
        setShowResetUser(false);
        setShowLeaderboard(false);
        setShowConfirm(false);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        setAmount("");
        setConfirmAction("");
        setConfirmMessage("");
    };

    return (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-md">
                    <div className="text-4xl mb-3">👥</div>
                    <div className="text-3xl font-black text-emerald-700">
                        {loading ? "..." : stats.totalUsers.toLocaleString()}
                    </div>
                    <div className="text-emerald-600 font-bold text-sm">Total Players</div>
                </div>

                <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-6 border-2 border-amber-200 shadow-md">
                    <div className="text-4xl mb-3">💵</div>
                    <div className="text-3xl font-black text-amber-700">
                        ${loading ? "..." : stats.totalBalance.toLocaleString()}
                    </div>
                    <div className="text-amber-600 font-bold text-sm">Total Economy</div>
                </div>

                <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 border-2 border-purple-200 shadow-md">
                    <div className="text-4xl mb-3">👑</div>
                    <div className="text-3xl font-black text-purple-700">
                        ${loading ? "..." : (stats.topUsers[0]?.balance || 0).toLocaleString()}
                    </div>
                    <div className="text-purple-600 font-bold text-sm">Richest Player</div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200" : "bg-red-100 text-red-700 border-2 border-red-200"}`}>
                    {message.type === "success" ? "✅" : "❌"} {message.text}
                </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-amber-100 shadow-md mb-8">
                <h2 className="text-xl font-black text-stone-800 mb-4">⚡ Economy Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => { setShowGiveMoney(true); setMessage(null); }}
                        className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">💸</div>
                        <div className="font-bold text-stone-700 text-sm">Give Money</div>
                    </button>
                    <button
                        onClick={() => { setShowResetUser(true); setMessage(null); }}
                        className="p-4 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-200 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">🗑️</div>
                        <div className="font-bold text-stone-700 text-sm">Reset User</div>
                    </button>
                    <button
                        onClick={() => { setShowLeaderboard(true); fetchStats(); }}
                        className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 transition text-center group"
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition">📊</div>
                        <div className="font-bold text-stone-700 text-sm">Leaderboard</div>
                    </button>
                </div>
            </div>

            {/* Give Money Modal */}
            {showGiveMoney && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-emerald-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">💸</div>
                            <h2 className="text-2xl font-black text-stone-800">Give Money</h2>
                            <p className="text-stone-500 text-sm">Add money to a user's balance</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>
                                {selectedUser ? (
                                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border-2 border-stone-200">
                                        <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                        <div className="flex-1">
                                            <div className="font-bold text-stone-800">@{selectedUser.username}</div>
                                            <div className="text-xs text-stone-500">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-red-500 text-xl">✕</button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by User ID (min 3 chars)..."
                                            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:outline-none font-medium"
                                            autoFocus
                                        />
                                        {searching && <div className="absolute right-3 top-3 text-amber-500">⏳</div>}
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border-2 border-stone-200 shadow-xl max-h-60 overflow-y-auto">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.user_id}
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 transition text-left"
                                                    >
                                                        <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-stone-800">@{user.username}</div>
                                                            <div className="text-xs text-stone-500">{user.user_id}</div>
                                                        </div>
                                                        <div className="font-bold text-amber-600">${user.balance.toLocaleString()}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Amount</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    min="1"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-emerald-400 focus:outline-none font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('give', `Berikan $${amount} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser || !amount} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                                {submitting ? "..." : "Give Money"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset User Modal */}
            {showResetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-red-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🗑️</div>
                            <h2 className="text-2xl font-black text-stone-800">Reset User</h2>
                            <p className="text-red-500 text-sm font-bold">⚠️ This will delete all user's economy data!</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>
                            {selectedUser ? (
                                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border-2 border-stone-200">
                                    <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <div className="font-bold text-stone-800">@{selectedUser.username}</div>
                                        <div className="text-xs text-stone-500">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-red-500 text-xl">✕</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by User ID (min 3 chars)..."
                                        className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-red-400 focus:outline-none font-medium"
                                        autoFocus
                                    />
                                    {searching && <div className="absolute right-3 top-3 text-amber-500">⏳</div>}
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border-2 border-stone-200 shadow-xl max-h-60 overflow-y-auto">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.user_id}
                                                    onClick={() => handleSelectUser(user)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-red-50 transition text-left"
                                                >
                                                    <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                                    <div className="flex-1">
                                                        <div className="font-bold text-stone-800">@{user.username}</div>
                                                        <div className="text-xs text-stone-500">{user.user_id}</div>
                                                    </div>
                                                    <div className="font-bold text-amber-600">${user.balance.toLocaleString()}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('reset', `⚠️ RESET semua data economy @${selectedUser?.username}? Tindakan ini TIDAK bisa dibatalkan!`)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                                {submitting ? "..." : "Reset User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border-4 border-blue-200 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">📊</div>
                            <h2 className="text-2xl font-black text-stone-800">Top 10 Richest</h2>
                        </div>

                        <div className="space-y-2">
                            {stats.topUsers.map((user, index) => (
                                <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' : index === 1 ? 'bg-slate-100' : index === 2 ? 'bg-orange-50' : 'bg-stone-50'}`}>
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-sm border">
                                        {index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                    </div>
                                    <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-stone-800 truncate">@{user.username}</div>
                                    </div>
                                    <div className="font-black text-amber-600">${user.balance.toLocaleString()}</div>
                                </div>
                            ))}
                            {stats.topUsers.length === 0 && (
                                <div className="text-center py-8 text-stone-400">No players yet</div>
                            )}
                        </div>

                        <button onClick={closeModal} className="w-full mt-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Close</button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-amber-300" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h2 className="text-2xl font-black text-stone-800 mb-2">Konfirmasi</h2>
                            <p className="text-stone-600 font-medium">{confirmMessage}</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">
                                Batal
                            </button>
                            <button onClick={executeConfirmedAction} disabled={submitting} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                                {submitting ? "..." : "Ya, Lanjutkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-3xl p-6 border-2 border-amber-200 shadow-md">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                        <h3 className="text-lg font-black text-stone-800 mb-1">Economy System</h3>
                        <p className="text-stone-600">
                            The economy system is <strong>global</strong> across all servers.
                            Search users by their User ID to manage their balance.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
