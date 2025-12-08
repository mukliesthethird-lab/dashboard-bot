"use client";

import { useState, useEffect } from "react";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";
import { ReactionRoleMessage, EmbedData, Component, BotAction, Role, Channel } from "../types";



interface ActionButton {
    label: string;
    url: string;
    emoji: string;
    style: "primary" | "secondary" | "success" | "danger" | "link";
}

interface MessageConfig {
    enabled: boolean;
    channel_id: string | null;
    message_content: string;
    embeds: EmbedData[];
    action_rows: ActionButton[][];
    component_rows?: any[]; // New advanced components
    // Role-specific settings
    tracked_roles?: string[];
    announce_type?: "add" | "remove" | "both";
    // Separate message for role removal
    remove_message?: {
        message_content: string;
        embeds: EmbedData[];
        component_rows?: any[];
    };
}

type MessageType = "join" | "leave" | "boost" | "role";

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
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
                            remove_message: parsed[type]?.remove_message || (type === 'role' ? {
                                message_content: '',
                                embeds: [createDefaultEmbed(type)],
                                component_rows: []
                            } : undefined)
                        });

                        setSettings({
                            guild_id: guildId,
                            join: loadConfig("join"),
                            leave: loadConfig("leave"),
                            boost: loadConfig("boost"),
                            role: loadConfig("role"),
                        });
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

    const handleModalSave = async (msg: ReactionRoleMessage) => {
        if (activeMessageType === "role" && editingSubtype === "remove") {
            setSettings(prev => ({
                ...prev,
                role: {
                    ...prev.role,
                    remove_message: {
                        message_content: msg.message_content,
                        embeds: msg.embeds,
                        component_rows: msg.component_rows
                    }
                }
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                [activeMessageType]: {
                    ...prev[activeMessageType],
                    message_content: msg.message_content,
                    embeds: msg.embeds,
                    component_rows: msg.component_rows
                }
            }));
        }
        setShowEditor(false);
    };

    const handleSave = async () => {
        setShowConfirm(false);
        setSaving(true);
        setMessage(null);

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
            setMessage(res.ok ? { type: "success", text: "Settings saved! ✅" } : { type: "error", text: data.error || "Failed" });
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSaving(false);
    };

    if (loading) {
        return <CatLoader message="Loading welcome settings..." />;
    }

    return (
        <div className="space-y-8 animate-fade-in pb-64">
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-stone-800 mb-2">Welcome & Greetings</h1>
                    <p className="text-stone-500 text-lg max-w-2xl">
                        Customize automatic messages for new members, boosts, and more.
                    </p>
                </div>
                <div className="relative z-10 flex gap-3">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={saving}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <span>💾</span> Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {message && (
                <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    } animate-slide-up`}>
                    <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                    <span className="font-bold">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-2 bg-white/20 hover:bg-white/30 rounded-full w-6 h-6 flex items-center justify-center text-sm transition">✕</button>
                </div>
            )}

            {/* Message Type List (Vertical Stack) */}
            <div className="flex flex-col gap-4">
                {MESSAGE_TYPES.map((type) => {
                    const isActive = activeMessageType === type.type;
                    const config = settings[type.type];

                    return (
                        <div
                            key={type.type}
                            onClick={() => setActiveMessageType(type.type as MessageType)}
                            className={`relative bg-white rounded-2xl p-6 border-2 transition-all cursor-pointer hover:shadow-md flex flex-col md:flex-row gap-6 items-start md:items-center ${isActive ? 'border-amber-400 ring-2 ring-amber-400/10' : 'border-stone-100'
                                }`}
                        >
                            {/* Icon & Info */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl ${type.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : type.color === 'red' ? 'bg-red-100 text-red-600' : type.color === 'pink' ? 'bg-pink-100 text-pink-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {type.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800">{type.title}</h3>
                                    <p className="text-stone-500 font-medium">{type.desc}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto" onClick={e => e.stopPropagation()}>

                                {/* Channel Selector */}
                                <select
                                    value={config.channel_id || ""}
                                    onChange={(e) => {
                                        setSettings(prev => ({
                                            ...prev,
                                            [type.type]: { ...prev[type.type as MessageType], channel_id: e.target.value }
                                        }));
                                    }}
                                    className="px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-600 outline-none focus:border-amber-400 min-w-[200px]"
                                >
                                    <option value="">🚫 No Channel</option>
                                    {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                </select>

                                {/* Buttons Group */}
                                <div className="flex items-center gap-3">
                                    {type.type === "role" && config.announce_type === "both" ? (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMessageType(type.type as MessageType);
                                                    setEditingSubtype("add");
                                                    setShowEditor(true);
                                                }}
                                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-xl font-bold transition flex items-center gap-1 text-xs"
                                            >
                                                ✏️ Add Msg
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMessageType(type.type as MessageType);
                                                    setEditingSubtype("remove");
                                                    setShowEditor(true);
                                                }}
                                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl font-bold transition flex items-center gap-1 text-xs"
                                            >
                                                ✏️ Remove Msg
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMessageType(type.type as MessageType);
                                                setEditingSubtype(type.type === "role" && config.announce_type === "remove" ? "remove" : "add");
                                                setShowEditor(true);
                                            }}
                                            className="px-5 py-2.5 bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-700 rounded-xl font-bold transition flex items-center gap-2"
                                        >
                                            ✏️ {type.type === "role" && config.announce_type === "remove" ? "Edit Remove Msg" : "Edit"}
                                        </button>
                                    )}

                                    <label className="relative cursor-pointer">
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
                                        <div className="w-14 h-8 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Role Settings Expander for 'Role' type */}
                            {type.type === "role" && isActive && (
                                <div className="absolute top-full left-0 right-0 mt-[-20px] pt-12 pb-8 px-8 bg-stone-50 rounded-b-2xl border-x-2 border-b-2 border-amber-400 z-10 animate-slide-down shadow-inner" onClick={e => e.stopPropagation()}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-600 mb-2">🎭 Tracked Roles</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(config.tracked_roles || []).map(roleId => {
                                                    const role = roles.find(r => r.id === roleId);
                                                    return role ? (
                                                        <span key={roleId} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-200">
                                                            {role.name}
                                                            <button
                                                                onClick={() => setSettings(prev => ({
                                                                    ...prev,
                                                                    role: { ...prev.role, tracked_roles: (prev.role.tracked_roles || []).filter(id => id !== roleId) }
                                                                }))}
                                                                className="hover:text-red-500 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/50"
                                                            >×</button>
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value && !(config.tracked_roles || []).includes(e.target.value)) {
                                                        setSettings(prev => ({
                                                            ...prev,
                                                            role: { ...prev.role, tracked_roles: [...(prev.role.tracked_roles || []), e.target.value] }
                                                        }));
                                                    }
                                                }}
                                                className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-indigo-400 focus:outline-none text-sm font-medium"
                                            >
                                                <option value="">+ Add role to track...</option>
                                                {roles.filter(r => !(config.tracked_roles || []).includes(r.id)).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-stone-600 mb-2">📣 Announcement Type</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { val: 'both', label: 'Add & Remove' },
                                                    { val: 'add', label: 'Add Only' },
                                                    { val: 'remove', label: 'Remove Only' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.val}
                                                        onClick={() => setSettings(prev => ({
                                                            ...prev,
                                                            role: { ...prev.role, announce_type: opt.val as any }
                                                        }))}
                                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${config.announce_type === opt.val
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                            : 'border-stone-200 text-stone-500 hover:border-stone-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
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
                    onClose={() => setShowEditor(false)}
                    initialMessage={{
                        message_id: null,
                        channel_id: currentConfig.channel_id || "",
                        message_content: (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                            ? currentConfig.remove_message.message_content
                            : currentConfig.message_content,
                        embeds: (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                            ? currentConfig.remove_message.embeds
                            : currentConfig.embeds,
                        component_rows: (activeMessageType === 'role' && editingSubtype === 'remove' && currentConfig.remove_message)
                            ? currentConfig.remove_message.component_rows || []
                            : currentConfig.component_rows || []
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

        </div>
    );
}
