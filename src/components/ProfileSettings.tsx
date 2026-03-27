"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";
import DashboardHeader from "./DashboardHeader";
import PremiumCard from "./PremiumCard";

export default function ProfileSettings() {
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
        const loadData = async () => {
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
    }, []);

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

    if (loading) return <CatLoader message="Loading your profile customization..." />;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <DashboardHeader
                title="Profile Customization"
                subtitle="Personalize how your profile card looks across all servers."
                icon="👤"
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Left Column: Customization Options */}
                <div className="xl:col-span-8 space-y-8">
                    {/* Background Selector */}
                    <PremiumCard
                        title="Background Assets"
                        description="Choose a background for your profile card. Some are unlocked via achievements."
                        icon={<span className="text-2xl">🖼️</span>}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                            {/* Default Background */}
                            <div 
                                onClick={() => setSelectedBackgroundId(0)}
                                className={`relative aspect-[16/9] rounded-xl border-2 transition-all cursor-pointer overflow-hidden group ${selectedBackgroundId === 0 ? 'border-indigo-500 scale-[1.02] shadow-lg' : 'border-white/5 hover:border-white/20'}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-gray-400 font-bold text-sm">Default</span>
                                </div>
                                {selectedBackgroundId === 0 && (
                                    <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full text-[10px]">✅</div>
                                )}
                            </div>

                            {backgrounds.map((bg) => (
                                <div 
                                    key={bg.id}
                                    onClick={() => setSelectedBackgroundId(bg.id)}
                                    className={`relative aspect-[16/9] rounded-xl border-2 transition-all cursor-pointer overflow-hidden group ${selectedBackgroundId === bg.id ? 'border-indigo-500 scale-[1.02] shadow-lg' : 'border-white/5 hover:border-white/20'}`}
                                >
                                    {/* In a real app, this would be a URL. For now we use the path or a placeholder */}
                                    <div className="absolute inset-0 bg-gray-800 group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm">
                                        <p className="text-[10px] font-bold text-gray-200 truncate">{bg.name}</p>
                                    </div>
                                    {selectedBackgroundId === bg.id && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full text-[10px]">✅</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </PremiumCard>

                    {/* Badge Selector */}
                    <PremiumCard
                        title="Badge Showcase"
                        description={`Select up to 5 badges to display on your profile. (${selectedBadges.length}/5)`}
                        icon={<span className="text-2xl">🏆</span>}
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                            {badges.map((badge) => {
                                const isSelected = selectedBadges.includes(badge.id);
                                return (
                                    <div 
                                        key={badge.id}
                                        onClick={() => toggleBadge(badge.id)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-lg scale-105' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                    >
                                        <div className="w-12 h-12 flex items-center justify-center bg-black/20 rounded-full text-2xl">
                                            {/* Badge icon placeholder */}
                                            ✨
                                        </div>
                                        <span className="text-[10px] font-bold text-center text-gray-300 leading-tight h-6 flex items-center">{badge.name}</span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-indigo-500 text-white px-1.5 py-0.5 rounded-full text-[8px] font-black">ACTIVE</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </PremiumCard>
                </div>

                {/* Right Column: Preview & Stats */}
                <div className="xl:col-span-4 space-y-8">
                    {/* Live Preview Placeholder */}
                    <div className="glass-card rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span>📱</span> Card Preview
                            </h3>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-[#05050a]">
                            {/* Realistic Profile Card Preview */}
                            <div className="relative w-full max-w-[500px] aspect-[1.8/1] rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group select-none">
                                {/* Background Image/Gradient */}
                                {selectedBackgroundId === 0 ? (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e23] to-[#0a0a0f]" />
                                ) : (
                                    <div className="absolute inset-0 bg-gray-900 overflow-hidden">
                                        <div className="absolute inset-0 bg-black/30 z-[1]" />
                                        {/* Mock background image */}
                                        <div className="w-full h-full bg-indigo-900/40 relative">
                                             <div className="absolute inset-0 bg-[url('/donpollo-icon.jpg')] opacity-10 blur-xl scale-150" />
                                             <div className="absolute bottom-4 left-6 text-white/50 text-[10px] font-black uppercase tracking-tighter">
                                                {backgrounds.find(b => b.id === selectedBackgroundId)?.name || 'Custom BG'}
                                             </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Content Overlay (Following Profile.py layout) */}
                                <div className="absolute inset-0 p-[5.5%] flex flex-col justify-between z-[2]">
                                    {/* Top Section (Avatar, Name, Level) */}
                                    <div className="flex gap-[4.5%]">
                                        {/* Avatar (180x180 at 50,50 in 900x500 = ~11% pos, ~20% size) */}
                                        <div className="relative w-[20%] aspect-square rounded-full border-[3px] border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.4)] overflow-hidden shrink-0">
                                            <img 
                                                src={"/donpollo-icon.jpg"} 
                                                alt="Preview Avatar" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        
                                        {/* Text Section (at 260px in 900px = ~28%) */}
                                        <div className="flex-1 pt-[1%] space-y-[2%]">
                                            <h4 className="text-[min(1.8vw,1.5rem)] font-black text-white leading-tight truncate drop-shadow-lg">
                                                {"Username Here"}
                                            </h4>
                                            <p className="text-[min(1.2vw,1rem)] font-bold text-indigo-300/90 tracking-wide uppercase">
                                                Level {userStats?.level || 1}
                                            </p>
                                            
                                            {/* XP Bar (at 170px for 25px height in 500px = ~5%) */}
                                            <div className="w-[65%] h-[5%] bg-[#32323c] rounded-full overflow-hidden mt-[4%] border border-white/5">
                                                <div className="h-full w-2/3 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                            </div>
                                            <div className="text-[10px] font-black text-white/40 mt-1 uppercase tracking-widest pl-1">
                                                {userStats?.xp?.toLocaleString() || '1,250'} / 2,000 XP
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Stats Grid (at 300px in 500px = ~60%) */}
                                    <div className="grid grid-cols-3 gap-[3%] mt-[5%]">
                                        {[
                                            { label: "Koin", val: userStats?.balance?.toLocaleString() || '5,420', color: "text-amber-400", bg: "bg-amber-400/5" },
                                            { label: "Catches", val: userStats?.total_catches?.toLocaleString() || '12', color: "text-emerald-400", bg: "bg-emerald-400/5" },
                                            { label: "Rank", val: "Elite", color: "text-indigo-400", bg: "bg-indigo-400/5" }
                                        ].map((stat, i) => (
                                            <div key={i} className={`p-[10%] rounded-2xl ${stat.bg} border border-white/5 backdrop-blur-[2px] space-y-[2%]`}>
                                                <span className={`text-[min(.8vw,8px)] font-black uppercase tracking-tighter ${stat.color} opacity-70`}>{stat.label}</span>
                                                <div className="text-[min(1.1vw,.9rem)] font-black text-white truncate">{stat.val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Badges Section (at 410px in 500px = ~82%) */}
                                    <div className="mt-auto pt-[2%]">
                                        <div className="text-[min(.7vw,7px)] font-black text-amber-500/50 uppercase tracking-[.25em] mb-[3%]">
                                            Badge Showcase
                                        </div>
                                        <div className="flex gap-[2.5%]">
                                            {selectedBadges.map((b_id, i) => {
                                                const badge = badges.find(b => b.id === b_id);
                                                return (
                                                    <div 
                                                        key={i} 
                                                        className="w-[8%] aspect-square rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[min(1vw,10px)] relative group/badge"
                                                        title={badge?.name}
                                                    >
                                                        ✨
                                                    </div>
                                                );
                                            })}
                                            {Array.from({ length: 5 - selectedBadges.length }).map((_, i) => (
                                                <div key={i} className="w-[8%] aspect-square rounded-full bg-white/5 border border-white/5 opacity-10" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-white/5 text-center">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Live Dynamic Preview</p>
                        </div>
                    </div>

                    {/* Quick Stats Card */}
                    <div className="glass-card p-8 rounded-3xl border border-white/5">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Account Stats</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl text-xl">📊</span>
                                    <div>
                                        <p className="text-gray-200 font-bold">Level {userStats?.level || 1}</p>
                                        <p className="text-gray-500 text-[10px] font-bold">Current Milestone</p>
                                    </div>
                                </div>
                                <span className="text-2xl">🔥</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xl">✨</span>
                                    <div>
                                        <p className="text-gray-200 font-bold">{userStats?.xp?.toLocaleString() || 0} XP</p>
                                        <p className="text-gray-500 text-[10px] font-bold">Total Experience</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl text-xl">💰</span>
                                    <div>
                                        <p className="text-gray-200 font-bold">${userStats?.balance?.toLocaleString() || 0}</p>
                                        <p className="text-gray-500 text-[10px] font-bold">Hand Balance</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unsaved Changes Bar */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#05050a]/90 backdrop-blur-3xl border border-white/10 px-6 py-4 rounded-full shadow-2xl animate-fade-in-up flex items-center gap-8 min-w-[400px]">
                    <span className="text-gray-200 font-bold">Unsaved changes to your profile!</span>
                    <div className="flex items-center gap-4 ml-auto">
                        <button
                            onClick={() => {
                                setSelectedBackgroundId(originalState.background_id);
                                setSelectedBadges(originalState.shown_badges);
                            }}
                            className="text-gray-400 hover:text-white font-bold transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-full transition-all shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : "Save Customization"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
