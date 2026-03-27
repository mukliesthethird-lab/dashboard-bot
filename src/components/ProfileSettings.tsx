"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data
    const [backgrounds, setBackgrounds] = useState<any[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [userStats, setUserStats] = useState<any>(null);
    
    // Selection
    const [selectedBackgroundId, setSelectedBackgroundId] = useState<number>(0);
    const [selectedBadges, setSelectedBadges] = useState<number[]>([]);

    const [originalState, setOriginalState] = useState<any>(null);

    useEffect(() => {
        if (!isOpen) return;
        
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/profile");
                const data = await res.json();

                if (data.backgrounds) setBackgrounds(data.backgrounds);
                if (data.badges) setBadges(data.badges);
                if (data.stats) setUserStats(data.stats);

                if (data.customization) {
                    setSelectedBackgroundId(data.customization.background_id || 0);
                    const userBadges = typeof data.customization.shown_badges === 'string' 
                        ? JSON.parse(data.customization.shown_badges) 
                        : data.customization.shown_badges || [];
                    setSelectedBadges(userBadges);
                    
                    setOriginalState({
                        background_id: data.customization.background_id || 0,
                        shown_badges: userBadges
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
                    background_id: selectedBackgroundId,
                    shown_badges: selectedBadges
                })
            });

            if (res.ok) {
                setOriginalState({
                    background_id: selectedBackgroundId,
                    shown_badges: selectedBadges
                });
                onClose(); // Auto close on save success
            }
        } catch (error) {
            console.error("Failed to save profile settings", error);
        } finally {
            setSaving(false);
        }
    };

    const toggleBadge = (id: number) => {
        if (selectedBadges.includes(id)) {
            setSelectedBadges(selectedBadges.filter(b => b !== id));
        } else {
            if (selectedBadges.length >= 5) {
                alert("You can only showcase up to 5 badges!");
                return;
            }
            setSelectedBadges([...selectedBadges, id]);
        }
    };

    const hasChanges = originalState && (
        selectedBackgroundId !== originalState.background_id ||
        JSON.stringify(selectedBadges.sort()) !== JSON.stringify(originalState.shown_badges.sort())
    );

    if (!isOpen) return null;

    // Calculate XP Progress
    const xp = userStats?.xp || 0;
    const level = userStats?.level || 1;
    const xpNeededForCurrent = ((level - 1) ** 2) * 50;
    const xpNeededForNext = (level ** 2) * 50;
    const progressXP = xp - xpNeededForCurrent;
    const neededXP = xpNeededForNext - xpNeededForCurrent;
    const progressPercent = neededXP > 0 ? Math.min(100, Math.max(0, Math.floor((progressXP / neededXP) * 100))) : 0;

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
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Account Stats</h3>
                                <div className="w-full h-[1px] bg-gradient-to-r from-white/10 to-transparent mb-6" />
                                <div className="space-y-6">
                                    {/* Level */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center text-xl shadow-inner border border-indigo-900/30">
                                                📊
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-lg leading-tight">Level {level}</span>
                                                <span className="text-gray-500 text-[11px] font-bold">Current Milestone</span>
                                            </div>
                                        </div>
                                        <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,100,0,0.5)]">🔥</span>
                                    </div>
                                    
                                    {/* XP */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-[#102a20] flex items-center justify-center text-xl shadow-inner border border-emerald-900/30">
                                                ✨
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-lg leading-tight">{xp.toLocaleString()} XP</span>
                                                <span className="text-gray-500 text-[11px] font-bold">Total Experience</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-[#3a2a10] flex items-center justify-center text-xl shadow-inner border border-amber-900/30">
                                                💰
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-black text-lg leading-tight">${userStats?.balance?.toLocaleString() || 0}</span>
                                                <span className="text-gray-500 text-[11px] font-bold">Hand Balance</span>
                                            </div>
                                        </div>
                                    </div>
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
                                                className={`relative aspect-[16/9] rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${selectedBackgroundId === bg.id ? 'border-indigo-500' : 'border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="absolute inset-0 bg-gray-800" />
                                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60"><p className="text-[8px] font-bold text-gray-200 truncate">{bg.name}</p></div>
                                                {selectedBackgroundId === bg.id && <div className="absolute top-1 right-1 bg-indigo-500 text-white p-0.5 rounded-full text-[8px]">✅</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Badge Selector */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-bold text-white">Showcase Badges</h4>
                                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{selectedBadges.length}/5</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {badges.map(badge => {
                                            const isSelected = selectedBadges.includes(badge.id);
                                            return (
                                                <div 
                                                    key={badge.id}
                                                    onClick={() => toggleBadge(badge.id)}
                                                    className={`h-10 px-3 flex items-center gap-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                >
                                                    <span className="text-sm">✨</span>
                                                    <span className="text-xs font-bold whitespace-nowrap">{badge.name}</span>
                                                </div>
                                            );
                                        })}
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
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e23] to-[#0a0a0f]" />
                                    ) : (
                                        <div className="absolute inset-0 bg-gray-900 overflow-hidden">
                                            <div className="absolute inset-0 bg-black/30 z-[1]" />
                                            <div className="absolute inset-0 bg-[url('/donpollo-icon.jpg')] opacity-10 blur-xl scale-150" />
                                            <div className="absolute bottom-[2cqw] left-[3cqw] text-white/50 text-[1cqw] font-black uppercase tracking-tighter">
                                                {backgrounds.find(b => b.id === selectedBackgroundId)?.name || 'Custom BG'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Foreground Layout */}
                                    <div className="absolute inset-0 p-[5.5cqw] flex flex-col z-[2] font-sans">
                                        {/* Avatar & Info row */}
                                        <div className="flex gap-[5cqw] items-start">
                                            <div className="w-[20cqw] h-[20cqw] rounded-full border-[0.6cqw] border-[#5865F2] overflow-hidden shrink-0 shadow-[0_0_2cqw_rgba(88,101,242,0.3)]">
                                                <img src="/donpollo-icon.jpg" alt="Avatar" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 pt-[1cqw]">
                                                {/* Wait, the username might not be available in stats, fallback to a placeholder */}
                                                <h4 className="text-[5.3cqw] font-bold text-white leading-tight drop-shadow-md tracking-tight">
                                                    User Profile
                                                </h4>
                                                <p className="text-[2.9cqw] font-medium text-[#9a9dbd] mt-[0.5cqw]">
                                                    Level {level}
                                                </p>
                                                
                                                {/* XP Bar */}
                                                <div className="flex items-center gap-[1.5cqw] mt-[1.5cqw] w-full">
                                                    <div className="flex-1 h-[3.1cqw] bg-[#2a2a30] rounded-full overflow-hidden border border-white/5">
                                                        <div 
                                                            className="h-full bg-[#5865F2] rounded-full shadow-[0_0_1.5cqw_rgba(88,101,242,0.5)] transition-all duration-500 ease-out" 
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[2cqw] font-bold text-white opacity-80 shrink-0 min-w-[3cqw]">
                                                        {progressPercent}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex gap-[3.5cqw] mt-[4cqw] w-[95%]">
                                            {[
                                                { label: "Koin", val: userStats?.balance?.toLocaleString() || '0', icon: "💰", color: "#FFD700" },
                                                { label: "Tangkapan", val: userStats?.total_catches?.toLocaleString() || '0', icon: "🐟", color: "#00FA9A" },
                                                { label: "Rank", val: "Pemula", icon: "💠", color: "#87CEFA" }
                                            ].map((stat, i) => (
                                                <div key={i} className="flex-1 h-[8.3cqw] bg-[#666666]/30 backdrop-blur-md rounded-[1.3cqw] flex items-center p-[1cqw] gap-[1cqw] border border-white/10">
                                                    <div className="w-[5cqw] h-[5cqw] rounded-full bg-white/10 flex items-center justify-center text-[2.5cqw] shrink-0">
                                                        {stat.icon}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 pr-[1cqw] justify-center h-full">
                                                        <span className="text-[1.5cqw] font-bold text-[#b0b3c5] uppercase tracking-tight truncate leading-[1.2]">{stat.label}</span>
                                                        <div className="text-[2.4cqw] font-bold text-white truncate leading-[1.2]">{stat.val}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Badges Showcase */}
                                        <div className="mt-[3.5cqw]">
                                            <div className="text-[1.8cqw] font-bold text-[#FFD700] uppercase tracking-tight mb-[1.5cqw] flex items-center gap-[1cqw]">
                                                <span className="opacity-50 text-[1.2cqw]">---</span> Badge Showcase <span className="opacity-50 text-[1.2cqw]">---</span>
                                            </div>
                                            <div className="flex gap-[1.5cqw]">
                                                {selectedBadges.map((b_id, i) => (
                                                    <div key={i} className="w-[6.1cqw] h-[6.1cqw] rounded-full bg-[#FFD700]/10 border-[0.2cqw] border-[#FFD700] flex items-center justify-center text-[3cqw] shadow-[0_0_1cqw_rgba(255,215,0,0.2)]">
                                                        👑
                                                    </div>
                                                ))}
                                                {selectedBadges.length === 0 && (
                                                     <div className="w-[6.1cqw] h-[6.1cqw] rounded-full bg-[#FFD700]/10 border-[0.2cqw] border-[#FFD700] flex items-center justify-center text-[3cqw] shadow-[0_0_1cqw_rgba(255,215,0,0.2)] opacity-20">
                                                        👑
                                                     </div>
                                                )}
                                            </div>
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
                                setSelectedBadges(originalState.shown_badges);
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
