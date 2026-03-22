"use client";

import { useState, useEffect } from "react";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";
import ToastContainer, { useToast } from "./Toast";

interface User {
    user_id: string;
    username: string;
    avatar: string | null;
    total_catch: number;
}

interface FishingStats {
    totalFishers: number;
    totalRods: number;
    totalFishCaught: number;
    topFishers: User[];
}

interface FishingActionsProps {
    guildId: string;
}

const defaultAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";

// From Fishing.py - Rod data with base stats and scaling per level
// weight_boost: Multiplier for fish weight (e.g. 1.1 = +10% weight)
// rarity_boost: Flat percentage increase for higher rarities
// scaling_weight: Per level weight multiplier increase
// scaling_rarity: Per level rarity boost increase
const ROD_DATA = {
    "Common Rod": { price: 0, weight_boost: 1.0, rarity_boost: 0, scaling_weight: 0.05, scaling_rarity: 0, emoji: "🎣" },
    "Good Rod": { price: 20000, weight_boost: 1.1, rarity_boost: 0, scaling_weight: 0.05, scaling_rarity: 0.1, emoji: "🎋" },
    "Unique Rod": { price: 100000, weight_boost: 1.3, rarity_boost: 1, scaling_weight: 0.1, scaling_rarity: 0.1, emoji: "🔱" },
    "Masterwork Rod": { price: 500000, weight_boost: 1.5, rarity_boost: 2, scaling_weight: 0.1, scaling_rarity: 0.2, emoji: "🌟" },
    "Dyto Rod": { price: 2000000, weight_boost: 2.0, rarity_boost: 3, scaling_weight: 0.15, scaling_rarity: 0.3, emoji: "👑" }
};

// Calculate rod stats based on type and enhancement level (from Fishing.py)
function getRodStats(rodName: string, level: number) {
    const rod = ROD_DATA[rodName as keyof typeof ROD_DATA] || ROD_DATA["Common Rod"];
    // Weight boost: base multiplier + (level * scaling_weight) => convert to percentage
    const totalWeightMultiplier = rod.weight_boost + (level * rod.scaling_weight);
    const weightBoostPercent = Math.round((totalWeightMultiplier - 1) * 100);
    // Rarity boost: base + (level * scaling_rarity)
    const rarityBoost = rod.rarity_boost + (level * rod.scaling_rarity);
    return { weightBoostPercent, rarityBoost: rarityBoost.toFixed(1), emoji: rod.emoji };
}

const BUFF_ITEMS = [
    { name: "Rokok Surya", emoji: "🚬", description: "Cooldown -10s", duration: "5 min" },
    { name: "Kail Mata Dua", emoji: "🪝", description: "20% Double Catch", duration: "5 min" },
    { name: "Pancing Magnet", emoji: "🧲", description: "+10% Scrap/Pearl", duration: "5 min" }
];

const MATERIALS = [
    { name: "Scrap", emoji: "🔩", description: "Used for rod forging" },
    { name: "Pearl", emoji: "🦪", description: "Rare material for high-level forging" }
];

