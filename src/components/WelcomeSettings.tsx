"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import ToastContainer, { useToast } from "./Toast";
import CustomDropdown from "./CustomDropdown";
import { ReactionRoleMessage, EmbedData, Component, BotAction, Role, Channel } from "../types";
import { logActivity } from "@/lib/logger";



interface ActionButton {
    label: string;
    url: string;
    emoji: string;
    style: "primary" | "secondary" | "success" | "danger" | "link";
}

interface RoleTracker {
    id: string;
    name: string;
    tracked_roles: string[];
    announce_type: "add" | "remove" | "both";
    // Main message (Add)
    enabled: boolean;
    channel_id: string | null;
    message_content: string;
    embeds: EmbedData[];
    component_rows: any[];
    // Separate message for role removal
    remove_message?: {
        enabled: boolean;
        message_content: string;
        embeds: EmbedData[];
        component_rows: any[];
    };
}

interface MessageConfig {
    enabled: boolean;
    channel_id: string | null;
    message_content: string;
    embeds: EmbedData[];
    action_rows: ActionButton[][];
    component_rows?: any[]; // New advanced components
    // Legacy Role-specific settings (kept for compatibility)
    tracked_roles?: string[];
    announce_type?: "add" | "remove" | "both";
    remove_message?: {
        message_content: string;
        embeds: EmbedData[];
        component_rows?: any[];
    };
    // New multi-tracker support
    trackers?: RoleTracker[];
}

interface WelcomeSettings {
    guild_id: string;
    join: MessageConfig;
    leave: MessageConfig;
    boost: MessageConfig;
    role: MessageConfig;
}

interface WelcomeSettingsProps {
    guildId: string;
}

const MESSAGE_TYPES = [
    { type: "join" as MessageType, icon: "➡️", title: "Join Messages", desc: "When a user joins the server", color: "emerald", defaultTitle: "Welcome!", defaultDesc: "Hey {user}, Welcome to **{server}**!", defaultColor: "#FFD700" },
    { type: "leave" as MessageType, icon: "⬅️", title: "Leave Messages", desc: "When a user leaves the server", color: "red", defaultTitle: "Goodbye!", defaultDesc: "Goodbye **{user.name}**! We will miss you. 👋", defaultColor: "#FF6B6B" },
    { type: "boost" as MessageType, icon: "💎", title: "Boost Messages", desc: "When a user boosts the server", color: "pink", defaultTitle: "Server Boosted!", defaultDesc: "{user} just boosted **{server}**! 🚀", defaultColor: "#FF73FA" },
    { type: "role" as MessageType, icon: "🎭", title: "Role Assignment Messages", desc: "When a user gets or loses a role", color: "indigo", defaultTitle: "Role Updated!", defaultDesc: "{user} now has the **{role}** role!", defaultColor: "#818CF8" },
];

type MessageType = "join" | "leave" | "boost" | "role";

const createDefaultEmbed = (type: MessageType): EmbedData => {
    const config = MESSAGE_TYPES.find(t => t.type === type) || MESSAGE_TYPES[0];
    return {
        author_name: '',
        author_icon_url: '',
        title: config.defaultTitle,
        description: config.defaultDesc,
        color: config.defaultColor,
        thumbnail_url: '{user.avatar}',
        image_url: '',
        footer_text: '',
        footer_icon_url: '',
        fields: []
    };
};

const createDefaultConfig = (type: MessageType): MessageConfig => ({
    enabled: false,
    channel_id: null,
    message_content: '',
    embeds: [createDefaultEmbed(type)],
    action_rows: [],
    component_rows: [],
    tracked_roles: [],
    announce_type: "both",
    trackers: type === 'role' ? [] : undefined,
    remove_message: type === 'role' ? {
        message_content: '',
        embeds: [createDefaultEmbed(type)],
        component_rows: []
    } : undefined
});

