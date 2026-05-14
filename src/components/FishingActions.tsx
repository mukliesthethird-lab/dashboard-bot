"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import ConfirmationModal from "./ConfirmationModal";
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

    // Encyclopedia states
    const [encyclopediaData, setEncyclopediaData] = useState<any>(null);
    const [activeRarity, setActiveRarity] = useState('Common');
    const [encyclopediaSearch, setEncyclopediaSearch] = useState("");
    const [loadingEncyclopedia, setLoadingEncyclopedia] = useState(false);
    const [showFishDetail, setShowFishDetail] = useState(false);
    const [selectedFish, setSelectedFish] = useState<any>(null);

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

    const fetchEncyclopedia = () => {
        if (encyclopediaData) return;
        setLoadingEncyclopedia(true);
        fetch('/api/fishing?action=encyclopedia')
            .then(res => res.json())
            .then(data => {
                setEncyclopediaData(data);
                setLoadingEncyclopedia(false);
            })
            .catch(() => setLoadingEncyclopedia(false));
    };

    const viewFishDetail = (f: any, rarity: string) => {
        setSelectedFish({ ...f, rarity });
        setShowFishDetail(true);
    };

    useEffect(() => {
        if (showFishEncyclopedia) {
            fetchEncyclopedia();
        }
    }, [showFishEncyclopedia]);

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
            <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-[4px]">
                <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]">@{selectedUser.username}</div>
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
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                    autoFocus
                />
                {searching && <div className="absolute right-3 top-2.5 text-[var(--text-primary)] animate-pulse">⏳</div>}
                {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] shadow-xl max-h-60 overflow-y-auto py-1 border border-[var(--border)]">
                        {searchResults.map(user => (
                            <button key={user.user_id} onClick={() => handleSelectUser(user)} className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-hover)] transition text-left">
                                <img src={user.avatar || defaultAvatar} alt="" className="w-8 h-8 rounded-full" />
                                <div className="flex-1">
                                    <div className="font-medium text-[var(--text-primary)] text-sm">@{user.username}</div>
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
                    <div className="absolute z-10 w-full mt-1 glass-card rounded-[4px] py-3 text-center text-[#87898c] text-sm border border-[var(--border)]">
                        No results for "{searchQuery}"
                    </div>
                )}
            </div>
        )
    );

    if (loading) {
        return <Loading message="Loading fishing data..." />;
    }

    return (
        <>
            {/* Stats Grid - Dark Theme */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 mt-4">
                <div className="glass-card rounded-[8px] p-6 border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg text-[var(--text-secondary)]">👥</div>
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Fishers</h3>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{loading ? "..." : (stats?.totalFishers ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg text-[#f0b232]">🐟</div>
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Fish Caught</h3>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{loading ? "..." : (stats?.totalFishCaught ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg text-[#f0b232]">🎣</div>
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Rods</h3>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{loading ? "..." : (stats?.totalRods ?? 0).toLocaleString()}</div>
                </div>

                <div className="glass-card rounded-[8px] p-6 border border-[var(--border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xl text-[#f0b232]">👑</div>
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">Top Fisher</h3>
                    </div>
                    <div className="text-3xl font-bold text-[#f0b232]">{loading ? "..." : (stats?.topFishers?.[0]?.total_catch ?? 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Fishing Actions - Dark Theme */}
            <div className="glass-card rounded-[8px] p-6 mb-4 border border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <span className="text-[#f0b232]">⚡</span> Fishing Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => setShowFishEncyclopedia(true)} className="p-4 rounded-[4px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📖</div>
                        <div className="font-semibold text-[var(--text-primary)] text-xs">Encyclopedia</div>
                    </button>
                    <button onClick={() => setShowCatchLog(true)} className="p-4 rounded-[4px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#da373c]">📈</div>
                        <div className="font-semibold text-[var(--text-primary)] text-xs">Catch Log</div>
                    </button>
                    <button onClick={() => setShowViewUser(true)} className="p-4 rounded-[4px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[var(--text-secondary)]">👤</div>
                        <div className="font-semibold text-[var(--text-primary)] text-xs">View User</div>
                    </button>
                    <button onClick={() => { setShowLeaderboard(true); fetchStats(); }} className="p-4 rounded-[4px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[#5865F2]/50 transition text-center group flex flex-col items-center justify-center gap-2 h-28">
                        <div className="text-2xl group-hover:scale-110 transition glass-card w-12 h-12 flex items-center justify-center rounded-full text-[#f0b232]">📊</div>
                        <div className="font-semibold text-[var(--text-primary)] text-xs">Leaderboard</div>
                    </button>
                </div>
            </div>

            {/* Fish Encyclopedia Modal */}
            {showFishEncyclopedia && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in" onClick={closeModal}>
                    <div className="bg-[var(--bg-primary)] rounded-xl p-8 max-w-4xl w-full mx-4 shadow-2xl relative border border-[var(--border)] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-6 text-[var(--text-secondary)] hover:text-white transition-colors p-2 hover:bg-[var(--bg-hover)] rounded-full">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <div className="text-center mb-8 shrink-0">
                            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
                                <span className="text-4xl">📓</span> 
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Fish Encyclopedia</span>
                            </h2>
                            <p className="text-[var(--text-secondary)] mt-2 text-sm">Discover the inhabitants of the deep waters</p>
                        </div>

                        {/* Controls: Rarity Tabs & Search */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border)] mb-6 shrink-0">
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                {['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map(r => (
                                    <button 
                                        key={r}
                                        onClick={() => setActiveRarity(r)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${activeRarity === r ? 'bg-[var(--bg-hover)] text-white shadow-lg border border-[var(--border)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-transparent'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-64">
                                <input 
                                    type="text" 
                                    placeholder="Search fish name..." 
                                    value={encyclopediaSearch}
                                    onChange={(e) => setEncyclopediaSearch(e.target.value)}
                                    className="w-full bg-black/40 border border-[var(--border)] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                />
                                <span className="absolute left-3.5 top-3 text-[var(--text-tertiary)] text-xs">🔍</span>
                            </div>
                        </div>

                        {/* Fish Grid */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                            {loadingEncyclopedia ? (
                                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mb-4"></div>
                                    <p className="text-[var(--text-tertiary)] font-medium">Gathering fish data...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pt-6">
                                    {encyclopediaData && (encyclopediaData[activeRarity] || [])
                                        .filter((f: any) => f.name.toLowerCase().includes(encyclopediaSearch.toLowerCase()))
                                        .map((f: any) => {
                                            const rarityColors: any = {
                                                'Common': 'border-[var(--border)] text-[var(--text-secondary)] bg-[#16161a] hover:border-white/40',
                                                'Uncommon': 'border-emerald-500/40 text-emerald-400 bg-[#16161a] hover:border-emerald-400',
                                                'Rare': 'border-blue-500/40 text-blue-400 bg-[#16161a] hover:border-blue-400',
                                                'Epic': 'border-purple-500/40 text-purple-400 bg-[#16161a] hover:border-purple-400',
                                                'Legendary': 'border-orange-500/40 text-orange-400 bg-[#16161a] hover:border-orange-400'
                                            };
                                            return (
                                                <div 
                                                    key={f.name} 
                                                    onClick={() => viewFishDetail(f, activeRarity)}
                                                    className={`group relative border-2 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-[#1c1c22] cursor-pointer ${rarityColors[activeRarity]}`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="relative w-20 h-20 shrink-0 bg-black/40 rounded-xl overflow-hidden border border-[var(--border)]">
                                                            <img src={f.image_url} alt={f.name} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105" />
                                                            <div className="absolute inset-0 bg-[var(--bg-tertiary)] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                                                <span className="text-[10px] text-white font-bold tracking-widest uppercase bg-black/60 px-3 py-1 rounded border border-white/20 scale-90 group-hover:scale-100 transition-transform">Detail</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-white font-bold truncate text-lg transition-colors">{f.name}</h4>
                                                            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-2 ${rarityColors[activeRarity].split(' ').slice(0,3).join(' ')}`}>
                                                                {activeRarity}
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-tight">Weight</span>
                                                                    <span className="text-[var(--text-secondary)] font-mono text-[11px] font-semibold">{f.min_weight}-{f.max_weight}<span className="text-[9px] ml-0.5">kg</span></span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-bold tracking-tight text-right">Price</span>
                                                                    <span className="text-[#248046] font-black text-[11px] text-right">${f.base_price.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {(!encyclopediaData || !(encyclopediaData[activeRarity] || []).some((f: any) => f.name.toLowerCase().includes(encyclopediaSearch.toLowerCase()))) && (
                                        <div className="col-span-full py-24 text-center">
                                            <div className="text-5xl mb-4 grayscale opacity-30">🐠</div>
                                            <p className="text-[var(--text-tertiary)] italic font-medium">No fish discovered in this category matching your search.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-[var(--border)] shrink-0 flex justify-between items-center">
                            <span className="text-[10px] text-gray-600 italic">* Values shown represent base ecosystem data. Actual catches vary by rod quality.</span>
                            <button onClick={closeModal} className="px-8 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-xl transition-all font-bold text-sm">Close Encyclopedia</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Catch Log Modal */}
            {showCatchLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[var(--bg-primary)] rounded-[8px] p-8 max-w-md w-full mx-4 shadow-2xl relative border border-[#da373c]/30" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-2">
                                <span className="text-[#da373c]">📈</span> Live Catch Activity
                            </h2>
                            <p className="text-[var(--text-secondary)] mt-1 text-sm">Real-time rarities distribution overview</p>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-[var(--bg-tertiary)] rounded-[4px] border border-[var(--border)]">
                                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-3 tracking-widest text-center">Global Catch Distribution</div>
                                <div className="flex justify-between items-end gap-1 h-32 px-4">
                                    {(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']).map((rarity, i) => {
                                        const count = Number(rarityDist[rarity]) || 0;
                                        const total = Object.values(rarityDist).reduce((a: any, b: any) => a + Number(b), 0) as number;
                                        const height = total > 0 ? Math.max(5, (count / total) * 100) : 5;
                                        return (
                                            <div key={rarity} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group relative">
                                                <div 
                                                    className={`w-full rounded-t-[2px] transition-all duration-1000 ${i === 4 ? 'bg-[#f0b232] shadow-[0_0_10px_rgba(240,178,50,0.3)]' : i === 3 ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : i === 2 ? 'bg-[#5865F2] shadow-[0_0_10px_rgba(88,101,242,0.3)]' : i === 1 ? 'bg-[var(--bg-elevated)]merald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]'}`} 
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                                <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase shrink-0">{rarity[0]}</span>
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
                                <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex justify-between items-center">
                                    Recent Legendary Highlights
                                    {loadingCatches && <span className="animate-spin text-[10px]">⌛</span>}
                                </div>
                                {recentCatches.length > 0 ? recentCatches.map((catchItem, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-[var(--bg-hover)] rounded-[3px] text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={catchItem.rarity === 'Legendary' ? 'text-[#f0b232]' : 'text-purple-400'}>
                                                {catchItem.rarity === 'Legendary' ? '👑' : '💎'}
                                            </span>
                                            <span className="text-[var(--text-secondary)] font-semibold">{catchItem.username}</span>
                                        </div>
                                        <div className="text-[var(--text-secondary)] italic">{catchItem.fish_name} ({Number(catchItem.weight).toFixed(1)}kg)</div>
                                        <div className="text-[10px] text-[var(--text-tertiary)]">Live</div>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-[var(--text-tertiary)] text-[10px] italic">No recent highlights</div>
                                )}
                            </div>
                        </div>
                        <div className="mt-8 pt-4 border-t border-[var(--border)]"><button onClick={closeModal} className="w-full py-2 bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button></div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal - Dark Theme with Search */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
                    <div className="bg-[var(--bg-primary)] rounded-[8px] p-6 max-w-lg w-full mx-4 shadow-2xl border border-[var(--border)] max-h-[85vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
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
                                className="w-full px-3 py-2 rounded-[3px] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[#87898c] focus:outline-none focus:ring-1 focus:ring-[#5865F2] font-medium text-sm"
                            />
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-2 custom-scrollbar">
                            {filteredLeaderboard.length > 0 ? (
                                paginatedLeaderboard.map((user, index) => {
                                    const realIndex = (leaderboardPage - 1) * leaderboardPerPage + index;
                                    return (
                                        <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-[4px] border border-[var(--border)] ${realIndex === 0 ? 'bg-[#f0b232]/10 !border-[#f0b232]/30' : realIndex === 1 ? 'bg-[#b5bac1]/10 !border-[#b5bac1]/20' : realIndex === 2 ? 'bg-[#f0b232]/5 !border-[#f0b232]/10' : 'glass-card'}`}>
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center font-bold text-sm shrink-0 text-[var(--text-primary)]">
                                                {realIndex === 0 ? "👑" : realIndex === 1 ? "🥈" : realIndex === 2 ? "🥉" : `#${realIndex + 1}`}
                                            </div>
                                            <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-[var(--text-primary)] truncate text-sm">@{user.username}</div>
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
                            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-4">
                                <button
                                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                                    disabled={leaderboardPage === 1}
                                    className="px-3 py-1.5 rounded-[3px] bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium text-xs disabled:opacity-50 transition"
                                >
                                    ← Prev
                                </button>
                                <span className="text-[#87898c] text-xs font-semibold">
                                    Page {leaderboardPage} of {totalLeaderboardPages}
                                </span>
                                <button
                                    onClick={() => setLeaderboardPage(p => Math.min(totalLeaderboardPages, p + 1))}
                                    disabled={leaderboardPage === totalLeaderboardPages}
                                    className="px-3 py-1.5 rounded-[3px] bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium text-xs disabled:opacity-50 transition"
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
                    <div className="bg-[var(--bg-primary)] rounded-[8px] p-8 max-w-lg w-full mx-4 shadow-2xl relative border border-[var(--border)] max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-100 flex justify-center items-center gap-2">
                                <span className="text-[var(--text-secondary)]">👤</span> View User Profile
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Select User</label>{renderUserSearch()}</div>
                            {selectedUser && !userDetails && (
                                <button onClick={() => fetchUserDetails(selectedUser.user_id)} className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition text-sm">Load Profile</button>
                            )}
                            {userDetails && (
                                <div className="space-y-4 mt-4 animate-fade-in">
                                    <div className="glass-card rounded-[4px] p-4 border border-[var(--border)]">
                                        <h3 className="font-semibold text-[var(--text-primary)] mb-2 uppercase text-[12px] tracking-wide">🎣 Rods</h3>
                                        {userDetails.rods?.length > 0 ? userDetails.rods.map((r: any, idx: number) => {
                                            const level = r.level || r.rod_level || 0;
                                            const stats = getRodStats(r.rod_name, level);
                                            const isEquipped = userDetails.profile?.equipped_rod === r.rod_name;
                                            return (
                                                <div key={`${r.rod_name}_${idx}`} className={`py-2 border-b border-[var(--border)] last:border-0 ${isEquipped ? 'bg-[#248046]/10 -mx-2 px-2 rounded-[4px]' : ''}`}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-primary)] text-sm">{stats.emoji} {r.rod_name}</span>
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
                                    <div className="glass-card rounded-[4px] p-4 border border-[var(--border)]">
                                        <h3 className="font-semibold text-[var(--text-primary)] mb-2 uppercase text-[12px] tracking-wide">🐟 Top Fish</h3>
                                        {userDetails.inventory?.length > 0 ? userDetails.inventory.slice(0, 5).map((f: any, idx: number) => (
                                            <div key={`${f.fish_name}_${idx}`} className="flex justify-between py-1 border-b border-[var(--border)] last:border-0">
                                                <span className="truncate mr-2 text-[var(--text-primary)] text-sm italic font-medium">"{f.fish_name}"</span>
                                                <span className="font-bold text-[#248046] whitespace-nowrap text-sm">${(Number(f.price) || 0).toLocaleString()}</span>
                                            </div>
                                        )) : <p className="text-[#87898c] text-sm italic">No fish caught yet</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-4 border-t border-[var(--border)]">
                            <button onClick={closeModal} className="w-full py-2 bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium rounded-[3px] transition text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            {/* Fish Detail Modal */}
            {showFishDetail && selectedFish && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowFishDetail(false)}>
                    <div className="bg-[var(--bg-primary)] rounded-xl max-w-lg w-full mx-4 shadow-2xl relative border border-[var(--border)] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowFishDetail(false)} className="absolute top-4 right-6 text-[var(--text-secondary)] hover:text-white transition-colors p-2 hover:bg-[var(--bg-hover)] rounded-full z-10">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <div className="relative group text-left">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-transparent"></div>
                            <div className="relative w-full aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                                <img src={selectedFish.image_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" onError={(e: any) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/2274/2274532.png'; }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent"></div>
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-[var(--border)] text-[10px] font-black uppercase text-white tracking-widest">{selectedFish.rarity}</span>
                                </div>
                            </div>
                            <div className="p-8 relative -mt-12">
                                <div className="bg-[#12121a] rounded-xl p-6 border border-[var(--border)] shadow-2xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-3xl font-black text-white tracking-tighter">{selectedFish.name}</h3>
                                        <div className="text-right">
                                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-black tracking-widest">Base Value</div>
                                            <div className="text-2xl font-black text-[#248046] tracking-tighter">${(selectedFish.base_price || 0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 italic">
                                        {selectedFish.description || (
                                         selectedFish.rarity === 'Legendary' ? 'The stuff of myths. These ancient giants require the finest gear and absolute mastery.' :
                                         selectedFish.rarity === 'Epic' ? 'Exotic species with unique biological markers, highly valued in the marketplace.' :
                                         selectedFish.rarity === 'Rare' ? 'A prized catch for established fishers, found only in specific currents.' :
                                         selectedFish.rarity === 'Uncommon' ? 'More elusive than common species, requiring a bit more patience to reel in.' :
                                         'A frequent inhabitant of the shallow waters, easily caught with basic equipment.'
                                        )}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-6 mt-6">
                                        <div className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border)] text-center transition-colors hover:bg-white/[0.08]">
                                            <div className="text-[9px] text-[var(--text-tertiary)] uppercase font-black tracking-widest mb-1">Min Weight</div>
                                            <div className="text-white font-mono font-bold text-xl">{selectedFish.min_weight} <span className="text-[10px] text-[var(--text-tertiary)] font-sans">KG</span></div>
                                        </div>
                                        <div className="bg-[var(--bg-hover)] p-4 rounded-xl border border-[var(--border)] text-center transition-colors hover:bg-white/[0.08]">
                                            <div className="text-[9px] text-[var(--text-tertiary)] uppercase font-black tracking-widest mb-1">Max Weight</div>
                                            <div className="text-white font-mono font-bold text-xl">{selectedFish.max_weight} <span className="text-[10px] text-[var(--text-tertiary)] font-sans">KG</span></div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowFishDetail(false)}
                                        className="w-full mt-6 py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        Return to Encyclopedia
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ToastContainer toast={toast} onClose={hideToast} />
        </>
    );
}


