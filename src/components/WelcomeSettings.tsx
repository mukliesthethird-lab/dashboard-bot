"use client";

import { useState, useEffect } from "react";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import ToastContainer, { useToast } from "./Toast";
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
                            remove_message: parsed[type]?.remove_message || (type === 'role' ? {
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
            <div className="bg-[#2b2d31] rounded-[8px] p-8 relative flex flex-col md:flex-row justify-between items-center gap-6 border border-[#1e1f22]">
                <div className="relative z-10 w-full">
                    <h1 className="text-2xl font-bold text-[#dbdee1] mb-2 flex items-center gap-3">
                        <span className="text-[#5865F2]">👋</span> Welcome & Greetings
                    </h1>
                    <p className="text-[#b5bac1] text-sm max-w-2xl">
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
                            className={`relative bg-[#2b2d31] rounded-[8px] p-6 border transition-all cursor-pointer flex flex-col md:flex-row gap-6 items-start md:items-center ${isActive ? 'border-[#5865F2] ring-1 ring-[#5865F2]/50' : 'border-[#1e1f22] hover:border-[#4e5058]'
                                }`}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl ${type.color === 'emerald' ? 'bg-[#248046]/20 text-[#248046]' : type.color === 'red' ? 'bg-[#da373c]/20 text-[#da373c]' : type.color === 'pink' ? 'bg-[#eb459e]/20 text-[#eb459e]' : 'bg-[#5865F2]/20 text-[#5865F2]'}`}>
                                    {type.icon}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#dbdee1]">{type.title}</h3>
                                    <p className="text-[#b5bac1] text-sm">{type.desc}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto" onClick={e => e.stopPropagation()}>

                                <select
                                    value={config.channel_id || ""}
                                    onChange={(e) => {
                                        setSettings(prev => ({
                                            ...prev,
                                            [type.type]: { ...prev[type.type as MessageType], channel_id: e.target.value }
                                        }));
                                    }}
                                    className="px-3 py-2 bg-[#1e1f22] border border-transparent rounded-[3px] text-sm font-medium text-[#dbdee1] outline-none focus:ring-1 focus:ring-[#5865F2] min-w-[200px]"
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
                                                className="px-3 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white rounded-[3px] font-medium transition flex items-center gap-1 text-xs"
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
                                                className="px-3 py-1.5 bg-[#da373c] hover:bg-[#a12828] text-white rounded-[3px] font-medium transition flex items-center gap-1 text-xs"
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
                                            className="px-4 py-2 bg-[#4e5058] hover:bg-[#686d73] text-white rounded-[3px] font-medium transition flex items-center gap-2 text-sm"
                                        >
                                            ✏️ {type.type === "role" && config.announce_type === "remove" ? "Edit Remove Msg" : "Edit"}
                                        </button>
                                    )}

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

                            {/* Role Settings Expander for 'Role' type */}
                            {type.type === "role" && isActive && (
                                <div className="absolute top-full left-0 right-0 mt-[-8px] pt-8 pb-6 px-6 bg-[#1e1f22] rounded-b-[8px] border-x border-b border-[#5865F2] z-10 animate-slide-down" onClick={e => e.stopPropagation()}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[12px] font-bold text-[#b5bac1] uppercase tracking-wide mb-2">🎭 Tracked Roles</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {(config.tracked_roles || []).map(roleId => {
                                                    const role = roles.find(r => r.id === roleId);
                                                    return role ? (
                                                        <span key={roleId} className="px-2 py-1 bg-[#5865F2]/20 text-[#dbdee1] rounded-[3px] text-[12px] font-medium flex items-center gap-2 border border-[#5865F2]/50">
                                                            {role.name}
                                                            <button
                                                                onClick={() => setSettings(prev => ({
                                                                    ...prev,
                                                                    role: { ...prev.role, tracked_roles: (prev.role.tracked_roles || []).filter(id => id !== roleId) }
                                                                }))}
                                                                className="hover:text-[#da373c] w-4 h-4 flex items-center justify-center rounded-full hover:bg-[#313338]"
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
                                                className="w-full px-3 py-2 rounded-[3px] bg-[#2b2d31] border border-transparent focus:ring-1 focus:ring-[#5865F2] focus:outline-none text-sm font-medium text-[#dbdee1]"
                                            >
                                                <option value="">+ Add role to track...</option>
                                                {roles.filter(r => !(config.tracked_roles || []).includes(r.id)).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[12px] font-bold text-[#b5bac1] uppercase tracking-wide mb-2">📣 Announcement Type</label>
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
                                                        className={`flex-1 py-1.5 rounded-[3px] text-[12px] font-medium border transition ${config.announce_type === opt.val
                                                            ? 'border-[#5865F2] bg-[#5865F2]/20 text-[#dbdee1]'
                                                            : 'border-transparent bg-[#4e5058] text-[#dbdee1] hover:bg-[#686d73]'
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

            {/* Unsaved Changes Bar */}
            {JSON.stringify(settings) !== JSON.stringify(originalSettings) && originalSettings && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#111214] border border-[#1e1f22] px-4 py-3 rounded-[8px] shadow-2xl animate-fade-in-up flex items-center justify-between gap-6 min-w-[400px]">
                    <span className="text-[#dbdee1] font-semibold text-sm line-clamp-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={resetSettings}
                            className="text-[#dbdee1] hover:underline text-sm font-medium transition-colors"
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