const defaultSettings: WelcomeSettings = {
    guild_id: '',
    join: createDefaultConfig("join"),
    leave: createDefaultConfig("leave"),
    boost: createDefaultConfig("boost"),
    role: createDefaultConfig("role"),
};

export default function WelcomeSettings({ guildId }: WelcomeSettingsProps) {
    const [settings, setSettings] = useState<WelcomeSettings>({ ...defaultSettings, guild_id: guildId });
    const [originalSettings, setOriginalSettings] = useState<WelcomeSettings | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast, success, error, hideToast } = useToast();

    // UI States
    const [activeMessageType, setActiveMessageType] = useState<MessageType>("join");
    const [showEditor, setShowEditor] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    // Track if we are editing the main message ("add" / default) or the "remove" message
    const [editingSubtype, setEditingSubtype] = useState<"add" | "remove">("add");

    const currentConfig = settings[activeMessageType];

    useEffect(() => {
        fetch(`/api/welcome?guild_id=${guildId}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data && !data.error) {
                    try {
                        const parsed = data.embed_data
                            ? (typeof data.embed_data === 'string' ? JSON.parse(data.embed_data) : data.embed_data)
                            : {};

                        const loadConfig = (type: MessageType): MessageConfig => ({
                            enabled: !!parsed[type]?.enabled,
                            channel_id: parsed[type]?.channel_id || null,
                            message_content: parsed[type]?.message_content || '',
                            embeds: parsed[type]?.embeds || [createDefaultEmbed(type)],
                            action_rows: parsed[type]?.action_rows || [],
                            component_rows: parsed[type]?.component_rows || [],
                            tracked_roles: parsed[type]?.tracked_roles || [],
                            announce_type: parsed[type]?.announce_type || "both",
                            trackers: parsed[type]?.trackers || (type === 'role' ? [] : undefined),
                            remove_message: parsed[type]?.remove_message || (type === 'role' ? {
                                enabled: false,
                                message_content: '',
                                embeds: [createDefaultEmbed(type)],
                                component_rows: []
                            } : undefined)
                        });

                        const loadedSettings = {
                            guild_id: guildId,
                            join: loadConfig("join"),
                            leave: loadConfig("leave"),
                            boost: loadConfig("boost"),
                            role: loadConfig("role"),
                        };
                        setSettings(loadedSettings);
                        setOriginalSettings(loadedSettings);
                    } catch { /* Keep defaults */ }
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));

        fetch(`/api/welcome?action=channels&guild_id=${guildId}`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setChannels(data); });

        fetch(`/api/welcome?action=roles&guild_id=${guildId}`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setRoles(data); });
    }, [guildId]);

    const [editingTrackerId, setEditingTrackerId] = useState<string | null>(null);

    const addTracker = () => {
        const newTracker: RoleTracker = {
            id: `tracker_${Date.now()}`,
            name: `Role Tracker #${(settings.role.trackers?.length || 0) + 1}`,
            tracked_roles: [],
            announce_type: "both",
            enabled: true,
            channel_id: settings.role.channel_id,
            message_content: '',
            embeds: [createDefaultEmbed("role")],
            component_rows: [],
            remove_message: {
                enabled: false,
                message_content: '',
                embeds: [createDefaultEmbed("role")],
                component_rows: []
            }
        };
        setSettings(prev => ({
            ...prev,
            role: { ...prev.role, trackers: [...(prev.role.trackers || []), newTracker] }
        }));
    };

    const deleteTracker = (id: string) => {
        setSettings(prev => ({
            ...prev,
            role: { ...prev.role, trackers: (prev.role.trackers || []).filter(t => t.id !== id) }
        }));
    };

    const updateTracker = (id: string, updates: Partial<RoleTracker>) => {
        setSettings(prev => ({
            ...prev,
            role: {
                ...prev.role,
                trackers: (prev.role.trackers || []).map(t => t.id === id ? { ...t, ...updates } : t)
            }
        }));
    };

    const handleModalSave = async (msg: ReactionRoleMessage) => {
        if (activeMessageType === "role" && editingTrackerId) {
            const tracker = settings.role.trackers?.find(t => t.id === editingTrackerId);
            if (!tracker) return;

            if (editingSubtype === "remove") {
                updateTracker(editingTrackerId, {
                    remove_message: {
                        ...tracker.remove_message!,
                        message_content: msg.message_content,
                        embeds: msg.embeds,
                        component_rows: msg.component_rows || []
                    }
                });
            } else {
                updateTracker(editingTrackerId, {
                    message_content: msg.message_content,
                    embeds: msg.embeds,
                    component_rows: msg.component_rows || []
                });
            }
        } else if (activeMessageType === "role" && editingSubtype === "remove") {
            setSettings(prev => ({
                ...prev,
                role: {
                    ...prev.role,
                    remove_message: {
                        ...prev.role.remove_message!,
                        message_content: msg.message_content,
                        embeds: msg.embeds,
                        component_rows: msg.component_rows || []
                    }
                }
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                [activeMessageType]: {
                    ...prev[(activeMessageType as MessageType)],
                    message_content: msg.message_content,
                    embeds: msg.embeds,
                    component_rows: msg.component_rows || []
                }
            }));
        }
        setShowEditor(false);
        setEditingTrackerId(null);
    };

    const handleSave = async () => {
        setShowConfirm(false);
        setSaving(true);

        try {
            const res = await fetch('/api/welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guild_id: settings.guild_id,
                    enabled: settings.join.enabled,
                    channel_id: settings.join.channel_id,
                    message_content: settings.join.message_content,
                    use_embed: true,
                    embed_data: JSON.stringify({
                        join: settings.join,
                        leave: settings.leave,
                        boost: settings.boost,
                        role: settings.role
                    })
                })
            });
            const data = await res.json();
            if (res.ok) {
                setOriginalSettings(settings);
                success("Settings saved! ✅");
                await logActivity(guildId, "Welcome settings updated", "Settings for join, leave, boost, and roles updated.");
            } else {
                error(data.error || "Failed");
            }
        } catch {
            error("Network error");
        }
        setSaving(false);
    };

    const resetSettings = () => {
        if (originalSettings) {
            setSettings(originalSettings);
            // Do NOT reset activeMessageType — keep user on their current tab
        }
    };

    if (loading) {
        return <Loading message="Loading welcome settings..." />;
    }

    const editingTracker = editingTrackerId ? settings.role.trackers?.find(t => t.id === editingTrackerId) : null;

    return (
        <div className="space-y-4 animate-fade-in pb-64 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between glass-card p-6 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#5865F2]/10 flex items-center justify-center text-3xl shadow-inner border border-[#5865F2]/20">
                        👋
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight">Welcome & Greetings</h1>
                        <p className="text-[var(--text-tertiary)] text-[11px] font-medium uppercase tracking-widest">Server Automation</p>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            <ToastContainer toast={toast} onClose={hideToast} />

            {/* Compact Vertical List */}
            <div className="space-y-3">
                {MESSAGE_TYPES.map((type) => {
                    const config = settings[type.type];
                    const isActive = activeMessageType === type.type;
                    const colorClass = type.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' : type.color === 'red' ? 'bg-red-500/10 text-red-400' : type.color === 'pink' ? 'bg-pink-500/10 text-pink-400' : 'bg-[#5865F2]/10 text-[#5865F2]';

                    return (
                        <div key={type.type} className={`${type.type === 'role' && isActive ? 'space-y-0' : 'space-y-1'}`}>
                            {/* Main Type Row */}
                            <div
                                onClick={() => setActiveMessageType(type.type as MessageType)}
                                className={`glass-card p-3 border transition-all cursor-pointer flex items-center gap-5 ${isActive
                                        ? `border-[#5865F2] bg-white/2 shadow-lg shadow-[#5865F2]/5 ${type.type === 'role' ? 'rounded-t-xl rounded-b-none border-b-0' : 'rounded-xl'}`
                                        : 'border-[var(--border)] rounded-xl'
                                    }`}
                            >
                                {/* Left: Info */}
                                <div className="flex items-center gap-4 w-64 shrink-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${colorClass}`}>
                                        {type.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-[13px] font-bold text-white truncate">{type.title}</h3>
                                        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{type.desc}</p>
                                    </div>
                                </div>

                                {/* Center: Quick Controls (Hidden for 'role') */}
                                {type.type !== "role" && (
                                    <div className="flex-1 flex items-center gap-6 px-6 border-l border-[var(--border)]" onClick={e => e.stopPropagation()}>
                                        <div className="flex-1 max-w-[200px]">
                                            <CustomDropdown
                                                value={config.channel_id || ""}
                                                onChange={(value) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        [type.type]: { ...prev[type.type as MessageType], channel_id: value }
                                                    }));
                                                }}
                                                options={[
                                                    { value: "", label: "🚫 Disable Channel" },
                                                    ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
                                                ]}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 pr-4 border-r border-white/5">
                                                <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                                                <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest min-w-[24px]">{config.enabled ? 'On' : 'Off'}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        [type.type]: { ...prev[type.type as MessageType], enabled: !config.enabled }
                                                    }));
                                                }}
                                                className={`relative w-10 h-6 rounded-full transition-colors flex items-center ${config.enabled ? 'bg-[#23a55a]' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Role type spacing */}
                                {type.type === "role" && <div className="flex-1 px-6 border-l border-[var(--border)] flex items-center gap-2">
                                    <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">
                                        {config.trackers?.length || 0} Trackers Configured
                                    </span>
                                </div>}

                                {/* Right: Action Button */}
                                <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {type.type !== "role" ? (
                                        <button
                                            onClick={() => {
                                                setActiveMessageType(type.type as MessageType);
                                                setEditingSubtype("add");
                                                setShowEditor(true);
                                            }}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-all"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setActiveMessageType("role")}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isActive ? 'bg-[#5865F2] text-white' : 'bg-white/5 text-[var(--text-tertiary)]'}`}
                                        >
                                            <svg className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Detail Panel (Role Trackers) */}
                            {type.type === "role" && isActive && (
                                <div className="animate-slide-down px-4 pb-4 pt-4 bg-white/[0.01] rounded-b-xl rounded-t-none border-x border-b border-[#5865F2] space-y-4 shadow-xl shadow-[#5865F2]/5">
                                    <div className="flex items-center justify-between py-1 border-b border-white/5 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#5865F2] shadow-[0_0_5px_rgba(88,101,242,0.5)]" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Active Role Trackers</span>
                                        </div>
                                        <button
                                            onClick={addTracker}
                                            className="text-[10px] font-black text-[#5865F2] hover:text-[#727cff] uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                        >
                                            <span className="text-sm">+</span> Add New Tracker
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(config.trackers || []).map((tracker) => (
                                            <div key={tracker.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-6 group hover:border-white/10 transition-colors">
                                                {/* Tracker Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="text"
                                                            value={tracker.name}
                                                            onChange={(e) => updateTracker(tracker.id, { name: e.target.value })}
                                                            className="bg-transparent border-none p-0 text-[14px] font-bold text-white focus:ring-0 placeholder-white/20 w-full"
                                                        />
                                                        <div className="flex gap-1 shrink-0">
                                                            {tracker.tracked_roles.slice(0, 3).map(rid => {
                                                                const r = roles.find(x => x.id === rid);
                                                                return <div key={rid} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r?.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#72767d' }} />;
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Tracker Settings */}
                                                <div className="flex items-center gap-5 shrink-0">
                                                    <div className="w-48">
                                                        <CustomDropdown
                                                            value={tracker.channel_id || ""}
                                                            onChange={(value) => updateTracker(tracker.id, { channel_id: value })}
                                                            options={[
                                                                { value: "", label: "No Channel" },
                                                                ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
                                                            ]}
                                                        />
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setActiveMessageType("role"); setEditingTrackerId(tracker.id); setEditingSubtype("add"); setShowEditor(true); }}
                                                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-500/10 transition-all active:scale-95"
                                                        >
                                                            On Assigned
                                                        </button>
                                                        {tracker.announce_type === 'both' && <button
                                                            onClick={() => { setActiveMessageType("role"); setEditingTrackerId(tracker.id); setEditingSubtype("remove"); setShowEditor(true); }}
                                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg border border-red-500/10 transition-all active:scale-95"
                                                        >
                                                            On Removed
                                                        </button>}
                                                    </div>

                                                    <button
                                                        onClick={() => updateTracker(tracker.id, { enabled: !tracker.enabled })}
                                                        className={`relative w-9 h-5 rounded-full transition-colors flex items-center shrink-0 ${tracker.enabled ? 'bg-[#23a55a]' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`absolute left-[2px] w-3.5 h-3.5 bg-white rounded-full transition-transform ${tracker.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>

                                                    <button onClick={() => deleteTracker(tracker.id)} className="w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">✕</button>
                                                </div>
                                            </div>
                                        ))}

                                        {(!config.trackers || config.trackers.length === 0) && (
                                            <div className="py-8 text-center border border-dashed border-white/5 rounded-lg">
                                                <p className="text-[11px] text-[var(--text-tertiary)]">No role trackers. <button onClick={addTracker} className="text-[#5865F2] font-bold">Add one now.</button></p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <CreateMessageModal
                    isOpen={showEditor}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingTrackerId(null);
                    }}
                    initialMessage={{
                        message_id: null,
                        channel_id: (editingTracker ? editingTracker.channel_id : currentConfig.channel_id) || "",
                        message_content: (() => {
                            if (editingTracker) {
                                return editingSubtype === "remove" ? editingTracker.remove_message?.message_content || "" : editingTracker.message_content;
                            }
                            return (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                                ? currentConfig.remove_message.message_content
                                : currentConfig.message_content;
                        })(),
                        embeds: (() => {
                            if (editingTracker) {
                                return editingSubtype === "remove" ? editingTracker.remove_message?.embeds || [] : editingTracker.embeds;
                            }
                            return (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                                ? currentConfig.remove_message.embeds
                                : currentConfig.embeds;
                        })(),
                        component_rows: (() => {
                            if (editingTracker) {
                                return editingSubtype === "remove" ? editingTracker.remove_message?.component_rows || [] : editingTracker.component_rows;
                            }
                            return (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                                ? currentConfig.remove_message.component_rows || []
                                : currentConfig.component_rows || [];
                        })()
                    }}
                    isEditing={true}
                    channels={channels}
                    roles={roles}
                    onSave={async (msg, _channelId) => {
                        await handleModalSave(msg);
                    }}
                    saveLabel="Update Preview"
                    disableChannelSelect={true}
                    guildId={guildId}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleSave}
                title="Save Settings?"
                message="Apply all welcome message changes?"
                confirmText={saving ? "Saving..." : "Yes, Save"}
                cancelText="Cancel"
            />

            {/* Standard Global Save Bar */}
            {JSON.stringify(settings) !== JSON.stringify(originalSettings) && originalSettings && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-[var(--bg-secondary)]/95 backdrop-blur-3xl border border-[var(--border)] px-4 py-3 rounded-xl shadow-2xl animate-fade-up flex items-center justify-between gap-12 min-w-[500px]">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[var(--text-primary)] font-bold text-[13px] uppercase tracking-tight">Careful — you have unsaved changes!</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={resetSettings}
                            className="text-[var(--text-secondary)] hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={saving}
                            className="px-6 py-2 bg-[#248046] hover:bg-[#1a6334] text-white font-black rounded-lg transition-all flex items-center gap-2 group text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
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
        </div>
    );
}


