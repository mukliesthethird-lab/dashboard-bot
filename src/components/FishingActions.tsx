"use client";

import { useState, useEffect } from "react";

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

// From Fishing.py
const ROD_TYPES = [
    { name: "Common Rod", emoji: "🎣", price: 0 },
    { name: "Good Rod", emoji: "🎋", price: 20000 },
    { name: "Unique Rod", emoji: "🔱", price: 100000 },
    { name: "Masterwork Rod", emoji: "🌟", price: 500000 },
    { name: "Dyto Rod", emoji: "👑", price: 2000000 }
];

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
    const [selectedRod, setSelectedRod] = useState(ROD_TYPES[0].name);
    const [rodLevel, setRodLevel] = useState("0");
    const [selectedMaterial, setSelectedMaterial] = useState("Scrap");
    const [materialAmount, setMaterialAmount] = useState("10");
    const [selectedBuff, setSelectedBuff] = useState(BUFF_ITEMS[0].name);
    const [buffAmount, setBuffAmount] = useState("1");

    // Confirmation state
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<string>("");
    const [confirmMessage, setConfirmMessage] = useState<string>("");

    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [userDetails, setUserDetails] = useState<any>(null);

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
        setMessage(null);

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
                setMessage({ type: "success", text: `Gave ${selectedRod} +${rodLevel} to @${selectedUser.username}!` });
                setSelectedUser(null);
                setRodLevel("0");
                fetchStats();
            } else {
                setMessage({ type: "error", text: data.error || "Failed to give rod" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSubmitting(false);
    };

    const handleGiveMaterial = async () => {
        if (!selectedUser || !selectedMaterial || !materialAmount) return;
        setSubmitting(true);
        setMessage(null);

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
                setMessage({ type: "success", text: `Gave ${materialAmount}x ${selectedMaterial} to @${selectedUser.username}!` });
                setSelectedUser(null);
                fetchStats();
            } else {
                setMessage({ type: "error", text: data.error || "Failed to give material" });
            }
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSubmitting(false);
    };

    const handleGiveBuff = async () => {
        if (!selectedUser || !selectedBuff || !buffAmount) return;
        setSubmitting(true);
        setMessage(null);

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
                setMessage({ type: "success", text: `Gave ${buffAmount}x ${selectedBuff} to @${selectedUser.username}!` });
                setSelectedUser(null);
                fetchStats();
            } else {
                setMessage({ type: "error", text: data.error || "Failed to give buff" });
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
            const res = await fetch('/api/fishing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', user_id: selectedUser.user_id, guild_id: guildId })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: `Reset @${selectedUser.username}'s fishing data!` });
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
        setShowConfirm(false);
        setSelectedUser(null);
        setSearchQuery("");
        setSearchResults([]);
        setUserDetails(null);
        setConfirmAction("");
        setConfirmMessage("");
    };

    // User search component (inline)
    const renderUserSearch = () => (
        selectedUser ? (
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border-2 border-stone-200">
                <img src={selectedUser.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow" />
                <div className="flex-1">
                    <div className="font-bold text-stone-800">@{selectedUser.username}</div>
                    <div className="text-xs text-stone-500">ID: {selectedUser.user_id} • Fish: {selectedUser.total_catch}</div>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-stone-400 hover:text-red-500 text-xl">✕</button>
            </div>
        ) : (
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik User ID (min 1 karakter)..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-blue-400 focus:outline-none font-medium"
                    autoFocus
                />
                {searching && <div className="absolute right-3 top-3 text-blue-500 animate-pulse">⏳</div>}
                {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border-2 border-blue-200 shadow-2xl max-h-60 overflow-y-auto">
                        {searchResults.map(user => (
                            <button key={user.user_id} onClick={() => handleSelectUser(user)} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition text-left border-b border-stone-100 last:border-0">
                                <img src={user.avatar || defaultAvatar} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow" />
                                <div className="flex-1">
                                    <div className="font-bold text-stone-800">@{user.username}</div>
                                    <div className="text-xs text-stone-500">{user.user_id}</div>
                                </div>
                                <div className="font-black text-cyan-600 text-lg">🐟 {user.total_catch}</div>
                            </button>
                        ))}
                    </div>
                )}
                {searchQuery.length > 0 && searchQuery.length < 1 && (
                    <div className="text-xs text-stone-400 mt-1">Ketik minimal 1 karakter</div>
                )}
                {searchQuery.length >= 1 && searchResults.length === 0 && !searching && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border-2 border-stone-200 shadow-xl p-4 text-center text-stone-400">
                        Tidak ada hasil untuk "{searchQuery}"
                    </div>
                )}
            </div>
        )
    );

    return (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-5 border-2 border-blue-200 shadow-md">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-2xl font-black text-blue-700">{loading ? "..." : (stats?.totalFishers ?? 0).toLocaleString()}</div>
                    <div className="text-blue-600 font-bold text-xs">Fishers</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-2xl p-5 border-2 border-cyan-200 shadow-md">
                    <div className="text-3xl mb-2">🐟</div>
                    <div className="text-2xl font-black text-cyan-700">{loading ? "..." : (stats?.totalFishCaught ?? 0).toLocaleString()}</div>
                    <div className="text-cyan-600 font-bold text-xs">Fish Caught</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl p-5 border-2 border-indigo-200 shadow-md">
                    <div className="text-3xl mb-2">🎣</div>
                    <div className="text-2xl font-black text-indigo-700">{loading ? "..." : (stats?.totalRods ?? 0).toLocaleString()}</div>
                    <div className="text-indigo-600 font-bold text-xs">Rods</div>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-5 border-2 border-amber-200 shadow-md">
                    <div className="text-3xl mb-2">👑</div>
                    <div className="text-2xl font-black text-amber-700">{loading ? "..." : (stats?.topFishers?.[0]?.total_catch ?? 0).toLocaleString()}</div>
                    <div className="text-amber-600 font-bold text-xs">Top Fisher</div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200" : "bg-red-100 text-red-700 border-2 border-red-200"}`}>
                    {message.type === "success" ? "✅" : "❌"} {message.text}
                </div>
            )}

            {/* Fishing Actions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-blue-100 shadow-md mb-8">
                <h2 className="text-xl font-black text-stone-800 mb-4">⚡ Fishing Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <button onClick={() => { setShowGiveRod(true); setMessage(null); }} className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">🎣</div>
                        <div className="font-bold text-stone-700 text-xs">Give Rod</div>
                    </button>
                    <button onClick={() => { setShowGiveMaterial(true); setMessage(null); }} className="p-4 rounded-xl bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">🔩</div>
                        <div className="font-bold text-stone-700 text-xs">Give Material</div>
                    </button>
                    <button onClick={() => { setShowGiveBuff(true); setMessage(null); }} className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">🚬</div>
                        <div className="font-bold text-stone-700 text-xs">Give Buff</div>
                    </button>
                    <button onClick={() => { setShowViewUser(true); setMessage(null); }} className="p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">👤</div>
                        <div className="font-bold text-stone-700 text-xs">View User</div>
                    </button>
                    <button onClick={() => { setShowLeaderboard(true); fetchStats(); }} className="p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">📊</div>
                        <div className="font-bold text-stone-700 text-xs">Leaderboard</div>
                    </button>
                    <button onClick={() => { setShowResetUser(true); setMessage(null); }} className="p-4 rounded-xl bg-red-50 hover:bg-red-100 border-2 border-red-200 transition text-center group">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition">🗑️</div>
                        <div className="font-bold text-stone-700 text-xs">Reset User</div>
                    </button>
                </div>
            </div>

            {/* Give Rod Modal */}
            {showGiveRod && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-blue-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🎣</div>
                            <h2 className="text-2xl font-black text-stone-800">Give Fishing Rod</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Rod Type</label>
                                <select value={selectedRod} onChange={(e) => setSelectedRod(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-blue-400 focus:outline-none font-medium">
                                    {ROD_TYPES.map(rod => (<option key={rod.name} value={rod.name}>{rod.emoji} {rod.name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Level (+0 to +10)</label>
                                <input type="number" value={rodLevel} onChange={(e) => setRodLevel(e.target.value)} min="0" max="10" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-blue-400 focus:outline-none font-medium" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('give_rod', `Berikan ${selectedRod} +${rodLevel} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition disabled:opacity-50">{submitting ? "..." : "Give Rod"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Give Material Modal */}
            {showGiveMaterial && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-orange-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🔩</div>
                            <h2 className="text-2xl font-black text-stone-800">Give Material</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Material</label>
                                <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none font-medium">
                                    {MATERIALS.map(m => (<option key={m.name} value={m.name}>{m.emoji} {m.name} - {m.description}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Amount</label>
                                <input type="number" value={materialAmount} onChange={(e) => setMaterialAmount(e.target.value)} min="1" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-orange-400 focus:outline-none font-medium" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('give_material', `Berikan ${materialAmount}x ${selectedMaterial} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition disabled:opacity-50">{submitting ? "..." : "Give Material"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Give Buff Modal */}
            {showGiveBuff && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-purple-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">🚬</div>
                            <h2 className="text-2xl font-black text-stone-800">Give Buff Item</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>{renderUserSearch()}</div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Buff Item</label>
                                <select value={selectedBuff} onChange={(e) => setSelectedBuff(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-purple-400 focus:outline-none font-medium">
                                    {BUFF_ITEMS.map(b => (<option key={b.name} value={b.name}>{b.emoji} {b.name} ({b.duration}) - {b.description}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-1">Amount</label>
                                <input type="number" value={buffAmount} onChange={(e) => setBuffAmount(e.target.value)} min="1" className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-purple-400 focus:outline-none font-medium" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('give_buff', `Berikan ${buffAmount}x ${selectedBuff} kepada @${selectedUser?.username}?`)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition disabled:opacity-50">{submitting ? "..." : "Give Buff"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View User Modal */}
            {showViewUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border-4 border-emerald-200 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">👤</div>
                            <h2 className="text-2xl font-black text-stone-800">View User Profile</h2>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>{renderUserSearch()}</div>
                            {selectedUser && !userDetails && (
                                <button onClick={() => fetchUserDetails(selectedUser.user_id)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition">Load Profile</button>
                            )}
                            {userDetails && (
                                <div className="space-y-4 mt-4">
                                    <div className="bg-stone-50 rounded-xl p-4">
                                        <h3 className="font-bold text-stone-800 mb-2">🎣 Rods</h3>
                                        {userDetails.rods?.length > 0 ? userDetails.rods.map((r: any) => (
                                            <div key={r.rod_name} className="flex justify-between py-1 border-b border-stone-100 last:border-0">
                                                <span>{r.rod_name}</span>
                                                <span className="font-bold text-blue-600">+{r.rod_level}</span>
                                            </div>
                                        )) : <p className="text-stone-400 text-sm">No rods</p>}
                                    </div>
                                    <div className="bg-stone-50 rounded-xl p-4">
                                        <h3 className="font-bold text-stone-800 mb-2">🐟 Top Fish</h3>
                                        {userDetails.inventory?.length > 0 ? userDetails.inventory.slice(0, 5).map((f: any) => (
                                            <div key={f.fish_name} className="flex justify-between py-1 border-b border-stone-100 last:border-0">
                                                <span>{f.fish_name}</span>
                                                <span className="font-bold text-cyan-600">x{f.quantity}</span>
                                            </div>
                                        )) : <p className="text-stone-400 text-sm">No fish</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={closeModal} className="w-full mt-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Close</button>
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
                            <p className="text-red-500 text-sm font-bold">⚠️ Deletes ALL fishing data!</p>
                        </div>
                        <div><label className="block text-sm font-bold text-stone-600 mb-2">Select User</label>{renderUserSearch()}</div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={closeModal} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Cancel</button>
                            <button onClick={() => askConfirm('reset', `⚠️ RESET semua data fishing @${selectedUser?.username}? Tindakan ini TIDAK bisa dibatalkan!`)} disabled={submitting || !selectedUser} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50">{submitting ? "..." : "Reset User"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl border-4 border-cyan-200 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-3">📊</div>
                            <h2 className="text-2xl font-black text-stone-800">Top 10 Fishers</h2>
                        </div>
                        <div className="space-y-2">
                            {(stats?.topFishers ?? []).map((user, index) => (
                                <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' : index === 1 ? 'bg-slate-100' : index === 2 ? 'bg-orange-50' : 'bg-stone-50'}`}>
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-sm border">{index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}</div>
                                    <img src={user.avatar || defaultAvatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow" />
                                    <div className="flex-1 min-w-0"><div className="font-bold text-stone-800 truncate">@{user.username}</div></div>
                                    <div className="font-black text-cyan-600">🐟 {(user.total_catch ?? 0).toLocaleString()}</div>
                                </div>
                            ))}
                            {(stats?.topFishers?.length ?? 0) === 0 && (<div className="text-center py-8 text-stone-400">No fishers yet</div>)}
                        </div>
                        <button onClick={closeModal} className="w-full mt-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Close</button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-amber-300 animate-bounce-once" onClick={e => e.stopPropagation()}>
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

            {/* Info */}
            <div className="bg-gradient-to-r from-blue-100 to-cyan-50 rounded-3xl p-6 border-2 border-blue-200 shadow-md">
                <h3 className="text-lg font-black text-stone-800 mb-3">🎣 Fishing System Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-stone-600">
                    <div>
                        <h4 className="font-bold text-stone-700 mb-1">Rods (5 Types)</h4>
                        <p>Common → Good → Unique → Masterwork → Dyto</p>
                        <p className="text-xs text-stone-400">Each rod can be enhanced +0 to +10</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-700 mb-1">Materials</h4>
                        <p>🔩 Scrap - Common forging material</p>
                        <p>🦪 Pearl - Rare forging material</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-700 mb-1">Buffs</h4>
                        <p>🚬 Rokok Surya - Faster cooldown</p>
                        <p>🪝 Kail Mata Dua - Double catch</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-700 mb-1">Fish Rarities</h4>
                        <p>Common → Uncommon → Rare → Epic → Legendary</p>
                    </div>
                </div>
            </div>
        </>
    );
}
