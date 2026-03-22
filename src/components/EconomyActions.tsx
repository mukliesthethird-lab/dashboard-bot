"use client";

import { useState, useEffect, useRef } from "react";
import ConfirmationModal from "./ConfirmationModal";
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
    const { toast, success, error, hideToast } = useToast();
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
                success(`Successfully gave $${amount} to @${selectedUser.username}!`);
                setSelectedUser(null);
                setAmount("");
                fetchStats();
            } else {
                error(data.error || "Failed to give money");
            }
        } catch {
            error("Network error");
        }
        setSubmitting(false);
    };

    const handleResetUser = async () => {
        if (!selectedUser) return;
        setSubmitting(true);

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
                success(`Reset @${selectedUser.username}'s balance!`);
                setSelectedUser(null);
                fetchStats();
                setShowResetUser(false);
            } else {
                error(data.error || "Failed to reset user");
            }
        } catch {
            error("Network error");
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
                    <div className="text-3xl font-bold text-gray-200">
                        ${loading ? "..." : stats.totalBalance.toLocaleString()}
                    </div>
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
                    <span className="text-[#f0b232]">⚡</span> Economy Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => setShowGiveMoney(true)}
                        className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#da373c]">💸</div>
                        <div className="font-semibold text-gray-200 text-sm">Give Money</div>
                    </button>
                    <button
                        onClick={() => setShowResetUser(true)}
                        className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#da373c]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">🗑️</div>
                        <div className="font-semibold text-[#da373c] text-sm">Reset User</div>
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

            {/* Give Money Modal - Dark Theme */}
            {showGiveMoney && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">💸 Give Money</h2>
                            <p className="text-gray-400 mt-1 text-sm">Add money to a user's balance</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>
                                {selectedUser ? (
                                    <div className="flex items-center gap-3 p-3 bg-black/20 rounded-[4px]">
                                        <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-200">@{selectedUser.username}</div>
                                            <div className="text-xs text-[#87898c]">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => setSelectedUser(null)} className="text-[#87898c] hover:text-[#da373c] text-lg">✕</button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by User ID (min 3 chars)..."
                                            className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                                            autoFocus
                                        />
                                        {searching && <div className="absolute right-3 top-2.5 text-gray-200">⏳</div>}
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] shadow-xl max-h-60 overflow-y-auto py-1 border border-white/10">
                                                {searchResults.map(user => (
                                                    <button
                                                        key={user.user_id}
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition text-left"
                                                    >
                                                        <img src={user.avatar || defaultAvatar} alt="" className="w-8 h-8 rounded-full" />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-200 text-sm">@{user.username}</div>
                                                            <div className="text-xs text-[#87898c]">{user.user_id}</div>
                                                        </div>
                                                        <div className="font-semibold text-[#248046] text-sm">${user.balance.toLocaleString()}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Amount</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    min="1"
                                    className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('give', `Give $${amount} to @${selectedUser?.username}?`)} disabled={submitting || !selectedUser || !amount} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">
                                {submitting ? "..." : "Give Money"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset User Modal - Dark Theme */}
            {showResetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-[#da373c]/50" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">🗑️ Reset User</h2>
                            <p className="text-[#da373c] mt-1 text-sm font-semibold">⚠️ This will delete all user's economy data!</p>
                        </div>

                        <div>
                            <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>
                            {selectedUser ? (
                                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-[4px]">
                                    <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-200">@{selectedUser.username}</div>
                                        <div className="text-xs text-[#87898c]">Balance: ${selectedUser.balance.toLocaleString()}</div>
                                    </div>
                                    <button onClick={() => setSelectedUser(null)} className="text-[#87898c] hover:text-[#da373c] text-lg">✕</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by User ID (min 3 chars)..."
                                        className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#da373c]"
                                        autoFocus
                                    />
                                    {searching && <div className="absolute right-3 top-2.5 text-[#da373c]">⏳</div>}
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] shadow-xl max-h-60 overflow-y-auto py-1 border border-white/10">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.user_id}
                                                    onClick={() => handleSelectUser(user)}
                                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition text-left"
                                                >
                                                    <img src={user.avatar || defaultAvatar} alt="" className="w-8 h-8 rounded-full" />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-200 text-sm">@{user.username}</div>
                                                        <div className="text-xs text-[#87898c]">{user.user_id}</div>
                                                    </div>
                                                    <div className="font-semibold text-[#f0b232] text-sm">${user.balance.toLocaleString()}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('reset', `⚠️ RESET semua data economy @${selectedUser?.username}? Tindakan ini TIDAK bisa dibatalkan!`, true)} disabled={submitting || !selectedUser} className="px-6 py-2 bg-[#da373c] hover:bg-[#a12828] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">
                                {submitting ? "..." : "Reset User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
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
            <div className="glass-card rounded-[8px] p-6 border border-white/10">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-200 mb-1">Economy System</h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                            The economy system is <strong className="text-[#f0b232] font-semibold">global</strong> across all servers.
                            Search users by their User ID to manage their balance.
                        </p>
                    </div>
                </div>
            </div>
            {/* Toast Container */}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}


