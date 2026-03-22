"use client";

import { useState, useEffect } from "react";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import ToastContainer, { useToast } from "./Toast";
import CatLoader from "./CatLoader";
import CustomDropdown from "./CustomDropdown";
import { ReactionRoleMessage, EmbedData, Component, BotAction, Role, Channel } from "../types";



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
    { type: "join" as MessageType, icon: "➡️", title: "Join Messages", desc: "When a user joins the server", color: "emerald", defaultTitle: "Welcome!", defaultDesc: "Hey {user}, Selamat datang di **{server}**!", defaultColor: "#FFD700" },
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
            .then(res => res.json())
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
            setActiveMessageType("join");
        }
    };

    if (loading) {
        return <CatLoader message="Loading welcome settings..." />;
    }

    return (
        <div className="space-y-8 animate-fade-in pb-64">
            {/* Header Section */}
            <div className="glass-card rounded-[8px] p-8 relative flex flex-col md:flex-row justify-between items-center gap-6 border border-white/10">
                <div className="relative z-10 w-full">
                    <h1 className="text-2xl font-bold text-gray-200 mb-2 flex items-center gap-3">
                        <span className="text-[#5865F2]">👋</span> Welcome & Greetings
                    </h1>
                    <p className="text-gray-400 text-sm max-w-2xl">
                        Customize automatic messages for new members, boosts, and more.
                    </p>
                </div>
            </div>

            {/* Notification Toast */}
            {/* Notification Toast */}
            <ToastContainer toast={toast} onClose={hideToast} />

            {/* Message Type List (Vertical Stack) */}
            <div className="flex flex-col gap-4">
                {MESSAGE_TYPES.map((type) => {
                    const isActive = activeMessageType === type.type;
                    const config = settings[type.type];

                    return (
                        <div
                            key={type.type}
                            onClick={() => setActiveMessageType(type.type as MessageType)}
                            className={`relative glass-card rounded-[8px] p-6 border transition-all cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center ${isActive ? 'border-[#5865F2] ring-1 ring-[#5865F2]/50' : 'border-white/10 hover:border-[#4e5058]'
                                }`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl ${type.color === 'emerald' ? 'bg-[#248046]/20 text-[#248046]' : type.color === 'red' ? 'bg-[#da373c]/20 text-[#da373c]' : type.color === 'pink' ? 'bg-[#eb459e]/20 text-[#eb459e]' : 'bg-[#5865F2]/20 text-[#5865F2]'}`}>
                                    {type.icon}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-200">{type.title}</h3>
                                    <p className="text-gray-400 text-sm">{type.desc}</p>
                                </div>
                            </div>

                            {/* Controls - Hidden for 'role' as it's handled per-tracker */}
                            {type.type !== "role" && (
                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto" onClick={e => e.stopPropagation()}>
                                    <select
                                        value={config.channel_id || ""}
                                        onChange={(e) => {
                                            setSettings(prev => ({
                                                ...prev,
                                                [type.type]: { ...prev[type.type as MessageType], channel_id: e.target.value }
                                            }));
                                        }}
                                        className="px-3 py-2 bg-black/20 border border-transparent rounded-[3px] text-sm font-medium text-gray-200 outline-none focus:ring-1 focus:ring-[#5865F2] min-w-[200px]"
                                    >
                                        <option value="">🚫 No Channel</option>
                                        {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                    </select>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMessageType(type.type as MessageType);
                                                setEditingSubtype("add");
                                                setShowEditor(true);
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-[3px] font-medium transition flex items-center gap-2 text-sm"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <label className="relative cursor-pointer ml-1 flex items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={config.enabled}
                                                onChange={(e) => {
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        [type.type]: { ...prev[type.type as MessageType], enabled: e.target.checked }
                                                    }));
                                                }}
                                            />
                                            <div className="w-10 h-6 bg-[#80848e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#248046]"></div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Role Settings Expander for 'Role' type */}
                            {type.type === "role" && isActive && (
                                <div className="absolute top-full left-0 right-0 mt-[-8px] pt-8 pb-6 px-6 bg-black/20 rounded-b-[8px] border-x border-b border-[#5865F2] z-10 animate-slide-down flex flex-col gap-8" onClick={e => e.stopPropagation()}>
                                    
                                    <div className="flex justify-between items-center">
                                        <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">🎭 Role Trackers ({config.trackers?.length || 0})</label>
                                        <button 
                                            onClick={addTracker}
                                            className="px-3 py-1 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-[3px] text-xs font-bold transition"
                                        >
                                            + Add Tracker
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {(config.trackers || []).map((tracker, idx) => (
                                            <div key={tracker.id} className="glass-card p-5 rounded-[6px] border border-white/10 space-y-5 relative">
                                                <button 
                                                    onClick={() => deleteTracker(tracker.id)}
                                                    className="absolute top-4 right-4 text-gray-500 hover:text-[#da373c] transition"
                                                >
                                                    ✕
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-[#72767d] uppercase tracking-widest mb-2">Tracker Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={tracker.name}
                                                            onChange={(e) => updateTracker(tracker.id, { name: e.target.value })}
                                                            className="w-full px-3 py-2 bg-black/20 border border-transparent rounded-[3px] text-sm text-gray-200 focus:ring-1 focus:ring-[#5865F2] outline-none"
                                                            placeholder="e.g. Staff Role Updates"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black text-[#72767d] uppercase tracking-widest mb-2">Announcement Channel</label>
                                                        <CustomDropdown
                                                            value={tracker.channel_id || ""}
                                                            onChange={(val) => updateTracker(tracker.id, { channel_id: val })}
                                                            options={channels.map(c => ({ value: c.id, label: `# ${c.name}`, icon: "💬" }))}
                                                            placeholder="Select channel..."
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-[#72767d] uppercase tracking-widest mb-2">Announcement Type</label>
                                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                            {[
                                                                { val: 'both', label: 'Add & Remove' },
                                                                { val: 'add', label: 'Add Only' },
                                                                { val: 'remove', label: 'Remove Only' }
                                                            ].map(opt => (
                                                                <button
                                                                    key={opt.val}
                                                                    onClick={() => updateTracker(tracker.id, { announce_type: opt.val as any })}
                                                                    className={`flex-1 py-1.5 rounded-[3px] text-[11px] font-bold border transition ${tracker.announce_type === opt.val
                                                                        ? 'border-[#5865F2] bg-[#5865F2]/20 text-gray-200'
                                                                        : 'border-transparent bg-black/20 text-gray-400 hover:bg-white/5'
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-[#72767d] uppercase tracking-widest mb-2">Roles to Track</label>
                                                    <div className="flex flex-wrap gap-1.5 p-2 bg-black/20 rounded-[3px] min-h-[40px] border border-transparent focus-within:border-[#5865f2]">
                                                        {tracker.tracked_roles.map(roleId => {
                                                            const role = roles.find(r => r.id === roleId);
                                                            return (
                                                                <div key={roleId} className="flex items-center gap-1.5 glass-card px-2 py-1 rounded-[3px] border border-white/10 text-xs">
                                                                    <span style={{ color: role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'inherit' }}>
                                                                        {role?.name || roleId}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => updateTracker(tracker.id, { tracked_roles: tracker.tracked_roles.filter(id => id !== roleId) })}
                                                                        className="text-gray-500 hover:text-[#da373c] font-bold"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        <CustomDropdown
                                                            value=""
                                                            onChange={(val) => {
                                                                if (val && !tracker.tracked_roles.includes(val)) {
                                                                    updateTracker(tracker.id, { tracked_roles: [...tracker.tracked_roles, val] });
                                                                }
                                                            }}
                                                            options={roles
                                                                .filter(r => !tracker.tracked_roles.includes(r.id))
                                                                .map(r => ({ value: r.id, label: r.name }))}
                                                            placeholder="+ Select role..."
                                                            className="min-w-[150px]"
                                                            size="sm"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingTrackerId(tracker.id);
                                                                setEditingSubtype("add");
                                                                setShowEditor(true);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition flex items-center gap-1.5 ${tracker.announce_type === 'remove' ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-[#248046] hover:bg-[#1a6334] text-white'}`}
                                                            disabled={tracker.announce_type === 'remove'}
                                                        >
                                                            ✏️ {tracker.announce_type === 'both' ? 'Edit Add Msg' : 'Edit Msg'}
                                                        </button>
                                                        {tracker.announce_type === 'both' && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTrackerId(tracker.id);
                                                                    setEditingSubtype("remove");
                                                                    setShowEditor(true);
                                                                }}
                                                                className="px-3 py-1.5 bg-[#da373c] hover:bg-[#a12828] text-white rounded-[3px] text-xs font-bold transition flex items-center gap-1.5"
                                                            >
                                                                ✏️ Edit Remove Msg
                                                            </button>
                                                        )}
                                                    </div>

                                                    <label className="relative cursor-pointer flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-[#72767d] uppercase tracking-widest">ENABLED</span>
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={tracker.enabled}
                                                                onChange={(e) => updateTracker(tracker.id, { enabled: e.target.checked })}
                                                            />
                                                            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#248046]"></div>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}

                                        {(!config.trackers || config.trackers.length === 0) && (
                                            <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-[8px]">
                                                <p className="text-gray-400 text-sm">No role trackers configured.</p>
                                                <button onClick={addTracker} className="mt-3 text-[#5865F2] hover:underline text-xs font-bold font-black">
                                                    Click here to add your first tracker
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>



            {/* Create Message Modal (The New Editor) */}
            {showEditor && (
                <CreateMessageModal
                    isOpen={showEditor}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingTrackerId(null);
                    }}
                    initialMessage={{
                        message_id: null,
                        channel_id: (editingTrackerId ? settings.role.trackers?.find(t => t.id === editingTrackerId)?.channel_id : currentConfig.channel_id) || "",
                        message_content: (() => {
                            if (editingTrackerId) {
                                const tracker = settings.role.trackers?.find(t => t.id === editingTrackerId);
                                if (!tracker) return "";
                                return editingSubtype === "remove" ? tracker.remove_message?.message_content || "" : tracker.message_content;
                            }
                            return (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                                ? currentConfig.remove_message.message_content
                                : currentConfig.message_content;
                        })(),
                        embeds: (() => {
                            if (editingTrackerId) {
                                const tracker = settings.role.trackers?.find(t => t.id === editingTrackerId);
                                if (!tracker) return [];
                                return editingSubtype === "remove" ? tracker.remove_message?.embeds || [] : tracker.embeds;
                            }
                            return (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                                ? currentConfig.remove_message.embeds
                                : currentConfig.embeds;
                        })(),
                        component_rows: (() => {
                            if (editingTrackerId) {
                                const tracker = settings.role.trackers?.find(t => t.id === editingTrackerId);
                                if (!tracker) return [];
                                return editingSubtype === "remove" ? tracker.remove_message?.component_rows || [] : tracker.component_rows;
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

            {/* Confirmation Modal (The New Confirm) */}
            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleSave}
                title="Save Settings?"
                message="This will apply all changes to the welcome messages. Are you sure?"
                confirmText={saving ? "Saving..." : "Yes, Save All"}
                cancelText="Cancel"
            />

            {/* Unsaved Changes Bar */}
            {JSON.stringify(settings) !== JSON.stringify(originalSettings) && originalSettings && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#030305]/90 backdrop-blur-3xl border border-white/10 px-4 py-3 rounded-[8px] shadow-2xl animate-fade-in-up flex items-center justify-between gap-6 min-w-[400px]">
                    <span className="text-gray-200 font-semibold text-sm line-clamp-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={resetSettings}
                            className="text-gray-200 hover:underline text-sm font-medium transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-medium rounded-[3px] transition-all flex items-center gap-2 group text-sm"
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

        </div>
    );
}


