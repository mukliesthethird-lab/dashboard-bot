"use client";

import { useState, useEffect } from "react";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";
import ToastContainer, { useToast } from "./Toast";
import { logActivity } from "@/lib/logger";

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
    const [showFishEncyclopedia, setShowFishEncyclopedia] = useState(false);
    const [showCatchLog, setShowCatchLog] = useState(false);
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

    // Confirmation state (Removed administrative features)

    const { toast, success, error, hideToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [recentCatches, setRecentCatches] = useState<any[]>([]);
    const [rarityDist, setRarityDist] = useState<any>({ Common: 0, Uncommon: 0, Rare: 0, Epic: 0, Legendary: 0 });
    const [loadingCatches, setLoadingCatches] = useState(false);

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

    const fetchRecentCatches = () => {
        setLoadingCatches(true);
        fetch('/api/fishing?action=recent_catches')
            .then(res => res.json())
            .then(data => {
                if (data.recent && Array.isArray(data.recent)) setRecentCatches(data.recent);
                if (data.distribution) setRarityDist(data.distribution);
                setLoadingCatches(false);
            })
            .catch(() => setLoadingCatches(false));
    };

    useEffect(() => {
        fetchStats();
        fetchRecentCatches();
        // Periodically refresh catch log if it's open (simulated real-time)
        const interval = setInterval(fetchRecentCatches, 30000);
        return () => clearInterval(interval);
    }, []);

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

    // (Administrative handlers removed)

    const closeModal = () => {
        setShowFishEncyclopedia(false);
        setShowCatchLog(false);
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => setShowFishEncyclopedia(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📖</div>
                        <div className="font-semibold text-gray-200 text-xs">Encyclopedia</div>
                    </button>
                    <button onClick={() => setShowCatchLog(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#da373c]">📈</div>
                        <div className="font-semibold text-gray-200 text-xs">Catch Log</div>
                    </button>
                    <button onClick={() => setShowViewUser(true)} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-gray-400">👤</div>
                        <div className="font-semibold text-gray-200 text-xs">View User</div>
                    </button>
                    <button onClick={() => { setShowLeaderboard(true); fetchStats(); }} className="p-4 rounded-[4px] bg-black/20 hover:bg-white/5 border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📊</div>
                        <div className="font-semibold text-gray-200 text-xs">Leaderboard</div>
                    </button>
                </div>
            </div>

            {/* Fish Encyclopedia Modal */}
            {showFishEncyclopedia && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-8 max-w-2xl w-full mx-4 shadow-2xl relative border border-white/10 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <div className="text-center mb-6 shrink-0">
                            <h2 className="text-2xl font-bold text-gray-100">📖 Fish Encyclopedia</h2>
                            <p className="text-gray-400 mt-1 text-sm">Discover the inhabitants of the deep</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                            {[
                                { rarity: "Common", color: "text-gray-400", weight: "50%", examples: "Mas, Lele, Nila, Sepat, Mujair", price: "$8 - $15" },
                                { rarity: "Uncommon", color: "text-green-400", weight: "30%", examples: "Gurame, Patin, Bawal, Toman, Bandeng", price: "$20 - $50" },
                                { rarity: "Rare", color: "text-[#5865F2]", weight: "15%", examples: "Kakap Merah, Kerapu, Salmon, Tenggiri", price: "$65 - $150" },
                                { rarity: "Epic", color: "text-purple-400", weight: "4%", examples: "Arowana Merah, Koi Jumbo, Marlin, Sailfish", price: "$500 - $5,000" },
                                { rarity: "Legendary", color: "text-[#f0b232]", weight: "1%", examples: "Megalodon, Hiu Putih, Manta Ray, Oarfish", price: "$6,000 - $20,000" }
                            ].map((group) => (
                                <div key={group.rarity} className="glass-card p-4 rounded-[4px] border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`font-bold ${group.color} uppercase text-sm tracking-wider`}>{group.rarity} ({group.weight})</h3>
                                        <span className="text-xs font-bold text-gray-500">{group.price}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed italic">"{group.examples}..."</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/10 shrink-0"><button onClick={closeModal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button></div>
                    </div>
                </div>
            )}

            {/* Catch Log Modal */}
            {showCatchLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-[#da373c]/30" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-2">
                                <span className="text-[#da373c]">📈</span> Live Catch Activity
                            </h2>
                            <p className="text-gray-400 mt-1 text-sm">Real-time rarities distribution overview</p>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-black/20 rounded-[4px] border border-white/5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest text-center">Global Catch Distribution</div>
                                <div className="flex justify-between items-end gap-1 h-32 px-4">
                                    {(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).map((rarity, i) => {
                                        const count = Number(rarityDist[rarity]) || 0;
                                        const total = Object.values(rarityDist).reduce((a: any, b: any) => a + Number(b), 0) as number;
                                        const height = total > 0 ? Math.max(5, (count / total) * 100) : 5;
                                        return (
                                            <div key={rarity} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group relative">
                                                <div 
                                                    className={`w-full rounded-t-[2px] transition-all duration-1000 ${i === 4 ? 'bg-[#f0b232] shadow-[0_0_10px_rgba(240,178,50,0.3)]' : i === 3 ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : i === 2 ? 'bg-[#5865F2] shadow-[0_0_10px_rgba(88,101,242,0.3)]' : i === 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]'}`} 
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase shrink-0">{rarity[0]}</span>
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-white/20 shadow-xl">
                                                    {count.toLocaleString()} Catches
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                    Recent Legendary Highlights
                                    {loadingCatches && <span className="animate-spin text-[10px]">⌛</span>}
                                </div>
                                {recentCatches.length > 0 ? recentCatches.map((catchItem, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded-[3px] text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={catchItem.rarity === 'Legendary' ? 'text-[#f0b232]' : 'text-purple-400'}>
                                                {catchItem.rarity === 'Legendary' ? '👑' : '💎'}
                                            </span>
                                            <span className="text-gray-300 font-semibold">{catchItem.username}</span>
                                        </div>
                                        <div className="text-gray-400 italic">{catchItem.fish_name} ({Number(catchItem.weight).toFixed(1)}kg)</div>
                                        <div className="text-[10px] text-gray-500">Live</div>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-gray-500 text-[10px] italic">No recent highlights</div>
                                )}
                            </div>
                        </div>
                        <div className="mt-8 pt-4 border-t border-white/10"><button onClick={closeModal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button></div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme with Search */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
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

            {/* View User Modal - Dark Theme */}
            {showViewUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-8 max-w-lg w-full mx-4 shadow-2xl relative border border-white/10 max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
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
                                <div className="space-y-4 mt-4 animate-fade-in">
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
                                        }) : <p className="text-[#87898c] text-sm italic">No rods found</p>}
                                    </div>
                                    <div className="glass-card rounded-[4px] p-4 border border-white/10">
                                        <h3 className="font-semibold text-gray-200 mb-2 uppercase text-[12px] tracking-wide">🐟 Top Fish</h3>
                                        {userDetails.inventory?.length > 0 ? userDetails.inventory.slice(0, 5).map((f: any, idx: number) => (
                                            <div key={`${f.fish_name}_${idx}`} className="flex justify-between py-1 border-b border-white/10 last:border-0">
                                                <span className="truncate mr-2 text-gray-200 text-sm italic font-medium">"{f.fish_name}"</span>
                                                <span className="font-bold text-[#248046] whitespace-nowrap text-sm">${(Number(f.price) || 0).toLocaleString()}</span>
                                            </div>
                                        )) : <p className="text-[#87898c] text-sm italic">No fish caught yet</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-4 border-t border-white/10">
                            <button onClick={closeModal} className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}


