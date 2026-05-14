"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import DashboardHeader from "./DashboardHeader";
import PremiumCard from "./PremiumCard";
import CustomDropdown from "./CustomDropdown";
import { ToastContainer, useToast } from "./Toast";
import { Channel, Role } from "../types";
import { logActivity } from "@/lib/logger";

interface LevelingSettingsProps {
    guildId: string;
}

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 md:w-12 md:h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-[#248046]' : 'bg-[#80848e]'}`}
    >
        <div className={`absolute top-[2px] w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ease-out ${enabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-[2px]'}`} />
    </button>
);

export default function LevelingSettings({ guildId }: LevelingSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState("");
    const [channelId, setChannelId] = useState<string | null>(null);
    const [levelingRoles, setLevelingRoles] = useState<{ role_id: string, level: number }[]>([]);

    const [originalState, setOriginalState] = useState<any>(null);
    const { toast, success, error, hideToast } = useToast();

    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardType, setLeaderboardType] = useState<'balance' | 'xp'>('xp');
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [settingsRes, channelsRes, rolesRes] = await Promise.all([
                    fetch(`/api/leveling?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`)
                ]);

                const settingsData = await settingsRes.json();
                const channelsData = await channelsRes.json();
                const rolesData = await rolesRes.json();

                if (settingsData.settings) {
                    setEnabled(!!settingsData.settings.enabled);
                    setMessage(settingsData.settings.message || "");
                    setChannelId(settingsData.settings.channel_id || null);
                }

                if (settingsData.roles) {
                    setLevelingRoles(settingsData.roles);
                }

                setOriginalState({
                    enabled: !!settingsData.settings?.enabled,
                    message: settingsData.settings?.message || "",
                    channel_id: settingsData.settings?.channel_id || null,
                    roles: settingsData.roles || []
                });

                if (Array.isArray(channelsData)) setChannels(channelsData);
                if (Array.isArray(rolesData)) setRoles(rolesData);
            } catch (error) {
                console.error("Failed to load leveling data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [guildId]);

    const fetchLeaderboard = async (type: 'balance' | 'xp') => {
        setLoadingLeaderboard(true);
        setLeaderboardType(type);
        try {
            const res = await fetch(`/api/leaderboard?type=${type}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setLeaderboardData(data);
            }
        } catch (err) {
            error("Failed to fetch leaderboard");
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/leveling", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    guild_id: guildId,
                    enabled,
                    message,
                    channel_id: channelId,
                    roles: levelingRoles
                })
            });

            if (res.ok) {
                setOriginalState({ enabled, message, channel_id: channelId, roles: [...levelingRoles] });
                success("Successfully updated leveling settings!");
                await logActivity(guildId, "Leveling settings updated", "Status: " + (enabled ? "Enabled" : "Disabled"));
            } else {
                error("Failed to update settings. Please try again.");
            }
        } catch (err) {
            console.error("Failed to save leveling settings", err);
            error("Network error. Please check your connection.");
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = originalState && (
        enabled !== originalState.enabled ||
        message !== originalState.message ||
        channelId !== originalState.channel_id ||
        JSON.stringify(levelingRoles) !== JSON.stringify(originalState.roles)
    );

    if (loading) return <Loading message="Loading leveling configuration..." />;

    return (
        <>
            <div className="space-y-6 animate-fade-up max-w-7xl mx-auto pb-24">


                {/* Top Grid: Quick Config & Target Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1 bg-[var(--bg-secondary)] p-4 rounded-[8px] border border-[var(--border)] flex items-center justify-between shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--text-primary)]">Leveling Status</span>
                            <span className="text-xs font-semibold ${enabled ? 'text-[#248046]' : 'text-[var(--text-secondary)]'} mt-0.5">{enabled ? 'Online' : 'Offline'}</span>
                        </div>
                        <Toggle enabled={enabled} onChange={setEnabled} />
                    </div>

                    <div className="md:col-span-1 lg:col-span-3 bg-[var(--bg-secondary)] p-4 rounded-[8px] border border-[var(--border)] flex items-center gap-6 shadow-sm overflow-hidden relative group">
                        <div className="shrink-0 flex items-center gap-3">
                            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight whitespace-nowrap">Output Channel</span>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <CustomDropdown
                                options={[
                                    { value: "current", label: "📍 Current Contextual Channel" },
                                    ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
                                ]}
                                value={channelId || "current"}
                                onChange={(val) => setChannelId(val === "current" ? null : val)}
                                placeholder="Select target..."
                            />
                        </div>
                    </div>


                </div>

                {/* Main Configuration Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Left: Editor & Rewards */}
                    <div className="lg:col-span-8 flex flex-col space-y-6 h-full">
                        {/* Message Matrix */}
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-[8px] border border-[var(--border)] shadow-md space-y-4">
                            <div className="flex justify-between items-center bg-[var(--bg-tertiary)] p-2.5 rounded-[8px] border border-[var(--border)] uppercase tracking-widest px-5">
                                <span className="text-xs font-bold text-[var(--text-secondary)]">Message Configuration</span>
                                <div className="flex gap-2">
                                    {['{user}', '{level}', '{xp}'].map(v => (
                                        <button key={v} onClick={() => setMessage(p => p + v)} className="text-[10px] font-bold px-2 py-1 bg-[var(--bg-hover)] hover:bg-[#3f4147] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase border border-[var(--border)]">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="{user} leveled up to **{level}**!"
                                className="w-full h-24 p-5 w-full h-24 p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-[8px] focus:ring-1 focus:ring-indigo-500/30 outline-none text-[var(--text-primary)] transition-all resize-none font-medium placeholder:text-[var(--text-tertiary)] text-sm leading-relaxed"
                            />
                        </div>

                        {/* Rewards Matrix - Stretched to match sidebar */}
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-[8px] border border-[var(--border)] shadow-md space-y-6 flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-3">
                                    <span className="w-8 h-8 bg-purple-500/10 rounded-md flex items-center justify-center text-sm">🎭</span>
                                    Leveling Rewards
                                </h3>
                                <div className="w-48">
                                    <CustomDropdown
                                        options={roles.filter(r => !levelingRoles.some(lr => lr.role_id === r.id)).map(r => ({
                                            value: r.id,
                                            label: r.name
                                        }))}
                                        value=""
                                        onChange={(val) => {
                                            if (val) {
                                                if (levelingRoles.some(r => r.role_id === val)) return;
                                                setLevelingRoles([...levelingRoles, { role_id: val, level: 1 }]);
                                            }
                                        }}
                                        placeholder="＋ Add Reward"
                                        size="sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {levelingRoles.length === 0 ? (
                                    <div className="col-span-full p-6 text-center bg-[var(--bg-tertiary)] rounded-[8px] border border-dashed border-[var(--border)]">
                                        <span className="text-gray-600 text-[11px] font-bold uppercase tracking-widest italic">No rewards active</span>
                                    </div>
                                ) : (
                                    levelingRoles.map((lr, idx) => {
                                        const role = roles.find(r => r.id === lr.role_id);
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-black/40 rounded-[8px] border border-[var(--border)] hover:border-indigo-500/20 transition-all group shadow-inner">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="w-2 h-10 rounded-full shadow-lg" style={{ backgroundColor: role ? '#' + role.color.toString(16).padStart(6, '0') : '#5865f2' }} />
                                                    <div className="overflow-hidden">
                                                        <span className="text-sm font-black text-[var(--text-primary)] block truncate w-full">{role?.name || 'Unknown'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-tighter">LVL</span>
                                                            <input
                                                                type="number"
                                                                value={lr.level}
                                                                onChange={(e) => {
                                                                    const newRoles = [...levelingRoles];
                                                                    newRoles[idx].level = parseInt(e.target.value) || 0;
                                                                    setLevelingRoles(newRoles);
                                                                }}
                                                                className="w-12 bg-transparent border-b border-[var(--border)] text-indigo-400 font-black text-sm outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setLevelingRoles(levelingRoles.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-500 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Preview & Stats */}
                    <div className="lg:col-span-4 flex flex-col h-full space-y-6">
                        {/* Live Preview Container */}
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-[8px] border border-[var(--border)] shadow-md relative overflow-hidden flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Transmission Preview</span>
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500/40" />
                                    <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                                    <span className="w-2 h-2 rounded-full bg-green-500/40" />
                                </div>
                            </div>
                            <div className="flex gap-3 p-4 bg-[#313338] rounded-[8px] shadow-inner border border-[var(--border)]">
                                <div className="w-8 h-8 rounded-full bg-[#5865f2] shrink-0 overflow-hidden shadow-lg"><img src="/donpollo-icon.jpg" className="w-full h-full object-cover" alt="Bot" /></div>
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">Don Pollo</span>
                                        <span className="bg-[#5865f2] text-[10px] font-black px-1.5 rounded-[3px] text-white flex items-center h-4">BOT</span>
                                    </div>
                                    <div className="text-[var(--text-primary)] text-sm break-words leading-snug">
                                        {message.replace(/\{user\}/g, "@User").replace(/\{level\}/g, "10").replace(/\{xp\}/g, "500") || <span className="text-gray-600 italic">No message set...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compact Guide - Stretched to fill remaining space */}
                        <div className="bg-[var(--bg-secondary)] p-6 rounded-[8px] border border-[var(--border)] space-y-4 shadow-sm relative overflow-hidden flex-1">
                            <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Operator's Manual</h4>
                            <div className="space-y-3">
                                {[
                                    { t: "Chatting", d: "Users earn XP by chatting in text channels." },
                                    { t: "Voice", d: "Being active in voice channels earns XP over time." },
                                    { t: "Rewards", d: "Users automatically receive roles when they reach milestones." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="text-sm font-black text-indigo-400">{i + 1}</span>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-[var(--text-secondary)] leading-none">{item.t}</span>
                                            <span className="text-xs text-[var(--text-tertiary)] leading-tight">{item.d}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Standard Footer Save Bar */}
            {hasChanges && (
                <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[100] bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border border-[var(--border)] px-4 py-3 rounded-[8px] shadow-md animate-fade-up flex items-center justify-between gap-6 min-w-[400px]">
                    <span className="text-[var(--text-primary)] font-semibold text-sm line-clamp-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => {
                                setEnabled(originalState.enabled);
                                setMessage(originalState.message);
                                setChannelId(originalState.channel_id);
                                setLevelingRoles([...originalState.roles]);
                            }}
                            className="text-[var(--text-primary)] hover:underline text-sm font-medium transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-medium rounded-[3px] transition-all flex items-center gap-2 group text-sm disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

            {/* Leaderboard Modal */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in px-4" onClick={() => setShowLeaderboard(false)}>
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] w-full max-w-xl rounded-[8px] overflow-hidden shadow-md animate-fade-up relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-4 text-center relative border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                            <button
                                onClick={() => setShowLeaderboard(false)}
                                className="absolute top-6 right-6 text-[var(--text-tertiary)] hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <h2 className="text-xl font-bold text-white tracking-tight">Global EXP Leaderboard</h2>
                            <p className="text-[var(--text-secondary)] text-sm mt-1">Top 10 Global Users</p>
                        </div>

                        {/* List */}
                        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
                            {loadingLeaderboard ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-16 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[8px] animate-pulse" />
                                    ))}
                                </div>
                            ) : leaderboardData.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-[var(--text-secondary)] font-bold text-sm">No data records found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {leaderboardData.map((user, index) => (
                                        <div
                                            key={user.user_id}
                                            className={`flex items-center gap-4 p-3 rounded-[8px] border transition-all ${index === 0 ? 'bg-[#5865F2]/10 border-[#5865F2]/30' : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'}`}
                                        >
                                            <div className="w-8 text-center font-bold text-[var(--text-secondary)]">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </div>
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--border)]">
                                                <img src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-[var(--text-primary)] truncate text-sm">@{user.username}</div>
                                                <div className="text-[10px] text-[var(--text-tertiary)] uppercase">{user.user_id}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${leaderboardType === 'xp' ? 'text-[#5865F2]' : 'text-[#248046]'} text-sm`}>
                                                    {leaderboardType === 'xp' ? `${user.total.toLocaleString()} XP` : `$${user.total.toLocaleString()}`}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
