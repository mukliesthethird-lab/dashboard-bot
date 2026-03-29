"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";
import { useSession } from "next-auth/react";
import { ToastContainer, useToast } from "./Toast";

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data
    const [backgrounds, setBackgrounds] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<any>(null);

    // Selection
    const [selectedBackgroundId, setSelectedBackgroundId] = useState<number>(0);

    const [originalState, setOriginalState] = useState<any>(null);
    const { toast, success, error, hideToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/profile");
                const data = await res.json();

                if (data.backgrounds) setBackgrounds(data.backgrounds);
                if (data.stats) setUserStats(data.stats);

                if (data.customization) {
                    setSelectedBackgroundId(data.customization.background_id || 0);

                    setOriginalState({
                        background_id: data.customization.background_id || 0
                    });
                }
            } catch (error) {
                console.error("Failed to load profile data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [isOpen]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    background_id: selectedBackgroundId
                })
            });

            if (res.ok) {
                setOriginalState({ background_id: selectedBackgroundId });
                success("Profile customization saved!");
            } else {
                error("Failed to save customization.");
            }
        } catch (err) {
            console.error("Failed to save profile settings", err);
            error("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = originalState && (
        selectedBackgroundId !== originalState.background_id
    );

    if (!isOpen) return null;

    // Use values directly from database (synced with Bot logic)
    const xp = userStats?.xp || 0;
    const level = userStats?.level || 1;

    // XP to reach current level: (level-1)^2 * 50
    const currentLevelXP = ((level - 1) ** 2) * 50;
    // XP to reach next level: (level)^2 * 50
    const nextLevelXP = (level ** 2) * 50;

    const progressXP = xp - currentLevelXP;
    const neededXPInLevel = nextLevelXP - currentLevelXP;
    const progressPercent = neededXPInLevel > 0
        ? Math.min(100, Math.floor((progressXP / neededXPInLevel) * 100))
        : 0;

    // Rank Logic from Profile.py (Synced)
    const getRank = (lvl: number) => {
        if (lvl >= 100) return "Dewa Ohio";
        if (lvl >= 50) return "Puh Sepuh";
        if (lvl >= 20) return "Elite";
        if (lvl >= 10) return "Warga Aktif";
        return "Pemula";
    };

    const userRank = getRank(level);
    const userName = session?.user?.name || "User Profile";
    const userAvatar = session?.user?.image || "/donpollo-icon.jpg";



    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#05050a]/90 backdrop-blur-md" onClick={onClose} />

            <div className="bg-[#0b0a10] border border-white/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-scale-in flex flex-col z-10 custom-scrollbar pb-12">

                {/* Header */}
                <div className="sticky top-0 z-20 bg-[#0b0a10]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white leading-none">Profile Settings</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Customize your public identity</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 min-h-[500px] flex items-center justify-center">
                        <CatLoader message="Loading your profile..." />
                    </div>
                ) : (
                    <div className="p-5 md:p-6 flex flex-col gap-6">
                        
                        {/* Top Section: Stats & Preview */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Stats Column */}
                            <div className="w-full lg:w-[42%] bg-[#0b0a10] p-5 rounded-3xl border border-white/5 shadow-2xl">
                                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Statistics</h3>
                                <div className="flex flex-col gap-3">
                                    <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                                        <StatRow icon="📊" label={`Level ${level}`} sub={userRank} color="bg-indigo-900/10" border="border-indigo-500/20" />
                                        <StatRow icon="✨" label={`${(xp / 1000).toFixed(1)}k`} sub="Experience" color="bg-emerald-900/10" border="border-emerald-500/20" />
                                        <StatRow icon="💬" label={`${(userStats?.total_messages || 0).toLocaleString()}`} sub="Messages" color="bg-blue-900/10" border="border-blue-500/20" />
                                        <StatRow icon="🎤" label={`${Math.floor((userStats?.voice_seconds || 0) / 3600)}h`} sub="Voice Time" color="bg-purple-900/10" border="border-purple-500/20" />
                                        <StatRow icon="🎣" label={`${(userStats?.total_catches || 0).toLocaleString()}`} sub="Catches" color="bg-cyan-900/10" border="border-cyan-500/20" />
                                        <StatRow icon="🎰" label={`$${((userStats?.total_gamble_amount || 0) / 1000).toFixed(1)}k`} sub="Gamble" color="bg-red-900/10" border="border-red-500/20" />
                                    </div>
                                    
                                    {/* Major Highlight: Compressed Balance for Billionaires */}
                                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent rounded-2xl border border-amber-500/30 shadow-inner group hover:from-amber-500/20 transition-all duration-300">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-xl shadow-lg border border-amber-500/40 grow-0 shrink-0 group-hover:scale-110 transition-transform">💰</div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">Total Balance</span>
                                            <span className="text-xl font-black text-amber-100 leading-none break-all">
                                                ${(userStats?.balance || 0).toLocaleString()} <span className="text-amber-500/60 text-xs font-bold uppercase ml-1">Koin</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div className="w-full lg:w-[58%] flex flex-col gap-4">
                                <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-widest flex items-center justify-between px-2">
                                    <span>Live Card Preview</span>
                                    <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full text-indigo-400">Profile Overview</span>
                                </h3>
                                <div className="w-full bg-[#05050a] rounded-3xl border border-white/5 p-4 flex items-center justify-center shadow-inner">
                                    <div className="w-full aspect-[1.8] rounded-[2.2cqw] overflow-hidden shadow-2xl border border-white/10 relative" style={{ containerType: 'inline-size' }}>
                                        {/* Background */}
                                        {selectedBackgroundId === 0 ? (
                                            <div className="absolute inset-0 bg-[#2b2d31]" />
                                        ) : (
                                            <div className="absolute inset-0 bg-[#2b2d31] overflow-hidden">
                                                <img
                                                    src={backgrounds.find(b => b.id === selectedBackgroundId)?.url || backgrounds.find(b => b.id === selectedBackgroundId)?.path}
                                                    className="absolute inset-0 w-full h-full object-cover z-[0]"
                                                    alt="Background Profile"
                                                />
                                                <div className="absolute inset-0 bg-black/40 z-[1]" />
                                            </div>
                                        )}
                                        {/* Foreground Layout */}
                                        <div className="absolute inset-0 p-[5.5cqw] flex flex-col z-[2] font-sans">
                                            <div className="flex gap-[4cqw] items-center">
                                                <div className="w-[20cqw] h-[20cqw] rounded-full border-[0.4cqw] border-[#2b2d31] overflow-hidden shrink-0 bg-[#1e1e23] shadow-[0_0_2cqw_rgba(88,101,242,0.8)] outline outline-[#5865F2] outline-[0.8cqw]">
                                                    <img
                                                        src={userAvatar}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = "/donpollo-icon.jpg" }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-[5cqw] font-normal text-white leading-tight font-sans tracking-wide">{userName}</h4>
                                                    <p className="text-[3.1cqw] font-normal text-[#B5BAC1] mt-[0.5cqw]">Level {level}</p>
                                                    <div className="flex items-center gap-[2cqw] mt-[1cqw] w-full">
                                                        <div className="flex-1 h-[2.5cqw] bg-[#3f4147] rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#5865F2] rounded-full" style={{ width: `${progressPercent}%` }} />
                                                        </div>
                                                        <div className="text-[2.2cqw] font-normal text-white shrink-0">{progressPercent}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-[1.1cqw] mt-[3.5cqw] w-full">
                                                {[
                                                    { label: "Koin", val: Number(userStats?.balance || 0).toLocaleString(), icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full bg-[#f1c40f] flex items-center justify-center border-[0.2cqw] border-black/20 overflow-hidden shadow-inner font-black text-black text-[2.5cqw] leading-none">$</div> },
                                                    { label: "Tangkapan", val: Number(userStats?.total_catches || 0).toLocaleString(), icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full flex items-center justify-center font-bold text-[#1abc9c] text-[2.5cqw] leading-none bg-[#1abc9c]/10">🐟</div> },
                                                    { label: "Rank", val: userRank, icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full flex items-center justify-center font-bold text-[#3498db] text-[2.5cqw] leading-none bg-[#3498db]/10">💠</div> }
                                                ].map((stat, i) => (
                                                    <div key={i} className="flex-1 bg-[#232428] rounded-[1cqw] flex items-center py-[2.5cqw] px-[2cqw] gap-[2cqw] border border-white/5">
                                                        {stat.icon}
                                                        <div className="flex flex-col min-w-0 justify-center">
                                                            <span className="text-[2.4cqw] font-normal text-[#B5BAC1] leading-tight">{stat.label}</span>
                                                            <div className={`font-bold text-white truncate leading-none mt-[0.2cqw] ${stat.val.length > 10 ? 'text-[2.6cqw]' : 'text-[3.1cqw]'}`}>{stat.val}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Background Assets Stretched */}
                        <div className="bg-[#0b0a10] p-5 rounded-3xl border border-white/5 shadow-xl">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 px-2">Unlocked Background Assets</h4>
                            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                                <div
                                    onClick={() => setSelectedBackgroundId(0)}
                                    className={`relative aspect-[16/9] rounded-[22px] border-2 transition-all cursor-pointer overflow-hidden ${selectedBackgroundId === 0 ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-gray-500 font-bold text-[10px] uppercase tracking-tighter">Default BG</span></div>
                                    {selectedBackgroundId === 0 && <div className="absolute top-2 right-2 bg-indigo-500 text-white p-0.5 rounded-full text-[8px] flex items-center justify-center w-4 h-4 shadow-lg z-10">✓</div>}
                                </div>
                                {backgrounds.map(bg => (
                                    <div
                                        key={bg.id}
                                        onClick={() => setSelectedBackgroundId(bg.id)}
                                        className={`relative aspect-[16/9] rounded-[22px] border-2 transition-all cursor-pointer overflow-hidden group ${selectedBackgroundId === bg.id ? 'border-[#5865F2] shadow-[0_0_15px_rgba(88,101,242,0.2)]' : 'border-white/5 hover:border-white/20'}`}
                                    >
                                        <img src={bg.url || bg.path} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={bg.name} />
                                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/80 backdrop-blur-sm border-t border-white/5 rounded-b-[inherit]">
                                            <p className="text-[9px] font-black text-gray-100 truncate text-center uppercase tracking-tighter">{bg.name}</p>
                                        </div>
                                        {selectedBackgroundId === bg.id && <div className="absolute top-2 right-2 bg-[#5865F2] text-white p-0.5 rounded-full text-[8px] flex items-center justify-center w-4 h-4 shadow-lg z-10">✓</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Standard Global Save Bar */}
                {hasChanges && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-[#030305]/95 backdrop-blur-3xl border border-white/10 px-4 py-3 rounded-xl shadow-2xl animate-fade-up flex items-center justify-between gap-6 min-w-[360px]">
                        <span className="text-gray-200 font-bold text-xs uppercase tracking-tight line-clamp-1">Careful — you have unsaved changes!</span>
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => setSelectedBackgroundId(originalState.background_id)}
                                className="text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-black rounded-lg transition-all flex items-center gap-2 group text-xs uppercase tracking-tighter disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <ToastContainer toast={toast} onClose={hideToast} />
            </div>
        </div>
    );
}
function StatRow({ icon, label, sub, color, border }: { icon: string, label: string, sub: string, color: string, border: string }) {
    return (
        <div className={`flex items-center gap-3 p-3 bg-black/20 rounded-2xl border ${border} hover:bg-black/40 hover:border-white/20 transition-all duration-300 group cursor-default shadow-sm hover:shadow-md`}>
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-sm shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-white font-black text-xs leading-none truncate group-hover:text-indigo-400 transition-colors">{label}</span>
                <span className="text-gray-500 text-[9px] font-bold uppercase tracking-tight mt-0.5">{sub}</span>
            </div>
        </div>
    );
}