export default function FishingActions({ guildId }: FishingActionsProps) {
    const [stats, setStats] = useState<FishingStats>({ totalFishers: 0, totalRods: 0, totalFishCaught: 0, topFishers: [] });
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showGiveRod, setShowGiveRod] = useState(false);
    const [showGiveMaterial, setShowGiveMaterial] = useState(false);
    const [showGiveBuff, setShowGiveBuff] = useState(false);
    const [showResetUser, setShowResetUser] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showViewUser, setShowViewUser] = useState(false);

    // User search
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searching, setSearching] = useState(false);

    // Form states
    const [selectedRod, setSelectedRod] = useState(Object.keys(ROD_DATA)[0]);
    const [rodLevel, setRodLevel] = useState("0");
    const [selectedMaterial, setSelectedMaterial] = useState("Scrap");
    const [materialAmount, setMaterialAmount] = useState("10");
    const [selectedBuff, setSelectedBuff] = useState(BUFF_ITEMS[0].name);
    const [buffAmount, setBuffAmount] = useState("1");

    // Confirmation state
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<string>("");
    const [confirmMessage, setConfirmMessage] = useState<string>("");
    const [isDestructive, setIsDestructive] = useState(false);

    const { toast, success, error, hideToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);

    // Leaderboard search and pagination
    const [leaderboardSearch, setLeaderboardSearch] = useState("");
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const leaderboardPerPage = 10;

    // Computed: filtered and paginated leaderboard
    const filteredLeaderboard = (stats.topFishers || []).filter(user =>
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
        fetch('/api/fishing?action=stats')
            .then(res => res.json())
            .then(data => {
                if (data && typeof data === 'object') {
                    setStats({
                        totalFishers: data.totalFishers ?? 0,
                        totalRods: data.totalRods ?? 0,
                        totalFishCaught: data.totalFishCaught ?? 0,
                        topFishers: data.topFishers ?? []
                    });
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchStats(); }, []);

    useEffect(() => {
        if (searchQuery.length >= 1) {
            setSearching(true);
            const timer = setTimeout(() => {
                fetch(`/api/fishing?action=search&user_id=${searchQuery}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) setSearchResults(data);
                        setSearching(false);
                    })
                    .catch(() => setSearching(false));
            }, 300);
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

    const fetchUserDetails = async (userId: string) => {
        const res = await fetch(`/api/fishing?action=user&user_id=${userId}`);
        const data = await res.json();
        setUserDetails(data);
    };

    const handleGiveRod = async () => {
        if (!selectedUser || !selectedRod) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/fishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'give_rod',
                    user_id: selectedUser.user_id,
                    rod_name: selectedRod,
                    rod_level: parseInt(rodLevel) || 0,
                    guild_id: guildId
                })
            });
            const data = await res.json();
            if (res.ok) {
                success(`Gave ${selectedRod} +${rodLevel} to @${selectedUser.username}!`);
                setSelectedUser(null);
                setRodLevel("0");
                fetchStats();
            } else {
                error(data.error || "Failed to give rod");
            }
        } catch {
            error("Network error");
        }
        setSubmitting(false);
    };

    const handleGiveMaterial = async () => {
        if (!selectedUser || !selectedMaterial || !materialAmount) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/fishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'give_material',
                    user_id: selectedUser.user_id,
                    material_name: selectedMaterial,
                    amount: parseInt(materialAmount) || 1,
                    guild_id: guildId
                })
            });
            const data = await res.json();
            if (res.ok) {
                success(`Gave ${materialAmount}x ${selectedMaterial} to @${selectedUser.username}!`);
                setSelectedUser(null);
                fetchStats();
            } else {
                error(data.error || "Failed to give material");
            }
        } catch {
            error("Network error");
        }
        setSubmitting(false);
    };

    const handleGiveBuff = async () => {
        if (!selectedUser || !selectedBuff || !buffAmount) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/fishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'give_buff',
                    user_id: selectedUser.user_id,
                    buff_name: selectedBuff,
                    amount: parseInt(buffAmount) || 1,
                    guild_id: guildId
                })
            });
            const data = await res.json();
            if (res.ok) {
                success(`Gave ${buffAmount}x ${selectedBuff} to @${selectedUser.username}!`);
                setSelectedUser(null);
                fetchStats();
            } else {
                error(data.error || "Failed to give buff");
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
            const res = await fetch('/api/fishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', user_id: selectedUser.user_id, guild_id: guildId })
            });
            const data = await res.json();
            if (res.ok) {
                success(`Reset @${selectedUser.username}'s fishing data!`);
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
            case 'give_rod': await handleGiveRod(); break;
            case 'give_material': await handleGiveMaterial(); break;
            case 'give_buff': await handleGiveBuff(); break;
            case 'reset': await handleResetUser(); break;
        }
    };

    const closeModal = () => {
        setShowGiveRod(false);
        setShowGiveMaterial(false);
        setShowGiveBuff(false);
        setShowResetUser(false);
        setShowLeaderboard(false);
        setShowViewUser(false);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        setUserDetails(null);
        setLeaderboardSearch("");
        setLeaderboardPage(1);
    };

    // User search component (inline)
    const renderUserSearch = () => (
        selectedUser ? (
            <div className="flex items-center gap-3 p-3 bg-black/20 rounded-[4px]">
                <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <div className="font-medium text-gray-200">@{selectedUser.username}</div>
                    <div className="text-xs text-[#87898c]">ID: {selectedUser.user_id} • Fish: {selectedUser.total_catch}</div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-[#87898c] hover:text-[#da373c] text-lg">✕</button>
            </div>
        ) : (
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter User ID (min 1 char)..."
                    className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                    autoFocus
                />
                {searching && <div className="absolute right-3 top-2.5 text-gray-200 animate-pulse">⏳</div>}
                {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] shadow-xl max-h-60 overflow-y-auto py-1 border border-white/10">
                        {searchResults.map(user => (
                            <button key={user.user_id} onClick={() => handleSelectUser(user)} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 transition text-left">
                                <img src={user.avatar || defaultAvatar} alt="" className="w-8 h-8 rounded-full" />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-200 text-sm">@{user.username}</div>
                                    <div className="text-xs text-[#87898c]">{user.user_id}</div>
                                </div>
                                <div className="font-semibold text-[#f0b232] text-sm">🐟 {user.total_catch}</div>
                            </button>
                        ))}
                    </div>
                )}
                {searchQuery.length > 0 && searchQuery.length < 1 && (
                    <div className="text-xs text-[#da373c] mt-1 font-semibold">Min 1 character</div>
                )}
                {searchQuery.length >= 1 && searchResults.length === 0 && !searching && (
                    <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] py-3 text-center text-[#87898c] text-sm border border-white/10">
                        No results for "{searchQuery}"
                    </div>
                )}
            </div>
        )
    );

    if (loading) {
        return <CatLoader message="Loading fishing data..." />;
    }

    return (
        <>
            {/* Stats Grid - Dark Theme */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 mt-4">
                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg text-gray-400">👥</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Fishers</h3>
                    </div>
                    <div className="text-3xl font-bold text-gray-200">{loading ? "..." : (stats?.totalFishers ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg text-[#f0b232]">🐟</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Fish Caught</h3>
                    </div>
                    <div className="text-3xl font-bold text-gray-200">{loading ? "..." : (stats?.totalFishCaught ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-lg text-[#f0b232]">🎣</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Rods</h3>
                    </div>
                    <div className="text-3xl font-bold text-gray-200">{loading ? "..." : (stats?.totalRods ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-xl text-[#f0b232]">👑</div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Top Fisher</h3>
                    </div>
                    <div className="text-3xl font-bold text-[#f0b232]">{loading ? "..." : (stats?.topFishers?.[0]?.total_catch ?? 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Fishing Actions - Dark Theme */}
            <div className="glass-card rounded-[8px] p-6 mb-4 border border-white/10">
                <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="text-[#f0b232]">⚡</span> Fishing Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button onClick={() => setShowGiveRod(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">🎣</div>
                        <div className="font-semibold text-gray-200 text-xs">Give Rod</div>
                    </button>
                    <button onClick={() => setShowGiveMaterial(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">🔩</div>
                        <div className="font-semibold text-gray-200 text-xs">Give Material</div>
                    </button>
                    <button onClick={() => setShowGiveBuff(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">🚬</div>
                        <div className="font-semibold text-gray-200 text-xs">Give Buff</div>
                    </button>
                    <button onClick={() => setShowViewUser(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">👤</div>
                        <div className="font-semibold text-gray-200 text-xs">View User</div>
                    </button>
                    <button onClick={() => { setShowLeaderboard(true); fetchStats(); }} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📊</div>
                        <div className="font-semibold text-gray-200 text-xs">Leaderboard</div>
                    </button>
                    <button onClick={() => setShowResetUser(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#da373c]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">🗑️</div>
                        <div className="font-semibold text-[#da373c] text-xs">Reset User</div>
                    </button>
                </div>
            </div>

            {/* Give Rod Modal - Dark Theme */}
            {showGiveRod && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">🎣 Give Fishing Rod</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Rod Type</label>
                                <select value={selectedRod} onChange={(e) => setSelectedRod(e.target.value)} className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]">
                                    {Object.entries(ROD_DATA).map(([name, rod]) => (<option key={name} value={name}>{rod.emoji} {name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Level (+0 to +10)</label>
                                <input type="number" value={rodLevel} onChange={(e) => setRodLevel(e.target.value)} min="0" max="10" className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('give_rod', `Berikan ${selectedRod} +${rodLevel} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">{submitting ? "..." : "Give Rod"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Give Material Modal - Dark Theme */}
            {showGiveMaterial && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">🔩 Give Material</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Material</label>
                                <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]">
                                    {MATERIALS.map(m => (<option key={m.name} value={m.name}>{m.emoji} {m.name} - {m.description}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Amount</label>
                                <input type="number" value={materialAmount} onChange={(e) => setMaterialAmount(e.target.value)} min="1" className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('give_material', `Berikan ${materialAmount}x ${selectedMaterial} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">{submitting ? "..." : "Give Material"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Give Buff Modal - Dark Theme */}
            {showGiveBuff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100">🚬 Give Buff Item</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Buff Item</label>
                                <select value={selectedBuff} onChange={(e) => setSelectedBuff(e.target.value)} className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]">
                                    {BUFF_ITEMS.map(b => (<option key={b.name} value={b.name}>{b.emoji} {b.name} ({b.duration}) - {b.description}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Amount</label>
                                <input type="number" value={buffAmount} onChange={(e) => setBuffAmount(e.target.value)} min="1" className="w-full px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('give_buff', `Berikan ${buffAmount}x ${selectedBuff} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">{submitting ? "..." : "Give Buff"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View User Modal - Dark Theme */}
            {showViewUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-8 max-w-lg w-full mx-4 shadow-2xl relative border border-white/10 max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex justify-center items-center gap-2">
                                <span className="text-gray-400">👤</span> View User Profile
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                            {selectedUser && !userDetails && (
                                <button onClick={() => fetchUserDetails(selectedUser.user_id)} className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition text-sm">Load Profile</button>
                            )}
                            {userDetails && (
                                <div className="space-y-4 mt-4">
                                    <div className="glass-card rounded-[4px] p-4 border border-white/10">
                                        <h3 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">🎣 Rods</h3>
                                        {userDetails.rods?.length > 0 ? userDetails.rods.map((r: any, idx: number) => {
                                            const level = r.level || r.rod_level || 0;
                                            const stats = getRodStats(r.rod_name, level);
                                            const isEquipped = userDetails.profile?.equipped_rod === r.rod_name;
                                            return (
                                                <div key={`${r.rod_name}_${idx}`} className={`py-2 border-b border-white/10 last:border-0 ${isEquipped ? 'bg-[#248046]/10 -mx-2 px-2 rounded-[4px]' : ''}`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-200 text-sm">{stats.emoji} {r.rod_name}</span>
                                                            {isEquipped && <span className="px-1.5 py-0.5 bg-[#248046] text-white rounded-[2px] text-[10px] font-bold tracking-wide uppercase">In Use</span>}
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-[#f0b232]/20 text-[#f0b232] rounded-[2px] font-bold text-[10px] uppercase">+{level}</span>
                                                    </div>
                                                    <div className="flex gap-3 mt-1 text-[11px] text-[#87898c]">
                                                        <span>⚖️ Weight: +{stats.weightBoostPercent}%</span>
                                                        <span>✨ Rarity: +{stats.rarityBoost}%</span>
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-[#87898c] text-sm">No rods</p>}
                                    </div>
                                    <div className="glass-card rounded-[4px] p-4 border border-white/10">
                                        <h3 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">🐟 Top Fish</h3>
                                        {userDetails.inventory?.length > 0 ? userDetails.inventory.slice(0, 5).map((f: any, idx: number) => (
                                            <div key={`${f.fish_name}_${idx}`} className="flex justify-between py-1 border-b border-white/10 last:border-0">
                                                <span className="truncate mr-2 text-gray-200 text-sm">{f.fish_name}</span>
                                                <span className="font-bold text-[#248046] whitespace-nowrap text-sm">${f.price?.toLocaleString() || '0'}</span>
                                            </div>
                                        )) : <p className="text-[#87898c] text-sm">No fish</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button>
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
                            <h2 className="text-2xl font-bold text-gray-100 flex justify-center items-center gap-2">
                                <span className="text-[#da373c]">🗑️</span> Reset User
                            </h2>
                            <p className="text-[#da373c] mt-1 text-sm font-semibold">⚠️ Deletes ALL fishing data!</p>
                        </div>
                        <div><label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="px-6 py-2 bg-transparent hover:underline text-white font-medium transition text-sm">Cancel</button>
                            <button onClick={() => askConfirm('reset', `⚠️ RESET semua data fishing @${selectedUser?.username}? Tindakan ini TIDAK bisa dibatalkan!`, true)} disabled={submitting || !selectedUser} className="px-6 py-2 bg-[#da373c] hover:bg-[#a12828] text-white font-medium rounded-[3px] transition disabled:opacity-50 text-sm">{submitting ? "..." : "Reset User"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme with Search */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-white/5 rounded-[8px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-2">
                                <span className="text-[#f0b232]">📊</span> Top Fishers
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
                                        <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-[4px] border border-white/10 ${realIndex === 0 ? 'bg-[#f0b232]/10 !border-[#f0b232]/30' : realIndex === 1 ? 'bg-[#b5bac1]/10 !border-[#b5bac1]/20' : realIndex === 2 ? 'bg-[#f0b232]/5 !border-[#f0b232]/10' : 'glass-card'}`}>
                                            <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center font-bold text-sm shrink-0 text-gray-200">
                                                {realIndex === 0 ? "👑" : realIndex === 1 ? "🥈" : realIndex === 2 ? "🥉" : `#${realIndex + 1}`}
                                            </div>
                                            <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-gray-200 truncate text-sm">@{user.username}</div>
                                                <div className="text-[11px] text-[#87898c]">{user.user_id}</div>
                                            </div>
                                            <div className="font-bold text-[#f0b232] shrink-0 text-sm">🐟 {(user.total_catch ?? 0).toLocaleString()}</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-[#87898c]">
                                    {leaderboardSearch ? "No users match your search" : "No fishers yet"}
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

            {/* Info - Dark Theme */}
            <div className="glass-card rounded-[8px] p-6 border border-white/10">
                <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="text-[#f0b232]">🎣</span> Fishing System Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">Rods (5 Types)</h4>
                        <p>Common → Good → Unique → Masterwork → Dyto</p>
                        <p className="text-[11px] text-[#87898c] mt-1">Each rod can be enhanced +0 to +10</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">Materials</h4>
                        <p>🔩 Scrap - Common forging material</p>
                        <p>🧪 Pearl - Rare forging material</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">Buffs</h4>
                        <p>🚬 Rokok Surya - Faster cooldown</p>
                        <p>🪝 Kail Mata Dua - Double catch</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">Fish Rarities</h4>
                        <p>Common → Uncommon → Rare → Epic → Legendary</p>
                    </div>
                </div>
            </div>
            {/* Toast Container */}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}


