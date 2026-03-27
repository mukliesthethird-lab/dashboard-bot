"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";
import DashboardHeader from "./DashboardHeader";
import PremiumCard from "./PremiumCard";
import CustomDropdown from "./CustomDropdown";
import { Channel } from "../types";

interface LevelingSettingsProps {
    guildId: string;
}

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : 'bg-gray-600'}`}
    >
        <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-[2px]'}`} />
    </button>
);

export default function LevelingSettings({ guildId }: LevelingSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState("");
    const [channelId, setChannelId] = useState<string | null>(null);

    const [originalState, setOriginalState] = useState<any>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [settingsRes, channelsRes] = await Promise.all([
                    fetch(`/api/leveling?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`)
                ]);

                const settingsData = await settingsRes.json();
                const channelsData = await channelsRes.json();

                if (settingsData.settings) {
                    setEnabled(!!settingsData.settings.enabled);
                    setMessage(settingsData.settings.message || "");
                    setChannelId(settingsData.settings.channel_id || null);
                    
                    setOriginalState({
                        enabled: !!settingsData.settings.enabled,
                        message: settingsData.settings.message || "",
                        channel_id: settingsData.settings.channel_id || null
                    });
                }

                if (Array.isArray(channelsData)) {
                    setChannels(channelsData);
                }
            } catch (error) {
                console.error("Failed to load leveling data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [guildId]);

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
                    channel_id: channelId
                })
            });

            if (res.ok) {
                setOriginalState({ enabled, message, channel_id: channelId });
            }
        } catch (error) {
            console.error("Failed to save leveling settings", error);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = originalState && (
        enabled !== originalState.enabled ||
        message !== originalState.message ||
        channelId !== originalState.channel_id
    );

    if (loading) return <CatLoader message="Loading leveling settings..." />;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
            <DashboardHeader
                title="Leveling System"
                subtitle="Configure how users earn XP and level up in your server."
                icon="📊"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Main Toggle */}
                <div className="lg:col-span-1 space-y-6">
                    <PremiumCard
                        title="Status"
                        description="Enable or disable the leveling system globally for this server."
                        icon={<span className="text-2xl">⚙️</span>}
                    >
                        <div className="flex items-center justify-between mt-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="font-bold text-gray-200">Leveling Enabled</span>
                            <Toggle enabled={enabled} onChange={setEnabled} />
                        </div>
                    </PremiumCard>

                    <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <span>💡</span> Tips
                        </h3>
                        <ul className="text-gray-400 text-sm space-y-2 list-disc pl-4">
                            <li>Users earn XP by chatting in text channels.</li>
                            <li>Users in voice channels also earn XP if not alone.</li>
                            <li>Level-up messages celebrate user milestones.</li>
                            <li>Configure Level Roles in the Roles section.</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column: Message and Channel */}
                <div className="lg:col-span-2 space-y-6">
                    <PremiumCard
                        title="Announcement Settings"
                        description="Customize where and how level-up notifications are sent."
                        icon={<span className="text-2xl">📢</span>}
                    >
                        <div className="space-y-6 mt-6">
                            {/* Message Editor */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 ml-1">Level-up Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Enter message..."
                                    className="w-full h-32 p-4 bg-black/20 border border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-200 transition-all resize-none"
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded-md text-gray-500">{'{user}'}</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded-md text-gray-500">{'{level}'}</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded-md text-gray-500">{'{xp}'}</span>
                                </div>
                            </div>

                            {/* Channel Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400 ml-1">Announcement Channel</label>
                                <CustomDropdown
                                    options={[
                                        { value: "current", label: "📍 Current Channel (Send where level was reached)" },
                                        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
                                    ]}
                                    value={channelId || "current"}
                                    onChange={(val) => setChannelId(val === "current" ? null : val)}
                                    placeholder="Select channel..."
                                />
                            </div>
                        </div>
                    </PremiumCard>

                    {/* Preview (Visual representation of the hardcoded message) */}
                    <div className="glass-card p-6 rounded-3xl border border-white/5">
                         <h3 className="text-sm font-bold text-gray-400 mb-4 ml-1 uppercase tracking-wider">Message Preview</h3>
                         <div className="p-4 bg-[#2b2d31] rounded-xl border-l-4 border-indigo-500 text-gray-200 font-medium">
                            {message.replace(/\{user\}/g, "@User").replace(/\{level\}/g, "10").replace(/\{xp\}/g, "500") || "No message set."}
                         </div>
                    </div>
                </div>
            </div>

            {/* Unsaved Changes Bar */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#05050a]/90 backdrop-blur-3xl border border-white/10 px-6 py-4 rounded-full shadow-2xl animate-fade-in-up flex items-center gap-8 min-w-[400px]">
                    <span className="text-gray-200 font-bold">You have unsaved changes!</span>
                    <div className="flex items-center gap-4 ml-auto">
                        <button
                            onClick={() => {
                                setEnabled(originalState.enabled);
                                setMessage(originalState.message);
                                setChannelId(originalState.channel_id);
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
                            ) : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
