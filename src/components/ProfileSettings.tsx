"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";
import { useSession } from "next-auth/react";

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
                setOriginalState({
                    background_id: selectedBackgroundId
                });
                onClose(); // Auto close on save success
            }
        } catch (error) {
            console.error("Failed to save profile settings", error);
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
            
            <div className="bg-[#0b0a10] border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative animate-scale-in flex flex-col z-10 custom-scrollbar">
                
                {/* Header */}
                <div className="sticky top-0 z-20 bg-[#0b0a10]/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">Profile Settings</h2>
                        <p className="text-sm text-gray-400">Customize your public profile card.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 min-h-[500px] flex items-center justify-center">
                        <CatLoader message="Loading your profile..." />
                    </div>
                ) : (
                    <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
                        
                        {/* Left Column: Stats & Settings */}
                        <div className="w-full lg:w-1/3 flex flex-col gap-8">
                            
                            {/* Realistic Account Stats matching user image */}
                            <div className="bg-[#0b0a10] p-6 rounded-[2rem] border border-[#3a2a60]/40 shadow-2xl">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Master Statistics</h3>
                                <div className="w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent mb-6" />
                                
                                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Primary Stats */}
                                    <StatRow icon="📊" label={`Level ${level}`} sub={userRank} color="bg-indigo-900/30" border="border-indigo-900/30" />
                                    <StatRow icon="✨" label={`${xp.toLocaleString()} XP`} sub="Total Experience" color="bg-emerald-900/30" border="border-emerald-900/30" />
                                    <StatRow icon="💰" label={`$${userStats?.balance?.toLocaleString() || 0}`} sub="Hand Balance" color="bg-amber-900/30" border="border-amber-900/30" />
                                    
                                    {/* Activity Stats */}
                                    <div className="pt-2 pb-1 border-b border-white/5"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Activity Log</span></div>
                                    <StatRow icon="💬" label={`${(userStats?.total_messages || 0).toLocaleString()}`} sub="Messages Sent" color="bg-blue-900/20" border="border-blue-900/20" />
                                    <StatRow icon="🎤" label={`${Math.floor((userStats?.voice_seconds || 0) / 3600)}h ${Math.floor(((userStats?.voice_seconds || 0) % 3600) / 60)}m`} sub="Voice Interaction" color="bg-purple-900/20" border="border-purple-900/20" />
                                    <StatRow icon="🎵" label={`${(userStats?.total_songs_played || 0).toLocaleString()}`} sub="Songs Played" color="bg-rose-900/20" border="border-rose-900/20" />
                                    <StatRow icon="📅" label={`${userStats?.daily_streak || 0} Days`} sub="Login Streak" color="bg-orange-900/20" border="border-orange-900/20" />

                                    {/* Game Stats */}
                                    <div className="pt-2 pb-1 border-b border-white/5"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Achievements</span></div>
                                    <StatRow icon="🎣" label={`${(userStats?.total_catches || 0).toLocaleString()}`} sub="Total Catches" color="bg-cyan-900/20" border="border-cyan-900/20" />
                                    <StatRow icon="🌟" label={`${userStats?.rare_catches || 0}`} sub="Rare & Legendary" color="bg-fuchsia-900/20" border="border-fuchsia-900/20" />
                                    <StatRow icon="🎰" label={`$${(userStats?.total_gamble_amount || 0).toLocaleString()}`} sub="Gambling Turnover" color="bg-red-900/20" border="border-red-900/20" />
                                    <StatRow icon="🖼️" label={`${userStats?.unlocked_backgrounds || 0}`} sub="Custom Backgrounds" color="bg-slate-900/20" border="border-slate-900/20" />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex flex-col gap-6">
                                {/* BG Selector */}
                                <div>
                                    <h4 className="text-sm font-bold text-white mb-3">Background Asset</h4>
                                    <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                        <div 
                                            onClick={() => setSelectedBackgroundId(0)}
                                            className={`relative aspect-[16/9] rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${selectedBackgroundId === 0 ? 'border-indigo-500' : 'border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-gray-400 font-bold text-xs">Default</span></div>
                                            {selectedBackgroundId === 0 && <div className="absolute top-1 right-1 bg-indigo-500 text-white p-0.5 rounded-full text-[8px]">✅</div>}
                                        </div>
                                        {backgrounds.map(bg => (
                                            <div 
                                                key={bg.id}
                                                onClick={() => setSelectedBackgroundId(bg.id)}
                                                className={`relative aspect-[16/9] rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${selectedBackgroundId === bg.id ? 'border-[#5865F2]' : 'border-white/5 hover:border-white/20'}`}
                                            >
                                                <img src={bg.url || bg.path} className="absolute inset-0 w-full h-full object-cover" alt={bg.name} />
                                                <div className="absolute bottom-0 left-0 right-0 p-[2px] bg-black/60 backdrop-blur-sm"><p className="text-[9px] font-bold text-gray-100 truncate text-center">{bg.name}</p></div>
                                                {selectedBackgroundId === bg.id && <div className="absolute top-1 right-1 bg-[#5865F2] text-white p-0.5 rounded-full text-[8px] shadow-lg">✅</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Right Column: Profile Preview */}
                        <div className="w-full lg:w-2/3 flex flex-col gap-4">
                            <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center justify-between">
                                <span>Live Card Preview</span>
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full text-white">Dynamic Scale</span>
                            </h3>
                            
                            {/* Scalable Container Query Preview */}
                            <div className="w-full bg-[#05050a] rounded-3xl border border-white/5 p-4 flex items-center justify-center">
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
                                            {/* Name overlay removed since image is now rendered */}
                                        </div>
                                    )}

                                    {/* Foreground Layout */}
                                    <div className="absolute inset-0 p-[5.5cqw] flex flex-col z-[2] font-sans">
                                        {/* Avatar & Info row */}
                                        <div className="flex gap-[4cqw] items-center">
                                            <div className="w-[17cqw] h-[17cqw] rounded-full border-[0.3cqw] border-[#2b2d31] overflow-hidden shrink-0 bg-[#1e1e23] shadow-[0_0_2cqw_rgba(88,101,242,0.8)] outline outline-[#5865F2] outline-[0.3cqw]">
                                                <img 
                                                    src={userAvatar} 
                                                    alt="Avatar" 
                                                    className="w-full h-full object-cover" 
                                                    onError={(e) => { (e.target as HTMLImageElement).src = "/donpollo-icon.jpg" }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-[6cqw] font-normal text-white leading-tight font-sans tracking-wide">
                                                    {userName}
                                                </h4>
                                                <p className="text-[3.3cqw] font-normal text-[#B5BAC1] mt-[0.5cqw]">
                                                    Level {level}
                                                </p>
                                                
                                                {/* XP Bar */}
                                                <div className="flex items-center gap-[2cqw] mt-[1cqw] w-full">
                                                    <div className="flex-1 h-[2.5cqw] bg-[#3f4147] rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[#5865F2] rounded-full" 
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[2.2cqw] font-normal text-white shrink-0">
                                                        {progressPercent}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Row (3 Boxes matching Discord) */}
                                        <div className="flex gap-[1.5cqw] mt-[2.5cqw] w-[95%]">
                                            {[
                                                { label: "Koin", val: userStats?.balance?.toLocaleString() || '0', icon: (
                                                    <div className="w-[3.5cqw] h-[3.5cqw] rounded-full bg-[#f1c40f] flex items-center justify-center border-[0.2cqw] border-black/20 overflow-hidden shadow-inner font-black text-black text-[2.2cqw] leading-none">$</div>
                                                ) },
                                                { label: "Tangkapan", val: userStats?.total_catches?.toLocaleString() || '0', icon: (
                                                    <div className="w-[3.5cqw] h-[3.5cqw] rounded-full flex items-center justify-center font-bold text-[#1abc9c] text-[2.2cqw] leading-none bg-[#1abc9c]/10">🐟</div>
                                                ) },
                                                { label: "Rank", val: userRank, icon: (
                                                    <div className="w-[3.5cqw] h-[3.5cqw] rounded-full flex items-center justify-center font-bold text-[#3498db] text-[2.2cqw] leading-none bg-[#3498db]/10">💠</div>
                                                ) }
                                            ].map((stat, i) => (
                                                <div key={i} className="flex-1 bg-[#232428] rounded-[1cqw] flex items-center py-[1cqw] px-[1.5cqw] gap-[1.5cqw]">
                                                    {stat.icon}
                                                    <div className="flex flex-col min-w-0 justify-center">
                                                        <span className="text-[1.8cqw] font-normal text-[#B5BAC1] leading-tight">{stat.label}</span>
                                                        <div className="text-[2.2cqw] font-bold text-white truncate leading-none mt-[0.2cqw]">{stat.val}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* Footer Save Button */}
                {hasChanges && (
                    <div className="sticky bottom-0 z-20 bg-[#0b0a10]/95 backdrop-blur-xl border-t border-white/5 p-4 flex justify-end gap-3 rounded-b-3xl">
                        <button
                            onClick={() => {
                                setSelectedBackgroundId(originalState.background_id);
                            }}
                            className="px-6 py-2.5 text-gray-400 hover:text-white font-bold transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2"
                        >
                            {saving ? "Saving..." : "Save Customization"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
function StatRow({ icon, label, sub, color, border }: { icon: string, label: string, sub: string, color: string, border: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-lg shadow-inner border ${border}`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-white font-black text-base leading-tight">{label}</span>
                    <span className="text-gray-500 text-[10px] font-bold uppercase">{sub}</span>
                </div>
            </div>
        </div>
    );
}
