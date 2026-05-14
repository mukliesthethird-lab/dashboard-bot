"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ToastContainer, useToast } from "./Toast";
import CustomDropdown from "./CustomDropdown";
import InteractiveColorPicker from "./InteractiveColorPicker";

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
    const [userStats, setUserStats] = useState<any>({ 
        level: 1, xp: 0, balance: 0, total_messages: 0, 
        voice_seconds: 0, total_catches: 0, unlocked_backgrounds: 0 
    });

    // Selection
    const [selectedBackgroundId, setSelectedBackgroundId] = useState<number>(0);
    const [selectedFont, setSelectedFont] = useState<string>("Arial");
    const [selectedTextColor, setSelectedTextColor] = useState<string>("#FFFFFF");
    const [selectedXpBarColor, setSelectedXpBarColor] = useState<string>("#6366f1");

    const [originalState, setOriginalState] = useState<any>(null);
    const { toast, success, error, hideToast } = useToast();

    // UI state for custom pickers
    const [activePicker, setActivePicker] = useState<string | null>(null);

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
                    setSelectedFont(data.customization.font_family || "Arial");
                    setSelectedTextColor(data.customization.text_color || "#FFFFFF");
                    setSelectedXpBarColor(data.customization.xp_bar_color || "#6366f1");

                    setOriginalState({
                        background_id: data.customization.background_id || 0,
                        font_family: data.customization.font_family || "Arial",
                        text_color: data.customization.text_color || "#FFFFFF",
                        xp_bar_color: data.customization.xp_bar_color || "#6366f1"
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
                    font_family: selectedFont,
                    text_color: selectedTextColor,
                    xp_bar_color: selectedXpBarColor
                })
            });

            if (res.ok) {
                setOriginalState({ 
                    background_id: selectedBackgroundId,
                    font_family: selectedFont,
                    text_color: selectedTextColor,
                    xp_bar_color: selectedXpBarColor
                });
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
        selectedBackgroundId !== originalState.background_id ||
        selectedFont !== originalState.font_family ||
        selectedTextColor !== originalState.text_color ||
        selectedXpBarColor !== originalState.xp_bar_color
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

    const FONTS = [
        "Arial", "Inter", "Roboto", "Poppins", "Montserrat", "Geist", "System",
        "Open Sans", "Lato", "Raleway", "Ubuntu", "Oswald", "Playfair Display",
        "Merriweather", "Lora", "Nunito", "Fira Sans", "Work Sans", "Zilla Slab",
        "Bitter", "Kanit", "Quicksand", "Josefin Sans"
    ].map(f => ({ 
        value: f, 
        label: f,
        style: { fontFamily: f } // This will be used by CustomDropdown to show preview
    }));

    const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
        const isPickerOpen = activePicker === label;
        
        return (
            <div className="flex flex-col gap-1.5 relative">
                <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest px-1">{label}</span>
                
                {/* Compact Swatch Card */}
                <div className="flex items-center gap-3 bg-[var(--bg-hover)] border border-[var(--border)] p-2.5 rounded-lg hover:border-indigo-500/30 transition-all group cursor-pointer active:scale-95 shadow-sm" onClick={() => setActivePicker(isPickerOpen ? null : label)}>
                    {/* Tiny Swatch */}
                    <div className="relative shrink-0 w-10 h-10 border border-[var(--border)] rounded-md overflow-hidden shadow-inner group-hover:border-indigo-500/50">
                        <div className="w-full h-full" style={{ backgroundColor: value }} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </div>
                    </div>

                    {/* Compact Label & Action */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-gray-100 tracking-tight uppercase">{value.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[7px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest truncate">Click to customize</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#05050a]/90 backdrop-blur-md" onClick={onClose} />

            <div className="bg-[#0b0a10] border border-[var(--border)] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-scale-in flex flex-col z-10 custom-scrollbar pb-12 glass-heavy">
                {/* Mesh Gradient Background Layer */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse-glow" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
                </div>

                {/* Header */}
                <div className="sticky top-0 z-20 bg-[#0b0a10]/40 backdrop-blur-3xl border-b border-[var(--border)] px-8 py-6 flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white leading-none tracking-tight gradient-text-animated">Profile Settings</h2>
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Customize your public identity
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] hover:scale-110 active:scale-95 text-white transition-all duration-300 group border border-[var(--border)]">
                        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 min-h-[500px] flex items-center justify-center">
                        <Loading message="Loading your profile..." />
                    </div>
                ) : (
                    <div className="p-5 md:p-6 flex flex-col gap-6">
                        
                        {/* Top Section: Stats & Preview */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Stats Column */}
                            <div className="w-full lg:w-[42%] flex flex-col gap-5 z-10">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Live Statistics</h3>
                                </div>
                                
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-2 pt-2 custom-scrollbar animate-fade-up">
                                        <StatCard icon="📊" label={`Lvl ${level}`} sub={userRank} color="from-indigo-500/20 to-indigo-500/5" border="border-indigo-500/20" glow="shadow-indigo-500/10" delay="0ms" />
                                        <StatCard icon="✨" label={`${(xp / 1000).toFixed(1)}k`} sub="Experience" color="from-emerald-500/20 to-emerald-500/5" border="border-emerald-500/20" glow="shadow-emerald-500/10" delay="50ms" />
                                        <StatCard icon="💬" label={`${(userStats?.total_messages || 0).toLocaleString()}`} sub="Messages" color="from-blue-500/20 to-blue-500/5" border="border-blue-500/20" glow="shadow-blue-500/10" delay="100ms" />
                                        <StatCard icon="🎤" label={`${Math.floor((userStats?.voice_seconds || 0) / 3600)}h`} sub="Voice" color="from-purple-500/20 to-purple-500/5" border="border-purple-500/20" glow="shadow-purple-500/10" delay="150ms" />
                                        <StatCard icon="🎣" label={`${(userStats?.total_catches || 0).toLocaleString()}`} sub="Catches" color="from-cyan-500/20 to-cyan-500/5" border="border-cyan-500/20" glow="shadow-cyan-500/10" delay="200ms" />
                                        <StatCard icon="🎰" label={`$${((userStats?.total_gamble_amount || 0) / 1000).toFixed(1)}k`} sub="Gamble" color="from-red-500/20 to-red-500/5" border="border-red-500/20" glow="shadow-red-500/10" delay="250ms" />
                                    </div>
                                    
                                    {/* Subdued Balance Slab */}
                                    <div className="relative group p-4 bg-white/[0.03] border border-[var(--border)] shadow-xl overflow-hidden transition-all duration-500 hover:border-amber-500/30 hover:bg-white/[0.05] animate-fade-up animate-delay-300">
                                        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--bg-secondary)]mber-500/40 group-hover:w-1.5 transition-all duration-500 my-3" />
                                        <div className="relative flex items-center justify-between px-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-[var(--bg-secondary)]mber-500/10 flex items-center justify-center text-xl shadow-inner border border-amber-500/20 group-hover:scale-110 transition-transform duration-500">
                                                    💰
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[var(--text-tertiary)] text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1">Current Balance</span>
                                                    <span className="text-lg font-black text-white tracking-tight break-all leading-none group-hover:text-amber-100 transition-colors">
                                                        {(userStats?.balance || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-amber-500/40 text-[10px] font-black uppercase tracking-widest group-hover:text-amber-500/60 transition-colors">Koin</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Column */}
                            <div className="w-full lg:w-[58%] flex flex-col gap-5 z-10">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Live Card Preview</h3>
                                </div>
                                <div className="w-full bg-[#05050a] border border-[var(--border)] p-5 flex items-center justify-center shadow-inner h-full min-h-[300px]">
                                    <div className="w-full aspect-[1.8] rounded-[2.2cqw] overflow-hidden shadow-2xl border border-[var(--border)] relative" style={{ containerType: 'inline-size' }}>
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
                                        <div className="absolute inset-0 p-[5.5cqw] flex flex-col z-[2]" style={{ fontFamily: selectedFont }}>
                                            <div className="flex gap-[4cqw] items-center">
                                                <div 
                                                    className="w-[20cqw] h-[20cqw] rounded-full border-[0.4cqw] border-[#2b2d31] overflow-hidden shrink-0 bg-[#1e1e23] shadow-inner outline-[0.8cqw] outline"
                                                    style={{ borderColor: '#2b2d31', outlineColor: selectedXpBarColor, boxShadow: `0 0 2cqw ${selectedXpBarColor}CC` }}
                                                >
                                                    <img
                                                        src={userAvatar}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = "/donpollo-icon.jpg" }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-[5cqw] font-normal leading-tight tracking-wide" style={{ color: selectedTextColor }}>{userName}</h4>
                                                    <p className="text-[3.1cqw] font-normal mt-[0.5cqw]" style={{ color: selectedTextColor, opacity: 0.7 }}>Level {level}</p>
                                                    <div className="flex items-center gap-[2cqw] mt-[1cqw] w-full">
                                                        <div className="flex-1 h-[2.5cqw] bg-[#3f4147] rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%`, backgroundColor: selectedXpBarColor }} />
                                                        </div>
                                                        <div className="text-[2.2cqw] font-normal shrink-0" style={{ color: selectedTextColor }}>{progressPercent}%</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-[1.1cqw] mt-[3.5cqw] w-full">
                                                {[
                                                    { label: "Koin", val: Number(userStats?.balance || 0).toLocaleString(), icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full bg-[#f1c40f] flex items-center justify-center border-[0.2cqw] border-black/20 overflow-hidden shadow-inner font-black text-black text-[2.5cqw] leading-none">$</div> },
                                                    { label: "Tangkapan", val: Number(userStats?.total_catches || 0).toLocaleString(), icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full flex items-center justify-center font-bold text-[#1abc9c] text-[2.5cqw] leading-none bg-[#1abc9c]/10">🐟</div> },
                                                    { label: "Rank", val: userRank, icon: <div className="w-[4.4cqw] h-[4.4cqw] rounded-full flex items-center justify-center font-bold text-[#3498db] text-[2.5cqw] leading-none bg-[#3498db]/10">💠</div> }
                                                ].map((stat, i) => (
                                                    <div key={i} className="flex-1 bg-[#232428]/80 backdrop-blur-sm rounded-[1cqw] flex items-center py-[2.5cqw] px-[2cqw] gap-[2cqw] border border-[var(--border)]">
                                                        {stat.icon}
                                                        <div className="flex flex-col min-w-0 justify-center">
                                                            <span className="text-[2.4cqw] font-normal leading-tight opacity-70 text-white">{stat.label}</span>
                                                            <div className={`font-bold truncate leading-none mt-[0.2cqw] text-white ${stat.val.length > 10 ? 'text-[2.6cqw]' : 'text-[3.1cqw]'}`}>{stat.val}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Customization Section: Fonts & Colors */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 animate-fade-up animate-delay-200">
                            {/* Font Selection */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Select Font</h4>
                                </div>
                                <div className="bg-[var(--bg-hover)] border border-[var(--border)] p-4 flex flex-col justify-between h-[115px]">
                                    <CustomDropdown 
                                        options={FONTS}
                                        value={selectedFont}
                                        onChange={setSelectedFont}
                                        placeholder="Choose a Font"
                                        className="w-full"
                                    />
                                    <div className="flex items-center justify-between px-1 h-8">
                                        <span className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Preview Style</span>
                                        <span className="text-[10px] text-[var(--text-primary)] truncate max-w-[200px]" style={{ fontFamily: selectedFont }}>The quick brown fox jumps over the lazy dog.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Text & XP Bar Colors</h4>
                                </div>
                                <div className="bg-[var(--bg-hover)] border border-[var(--border)] p-4 flex items-center justify-center h-[115px]">
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <ColorPicker 
                                            label="Text Color" 
                                            value={selectedTextColor} 
                                            onChange={setSelectedTextColor} 
                                        />
                                        <ColorPicker 
                                            label="XP Bar Color" 
                                            value={selectedXpBarColor} 
                                            onChange={setSelectedXpBarColor} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Background Assets */}
                        <div className="relative z-10 flex flex-col gap-5">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Unlocked Backgrounds</h4>
                                <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-wider">{backgrounds.length + 1} Assets</span>
                            </div>
                            
                            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[220px] overflow-y-auto pr-2 pt-2 custom-scrollbar">
                                <div
                                    onClick={() => setSelectedBackgroundId(0)}
                                    className={`group relative aspect-[16/9] border-2 transition-all duration-500 cursor-pointer overflow-hidden ${selectedBackgroundId === 0 ? 'border-primary shadow-glow bg-primary/10' : 'border-[var(--border)] bg-[var(--bg-hover)] hover:border-white/20 hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                        <span className="text-[var(--text-tertiary)] font-black text-[9px] uppercase tracking-tighter group-hover:text-[var(--text-secondary)] transition-colors">Default BG</span>
                                        <div className="w-4 h-0.5 bg-gray-500/20 rounded-full" />
                                    </div>
                                    {selectedBackgroundId === 0 && (
                                        <div className="absolute top-2 right-2 bg-primary text-white scale-110 p-0.5 rounded-full text-[8px] flex items-center justify-center w-5 h-5 shadow-2xl z-10 animate-bounce-in">
                                            ✓
                                        </div>
                                    )}
                                    <div className="absolute inset-0 border border-[var(--border)] rounded-[inherit] pointer-events-none" />
                                </div>

                                {backgrounds.map(bg => (
                                    <div
                                        key={bg.id}
                                        onClick={() => setSelectedBackgroundId(bg.id)}
                                        className={`group relative aspect-[16/9] border-2 transition-all duration-500 cursor-pointer overflow-hidden ${selectedBackgroundId === bg.id ? 'border-primary shadow-glow' : 'border-[var(--border)] hover:border-white/30'}`}
                                    >
                                        <img 
                                            src={bg.url || bg.path} 
                                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${selectedBackgroundId === bg.id ? 'scale-110 brightness-110' : 'group-hover:scale-110 grayscale-[30%] group-hover:grayscale-0'}`} 
                                            alt={bg.name} 
                                        />
                                        
                                        <div className={`absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-md border-t border-[var(--border)] transition-all duration-500 translate-y-full group-hover:translate-y-0 ${selectedBackgroundId === bg.id ? 'translate-y-0 bg-primary/40' : ''}`}>
                                            <p className="text-[8px] font-black text-white truncate text-center uppercase tracking-tight">{bg.name}</p>
                                        </div>

                                        {selectedBackgroundId === bg.id && (
                                            <div className="absolute top-2 right-2 bg-primary text-white scale-110 p-0.5 rounded-full text-[8px] flex items-center justify-center w-5 h-5 shadow-2xl z-10 animate-bounce-in">
                                                ✓
                                            </div>
                                        )}
                                        <div className="absolute inset-0 border border-[var(--border)] rounded-[inherit] pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Standard Global Save Bar */}
                {hasChanges && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[140] glass-heavy border border-[var(--border)] px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.8)] animate-fade-up flex items-center justify-between gap-8 min-w-[500px]">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-xs uppercase tracking-tight">Unsaved Changes</span>
                            <p className="text-[var(--text-secondary)] text-[9px] font-bold uppercase tracking-widest leading-tight">Apply your new public identity</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <button
                                onClick={() => {
                                    setSelectedBackgroundId(originalState.background_id);
                                    setSelectedFont(originalState.font_family || "Arial");
                                    setSelectedTextColor(originalState.text_color || "#FFFFFF");
                                    setSelectedXpBarColor(originalState.xp_bar_color || "#4ADE80");
                                }}
                                className="px-4 py-2 text-[var(--text-secondary)] hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] border border-[var(--border)]"
                            >
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-8 py-2.5 bg-[#248046] hover:bg-[#1a6334] text-white font-black transition-all flex items-center gap-3 group text-[10px] uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(36,128,70,0.3)] disabled:opacity-50 disabled:grayscale"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Save Changes
                                        <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Global Higher-Order Profile Color Picker (Root Modal Level) */}
                {activePicker && (
                    <div 
                        className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" 
                        onClick={() => setActivePicker(null)}
                    >
                        <div 
                            className="relative z-[20001] animate-scale-in" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <InteractiveColorPicker 
                                color={activePicker === "Text Color" ? selectedTextColor : selectedXpBarColor} 
                                onChange={(val) => {
                                    if (activePicker === "Text Color") setSelectedTextColor(val);
                                    else if (activePicker === "XP Bar Color") setSelectedXpBarColor(val);
                                }}
                                onClose={() => setActivePicker(null)} 
                            />
                        </div>
                    </div>
                )}

                <ToastContainer toast={toast} onClose={hideToast} />
            </div>
        </div>
    );
}
function StatCard({ icon, label, sub, color, border, glow, delay }: { icon: string, label: string, sub: string, color: string, border: string, glow: string, delay: string }) {
    return (
        <div 
            style={{ animationDelay: delay }}
            className={`flex flex-col items-center justify-center text-center p-4 glass-card border ${border} ${glow} hover:shadow-lg hover:-translate-y-1 transition-all duration-500 group cursor-default relative overflow-hidden`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className={`relative w-10 h-10 bg-gradient-to-br ${color} flex items-center justify-center text-lg shadow-inner mb-3 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 border border-[var(--border)]`}>
                {icon}
            </div>
            
            <div className="relative flex flex-col items-center">
                <span className="text-white font-black text-xs leading-none truncate group-hover:text-indigo-300 transition-colors tracking-tight">{label}</span>
                <span className="text-[var(--text-tertiary)] text-[8px] font-black uppercase tracking-widest mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">{sub}</span>
            </div>
        </div>
    );
}
