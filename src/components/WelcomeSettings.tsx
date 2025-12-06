"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";
import ComponentEditor from "./ComponentEditor";

interface Channel {
    id: string;
    name: string;
    position: number;
}

interface EmbedField {
    name: string;
    value: string;
    inline: boolean;
}

interface EmbedData {
    author_name: string;
    author_icon_url: string;
    title: string;
    description: string;
    color: string;
    thumbnail_url: string;
    image_url: string;
    footer_text: string;
    footer_icon_url: string;
    fields: EmbedField[];
}

interface EmojiData {
    name: string;
    id?: string;
}

interface SelectMenuOption {
    value: string;
    label: string;
    description?: string;
    emoji?: EmojiData;
    action_type?: 'add_role' | 'remove_role' | 'toggle_role';
    role_id?: string;
}

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

const VARIABLES = [
    { var: '{user}', desc: 'Mention (@user)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { var: '{user.name}', desc: 'Username', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { var: '{user.avatar}', desc: 'Avatar URL', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { var: '{server}', desc: 'Server name', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { var: '{server.members}', desc: 'Member count', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { var: '{date}', desc: 'Current date', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { var: '{role}', desc: 'Role name (for role messages)', color: 'bg-pink-100 text-pink-700 border-pink-200' },
];

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
    announce_type: "both"
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
    const [roles, setRoles] = useState<{ id: string; name: string; color: number }[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // UI States
    const [activeMessageType, setActiveMessageType] = useState<MessageType>("join");
    const [activeTab, setActiveTab] = useState<"visual" | "components" | "variables">("visual");
    const [activeEmbedIndex, setActiveEmbedIndex] = useState(0);
    const [showEditor, setShowEditor] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    // Modal state
    const [activeComponent, setActiveComponent] = useState<{ row: number, col: number } | null>(null);
    const [compSettings, setCompSettings] = useState<any>(null);
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

    const currentConfig = settings[activeMessageType];
    const currentTypeInfo = MESSAGE_TYPES.find(t => t.type === activeMessageType)!;

    useEffect(() => {
        if (activeComponent) {
            const comp = currentConfig.component_rows?.[activeComponent.row]?.[activeComponent.col];
            setCompSettings(comp || null);
        } else {
            setCompSettings(null);
        }
    }, [activeComponent, currentConfig.component_rows]);

    const saveCompSettings = (updates: any) => {
        if (!activeComponent || !compSettings) return;
        const rows = [...(currentConfig.component_rows || [])];
        rows[activeComponent.row] = rows[activeComponent.row].map((c: any, i: number) =>
            i === activeComponent.col ? { ...c, ...updates } : c
        );
        updateConfig({ component_rows: rows });
    };

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
                            announce_type: parsed[type]?.announce_type || "both"
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

    const updateConfig = (updates: Partial<MessageConfig>) => {
        setSettings(prev => ({
            ...prev,
            [activeMessageType]: { ...prev[activeMessageType], ...updates }
        }));
    };

    const addEmbed = () => {
        if (currentConfig.embeds.length >= 10) return;
        const newEmbed = createDefaultEmbed(activeMessageType);
        newEmbed.title = `Embed ${currentConfig.embeds.length + 1}`;
        updateConfig({ embeds: [...currentConfig.embeds, newEmbed] });
        setActiveEmbedIndex(currentConfig.embeds.length);
    };

    const removeEmbed = (index: number) => {
        if (currentConfig.embeds.length <= 1) return;
        updateConfig({ embeds: currentConfig.embeds.filter((_, i) => i !== index) });
        if (activeEmbedIndex >= currentConfig.embeds.length - 1) {
            setActiveEmbedIndex(Math.max(0, currentConfig.embeds.length - 2));
        }
    };

    const updateEmbed = (key: keyof EmbedData, value: any) => {
        updateConfig({
            embeds: currentConfig.embeds.map((e, i) => i === activeEmbedIndex ? { ...e, [key]: value } : e)
        });
    };

    const addField = () => {
        const embed = currentConfig.embeds[activeEmbedIndex];
        if (embed.fields.length >= 25) return;
        updateEmbed('fields', [...embed.fields, { name: 'Field', value: 'Value', inline: false }]);
    };

    const updateField = (fieldIndex: number, updates: Partial<EmbedField>) => {
        const embed = currentConfig.embeds[activeEmbedIndex];
        const newFields = [...embed.fields];
        newFields[fieldIndex] = { ...newFields[fieldIndex], ...updates };
        updateEmbed('fields', newFields);
    };

    const removeField = (fieldIndex: number) => {
        const embed = currentConfig.embeds[activeEmbedIndex];
        updateEmbed('fields', embed.fields.filter((_, i) => i !== fieldIndex));
    };

    const addActionRow = () => {
        if (currentConfig.action_rows.length >= 5) return;
        updateConfig({ action_rows: [...currentConfig.action_rows, []] });
    };

    const addButton = (rowIndex: number) => {
        if (currentConfig.action_rows[rowIndex].length >= 5) return;
        updateConfig({
            action_rows: currentConfig.action_rows.map((row, i) =>
                i === rowIndex ? [...row, { label: 'Button', url: '', emoji: '', style: 'link' as const }] : row
            )
        });
    };

    const updateButton = (rowIndex: number, btnIndex: number, updates: Partial<ActionButton>) => {
        updateConfig({
            action_rows: currentConfig.action_rows.map((row, i) =>
                i === rowIndex ? row.map((btn, j) => j === btnIndex ? { ...btn, ...updates } : btn) : row
            )
        });
    };


    // --- COMPONENT ROWS LOGIC ---
    const addComponentRow = () => {
        if ((currentConfig.component_rows || []).length >= 5) return;
        updateConfig({ component_rows: [...(currentConfig.component_rows || []), []] });
    };

    const addComponent = (rowIndex: number, type: 'button' | 'select_menu') => {
        const rows = [...(currentConfig.component_rows || [])];
        if (rows[rowIndex].length >= 5) return; // limit per row

        const newComponent = type === 'button'
            ? { type: 2, style: 1, label: 'Button', custom_id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` }
            : { type: 3, placeholder: 'Select Menu', custom_id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, options: [] };

        rows[rowIndex] = [...rows[rowIndex], newComponent];
        updateConfig({ component_rows: rows });
    };

    const removeComponent = (rowIndex: number, compIndex: number) => {
        const rows = [...(currentConfig.component_rows || [])];
        rows[rowIndex] = rows[rowIndex].filter((_: any, i: number) => i !== compIndex);
        updateConfig({ component_rows: rows });
    };

    const removeComponentRow = (rowIndex: number) => {
        updateConfig({ component_rows: (currentConfig.component_rows || []).filter((_: any, i: number) => i !== rowIndex) });
    };


    const clearAll = () => {
        updateConfig({
            message_content: '',
            embeds: [createDefaultEmbed(activeMessageType)],
            component_rows: []
        });
        setActiveEmbedIndex(0);
    };

    const preview = (text: string) => text
        .replace(/{user}/g, '@ExampleUser')
        .replace(/{user\.name}/g, 'ExampleUser')
        .replace(/{user\.avatar}/g, 'https://cdn.discordapp.com/embed/avatars/0.png')
        .replace(/{server}/g, 'My Server')
        .replace(/{server\.members}/g, '1,234')
        .replace(/{date}/g, new Date().toLocaleDateString())
        .replace(/{role}/g, 'VIP');

    const renderPreview = () => (
        <div className="bg-stone-100 rounded-2xl p-4 border-2 border-stone-200">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-lg">🐔</div>
                <div>
                    <span className="font-bold text-stone-800">Don Pollo</span>
                    <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">BOT</span>
                </div>
            </div>

            {currentConfig.message_content && (
                <p className="text-stone-700 text-sm mb-3">{preview(currentConfig.message_content)}</p>
            )}

            {currentConfig.embeds.map((e, idx) => (
                <div key={idx} className="flex mb-2">
                    <div className="w-1 rounded-l" style={{ backgroundColor: e.color || '#FFD700' }}></div>
                    <div className="bg-white flex-1 p-3 rounded-r shadow-sm border border-stone-200">
                        {e.author_name && (
                            <div className="flex items-center gap-2 mb-1">
                                {e.author_icon_url && <img src={preview(e.author_icon_url)} alt="" className="w-5 h-5 rounded-full" />}
                                <span className="text-stone-600 text-xs">{preview(e.author_name)}</span>
                            </div>
                        )}
                        {e.title && <div className="text-blue-600 font-bold text-sm mb-1">{preview(e.title)}</div>}
                        {e.description && <div className="text-stone-600 text-sm whitespace-pre-wrap">{preview(e.description)}</div>}
                        {e.fields.length > 0 && (
                            <div className="grid gap-2 mt-2 grid-cols-2">
                                {e.fields.map((f, i) => (
                                    <div key={i} className={f.inline ? '' : 'col-span-2'}>
                                        <div className="text-stone-800 text-xs font-bold">{preview(f.name)}</div>
                                        <div className="text-stone-600 text-xs">{preview(f.value)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {e.image_url && <img src={preview(e.image_url)} alt="" className="mt-2 rounded max-h-32 object-cover" />}
                        {e.footer_text && (
                            <div className="flex items-center gap-1 mt-2 pt-1 border-t border-stone-100">
                                {e.footer_icon_url && <img src={preview(e.footer_icon_url)} alt="" className="w-4 h-4 rounded-full" />}
                                <span className="text-stone-400 text-xs">{preview(e.footer_text)}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {(currentConfig.component_rows || []).length > 0 && (
                <div className="mt-2 space-y-2">
                    {(currentConfig.component_rows || []).map((row: any[], ri: number) => (
                        <div key={ri} className="flex gap-2 relative z-10">
                            {row.map((comp: any, ci: number) => {
                                if (!comp) return null;
                                if (comp.type === 2) {
                                    // Button
                                    const styleClasses = {
                                        1: "bg-[#5865F2] hover:bg-[#4752C4] text-white", // Primary (Blurple)
                                        2: "bg-[#4F545C] hover:bg-[#36393F] text-white", // Secondary (Grey)
                                        3: "bg-[#2D7D46] hover:bg-[#1F542F] text-white", // Success (Green)
                                        4: "bg-[#ED4245] hover:bg-[#C03537] text-white", // Danger (Red)
                                        5: "bg-[#4F545C] hover:bg-[#36393F] text-white" // Link
                                    }[comp.style as number] || "bg-[#5865F2] text-white";

                                    return (
                                        <button
                                            key={ci}
                                            className={`px-4 py-2 rounded text-sm font-bold transition duration-200 transform active:scale-95 flex items-center gap-2 ${styleClasses} ${comp.style === 5 ? 'cursor-alias' : ''}`}
                                            onClick={() => window.alert(`[PREVIEW] Button Clicked: ${comp.label}`)}
                                        >
                                            {comp.emoji && <span>{comp.emoji}</span>}
                                            {comp.label || 'Button'}
                                            {comp.style === 5 && <span className="text-[10px]">🔗</span>}
                                        </button>
                                    );
                                } else if (comp.type === 3) {
                                    // Select Menu
                                    const menuId = `menu_${ri}_${ci}`;
                                    const isExpanded = expandedMenus.has(menuId);

                                    return (
                                        <div key={ci} className="flex-1 min-w-0 relative">
                                            <button
                                                className="w-full bg-stone-700 hover:bg-stone-600 text-white px-3 py-2 rounded text-sm border-2 border-stone-600 flex justify-between items-center cursor-pointer transition"
                                                onClick={() => {
                                                    const newSet = new Set(expandedMenus);
                                                    if (isExpanded) {
                                                        newSet.delete(menuId);
                                                    } else {
                                                        newSet.add(menuId);
                                                    }
                                                    setExpandedMenus(newSet);
                                                }}
                                            >
                                                <span className="truncate">{comp.placeholder || 'Select option...'}</span>
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {isExpanded && comp.options && comp.options.length > 0 && (
                                                <div className="absolute z-50 mt-1 w-full bg-white border-2 border-stone-300 rounded shadow-lg max-h-60 overflow-y-auto">
                                                    {comp.options.map((opt: any, oi: number) => (
                                                        <div
                                                            key={oi}
                                                            className="px-3 py-2 hover:bg-stone-100 cursor-pointer border-b border-stone-200 last:border-b-0"
                                                            onClick={() => window.alert(`[PREVIEW] Selected: ${opt.label}`)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {opt.emoji?.name && (
                                                                    <span className="text-lg">{opt.emoji.name}</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-stone-800 text-sm">{opt.label}</div>
                                                                    {opt.description && (
                                                                        <div className="text-xs text-stone-500">{opt.description}</div>
                                                                    )}
                                                                </div>
                                                                {opt.action_type && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold uppercase">
                                                                        {opt.action_type.replace('_', ' ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-6xl animate-bounce">👋</div>
            </div>
        );
    }

    const currentEmbed = currentConfig.embeds[activeEmbedIndex] || createDefaultEmbed(activeMessageType);

    const getColorClasses = (color: string, enabled: boolean) => {
        const colors: Record<string, { border: string, bg: string, text: string, toggle: string }> = {
            emerald: { border: "border-emerald-200", bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-700", toggle: enabled ? "bg-emerald-500" : "bg-stone-300" },
            red: { border: "border-red-200", bg: "bg-red-100 hover:bg-red-200", text: "text-red-700", toggle: enabled ? "bg-red-500" : "bg-stone-300" },
            pink: { border: "border-pink-200", bg: "bg-pink-100 hover:bg-pink-200", text: "text-pink-700", toggle: enabled ? "bg-pink-500" : "bg-stone-300" },
            indigo: { border: "border-indigo-200", bg: "bg-indigo-100 hover:bg-indigo-200", text: "text-indigo-700", toggle: enabled ? "bg-indigo-500" : "bg-stone-300" },
        };
        return colors[color] || colors.emerald;
    };

    return (
        <>
            {message && (
                <div className={`mb-6 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200" : "bg-red-100 text-red-700 border-2 border-red-200"}`}>
                    {message.text}
                </div>
            )}

            {/* Message Type Cards */}
            <div className="space-y-4 mb-6">
                {MESSAGE_TYPES.map(({ type, icon, title, desc, color }) => {
                    const config = settings[type] || createDefaultConfig(type);
                    const colorClasses = getColorClasses(color, config.enabled);

                    return (
                        <div key={type} className={`bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 ${colorClasses.border} shadow-md`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{icon}</div>
                                    <div>
                                        <div className="font-black text-stone-800">{title}</div>
                                        <div className="text-stone-500 text-sm">{desc}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettings(prev => ({
                                        ...prev,
                                        [type]: { ...prev[type], enabled: !prev[type].enabled }
                                    }))}
                                    className={`relative w-14 h-7 rounded-full transition-colors ${colorClasses.toggle}`}
                                >
                                    <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-0.5'}`} />
                                </button>
                            </div>

                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-stone-500 mb-1">📢 Channel</label>
                                    <select
                                        value={config.channel_id || ''}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            [type]: { ...prev[type], channel_id: e.target.value || null }
                                        }))}
                                        className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm"
                                    >
                                        <option value="">Select channel...</option>
                                        {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => { setActiveMessageType(type); setActiveEmbedIndex(0); setShowEditor(true); }}
                                    className={`px-4 py-2 ${colorClasses.bg} ${colorClasses.text} font-bold rounded-xl transition whitespace-nowrap`}
                                >
                                    ✏️ Edit
                                </button>
                            </div>

                            {/* Role-specific settings */}
                            {type === "role" && (
                                <div className="mt-4 pt-4 border-t border-stone-200 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">🎭 Tracked Roles</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(config.tracked_roles || []).map(roleId => {
                                                const role = roles.find(r => r.id === roleId);
                                                return role ? (
                                                    <span key={roleId} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold flex items-center gap-1">
                                                        {role.name}
                                                        <button
                                                            onClick={() => setSettings(prev => ({
                                                                ...prev,
                                                                role: { ...prev.role, tracked_roles: (prev.role.tracked_roles || []).filter(id => id !== roleId) }
                                                            }))}
                                                            className="hover:text-red-500"
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
                                            className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-indigo-400 focus:outline-none text-sm"
                                        >
                                            <option value="">+ Add role to track...</option>
                                            {roles.filter(r => !(config.tracked_roles || []).includes(r.id)).map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-stone-400 mt-1">Leave empty to track all roles</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">📣 Announce When</label>
                                        <select
                                            value={config.announce_type || "both"}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                role: { ...prev.role, announce_type: e.target.value as "add" | "remove" | "both" }
                                            }))}
                                            className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-indigo-400 focus:outline-none text-sm"
                                        >
                                            <option value="both">🔄 Role Added & Removed</option>
                                            <option value="add">➕ Role Added Only</option>
                                            <option value="remove">➖ Role Removed Only</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto pt-24 pb-8" onClick={() => setShowEditor(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-5xl mx-4 shadow-2xl border-2 border-amber-200 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-stone-200">
                            <h2 className="text-xl font-black text-stone-800 flex items-center gap-2">
                                {currentTypeInfo.icon} {currentTypeInfo.title}
                            </h2>
                            <button onClick={() => setShowEditor(false)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold transition">×</button>
                        </div>

                        <div className="flex border-b border-stone-200 px-5 items-center justify-between">
                            <div className="flex">
                                <button onClick={() => setActiveTab("visual")} className={`px-6 py-3 font-bold border-b-2 transition ${activeTab === "visual" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-500"}`}>✏️ Visual Editor</button>
                                <button onClick={() => setActiveTab("variables")} className={`px-6 py-3 font-bold border-b-2 transition ${activeTab === "variables" ? "border-amber-500 text-amber-600" : "border-transparent text-stone-500"}`}>📝 Variables</button>
                            </div>
                        </div>


                        {/* COMPONENT SETTINGS POPOVER */}
                        {activeComponent && compSettings && (
                            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/5" onClick={() => setActiveComponent(null)}>
                                <div className="bg-white text-stone-800 p-4 rounded-xl shadow-2xl border-2 border-stone-200 w-96 relative" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-700">
                                        <div className="font-bold uppercase text-xs tracking-wider text-stone-400">
                                            {compSettings.type === 2 ? 'Button Settings' : 'Menu Settings'}
                                        </div>
                                        <button onClick={() => setActiveComponent(null)} className="text-stone-400 hover:text-white">×</button>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Common: Action */}
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 mb-1">↗️ ACTION</label>
                                            <select
                                                value={compSettings.action_type || ''}
                                                onChange={(e) => saveCompSettings({ action_type: e.target.value })}
                                                className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                            >
                                                <option value="">No Action</option>
                                                <option value="add_role">Add Role</option>
                                                <option value="remove_role">Remove Role</option>
                                                <option value="toggle_role">Toggle Role</option>
                                            </select>
                                        </div>

                                        {/* Role Selector if Action needs it */}
                                        {['add_role', 'remove_role', 'toggle_role'].includes(compSettings.action_type) && (
                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 mb-1">🎭 TARGET ROLE</label>
                                                <select
                                                    value={compSettings.role_id || ''}
                                                    onChange={(e) => saveCompSettings({ role_id: e.target.value })}
                                                    className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                >
                                                    <option value="">Select Role...</option>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {/* Button Specifics */}
                                        {compSettings.type === 2 && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">🏷️ LABEL</label>
                                                    <input
                                                        type="text"
                                                        value={compSettings.label || ''}
                                                        onChange={(e) => saveCompSettings({ label: e.target.value })}
                                                        className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">🎨 STYLE</label>
                                                    <select
                                                        value={compSettings.style || 1}
                                                        onChange={(e) => saveCompSettings({ style: parseInt(e.target.value) })}
                                                        className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                    >
                                                        <option value={1}>Blurple (Primary)</option>
                                                        <option value={2}>Grey (Secondary)</option>
                                                        <option value={3}>Green (Success)</option>
                                                        <option value={4}>Red (Danger)</option>
                                                        <option value={5}>Link (URL)</option>
                                                    </select>
                                                </div>
                                                {compSettings.style === 5 && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">🔗 URL</label>
                                                        <input
                                                            type="text"
                                                            value={compSettings.url || ''}
                                                            onChange={(e) => saveCompSettings({ url: e.target.value })}
                                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Select Menu Specifics */}
                                        {compSettings.type === 3 && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">💭 PLACEHOLDER</label>
                                                    <input
                                                        type="text"
                                                        value={compSettings.placeholder || ''}
                                                        onChange={(e) => saveCompSettings({ placeholder: e.target.value })}
                                                        className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">⬇️ MIN</label>
                                                        <input
                                                            type="number" min={0} max={25}
                                                            value={compSettings.min_values || 1}
                                                            onChange={(e) => saveCompSettings({ min_values: parseInt(e.target.value) })}
                                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">⬆️ MAX</label>
                                                        <input
                                                            type="number" min={1} max={25}
                                                            value={compSettings.max_values || 1}
                                                            onChange={(e) => saveCompSettings({ max_values: parseInt(e.target.value) })}
                                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* OPTIONS EDITOR */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-bold text-stone-400">📝 OPTIONS ({compSettings.options?.length || 0}/25)</label>
                                                        <button
                                                            onClick={() => {
                                                                const newOpt = { label: 'New Option', value: `opt_${Date.now()}`, action_type: '', role_id: '' };
                                                                saveCompSettings({ options: [...(compSettings.options || []), newOpt] });
                                                            }}
                                                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white font-bold"
                                                        >
                                                            + Add
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                        {(compSettings.options || []).map((opt: any, idx: number) => (
                                                            <div key={idx} className="bg-stone-50 p-3 rounded border-2 border-stone-200 text-xs space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-stone-600">Option #{idx + 1}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newOpts = compSettings.options.filter((_: any, i: number) => i !== idx);
                                                                            saveCompSettings({ options: newOpts });
                                                                        }}
                                                                        className="text-red-400 hover:text-red-600"
                                                                    >×</button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <input
                                                                        placeholder="Label"
                                                                        value={opt.label}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...compSettings.options];
                                                                            newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                                                            saveCompSettings({ options: newOpts });
                                                                        }}
                                                                        className="bg-white border-2 border-stone-200 rounded px-2 py-1 focus:border-amber-400 outline-none w-full text-stone-700"
                                                                    />
                                                                    <input
                                                                        placeholder="Value/Desc"
                                                                        value={opt.description || ''}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...compSettings.options];
                                                                            newOpts[idx] = { ...newOpts[idx], description: e.target.value };
                                                                            saveCompSettings({ options: newOpts });
                                                                        }}
                                                                        className="bg-white border-2 border-stone-200 rounded px-2 py-1 focus:border-amber-400 outline-none w-full text-stone-700"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-stone-500 uppercase font-bold">Action:</span>
                                                                    <select
                                                                        value={opt.action_type || ''}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...compSettings.options];
                                                                            newOpts[idx] = { ...newOpts[idx], action_type: e.target.value };
                                                                            saveCompSettings({ options: newOpts });
                                                                        }}
                                                                        className="bg-white border-2 border-stone-200 rounded px-2 py-1 flex-1 outline-none focus:border-amber-400 text-stone-700"
                                                                    >
                                                                        <option value="">None</option>
                                                                        <option value="add_role">Add Role</option>
                                                                        <option value="remove_role">Remove Role</option>
                                                                    </select>
                                                                </div>
                                                                {['add_role', 'remove_role'].includes(opt.action_type) && (
                                                                    <select
                                                                        value={opt.role_id || ''}
                                                                        onChange={(e) => {
                                                                            const newOpts = [...compSettings.options];
                                                                            newOpts[idx] = { ...newOpts[idx], role_id: e.target.value };
                                                                            saveCompSettings({ options: newOpts });
                                                                        }}
                                                                        className="bg-white border-2 border-stone-200 rounded px-2 py-1 w-full outline-none focus:border-amber-400 text-stone-700"
                                                                    >
                                                                        <option value="">Select Role...</option>
                                                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 p-5 overflow-y-auto">
                                {activeTab === "visual" && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-600 mb-2">💬 Message Content</label>
                                            <input type="text" value={currentConfig.message_content} onChange={(e) => updateConfig({ message_content: e.target.value })} placeholder="Text outside embed..." className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:outline-none font-medium" />
                                        </div>

                                        <div className="bg-stone-50 rounded-2xl p-4 border-2 border-stone-200">
                                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                                {currentConfig.embeds.map((_, idx) => (
                                                    <button key={idx} onClick={() => setActiveEmbedIndex(idx)} className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 ${activeEmbedIndex === idx ? "bg-amber-400 text-white" : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"}`}>
                                                        Embed {idx + 1}
                                                        {currentConfig.embeds.length > 1 && <span onClick={(e) => { e.stopPropagation(); removeEmbed(idx); }} className="text-xs hover:text-red-500">×</span>}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Author Name</label>
                                                        <input type="text" value={currentEmbed.author_name} onChange={(e) => updateEmbed('author_name', e.target.value)} placeholder="Author" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Author Icon</label>
                                                        <input type="text" value={currentEmbed.author_icon_url} onChange={(e) => updateEmbed('author_icon_url', e.target.value)} placeholder="URL" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Title</label>
                                                        <input type="text" value={currentEmbed.title} onChange={(e) => updateEmbed('title', e.target.value)} placeholder="Title" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Color</label>
                                                        <div className="flex gap-2">
                                                            <input type="color" value={currentEmbed.color} onChange={(e) => updateEmbed('color', e.target.value)} className="w-10 h-9 rounded cursor-pointer border-0" />
                                                            <input type="text" value={currentEmbed.color} onChange={(e) => updateEmbed('color', e.target.value)} className="flex-1 px-2 py-1 rounded-lg border-2 border-stone-200 font-mono text-sm" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">Description</label>
                                                    <textarea value={currentEmbed.description} onChange={(e) => updateEmbed('description', e.target.value)} placeholder="Description" rows={3} className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm resize-none" />
                                                </div>

                                                {/* EMBED FIELDS Editor */}
                                                <div className="mt-4 border-t border-stone-200 pt-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-bold text-stone-500">FIELDS</label>
                                                        <button
                                                            onClick={() => {
                                                                const newFields = [...(currentEmbed.fields || [])];
                                                                if (newFields.length < 25) {
                                                                    newFields.push({ name: '', value: '', inline: false });
                                                                    updateEmbed('fields', newFields);
                                                                }
                                                            }}
                                                            className="text-xs px-2 py-1 bg-amber-100 text-amber-600 hover:bg-amber-200 rounded font-bold transition"
                                                        >
                                                            + Add Field
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {currentEmbed.fields?.map((field: any, fi: number) => (
                                                            <div key={fi} className="p-3 bg-white border border-stone-200 rounded-lg space-y-2">
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-[10px] uppercase font-bold text-stone-400">Field #{fi + 1}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newFields = currentEmbed.fields?.filter((_: any, i: number) => i !== fi);
                                                                            updateEmbed('fields', newFields);
                                                                        }}
                                                                        className="text-red-400 hover:text-red-500 font-bold"
                                                                    >×</button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <input
                                                                        placeholder="Name"
                                                                        value={field.name}
                                                                        onChange={(e) => {
                                                                            const newFields = [...(currentEmbed.fields || [])];
                                                                            newFields[fi] = { ...newFields[fi], name: e.target.value };
                                                                            updateEmbed('fields', newFields);
                                                                        }}
                                                                        className="w-full px-2 py-1 rounded bg-stone-50 border border-stone-200 text-sm focus:border-amber-400 focus:outline-none placeholder-stone-400"
                                                                    />
                                                                    <input
                                                                        placeholder="Value"
                                                                        value={field.value}
                                                                        onChange={(e) => {
                                                                            const newFields = [...(currentEmbed.fields || [])];
                                                                            newFields[fi] = { ...newFields[fi], value: e.target.value };
                                                                            updateEmbed('fields', newFields);
                                                                        }}
                                                                        className="w-full px-2 py-1 rounded bg-stone-50 border border-stone-200 text-sm focus:border-amber-400 focus:outline-none placeholder-stone-400"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.inline}
                                                                        onChange={(e) => {
                                                                            const newFields = [...(currentEmbed.fields || [])];
                                                                            newFields[fi] = { ...newFields[fi], inline: e.target.checked };
                                                                            updateEmbed('fields', newFields);
                                                                        }}
                                                                        className="rounded text-amber-500 focus:ring-amber-400"
                                                                    />
                                                                    <span className="text-xs text-stone-500">Inline</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">🖼️ Thumbnail</label>
                                                        <input type="text" value={currentEmbed.thumbnail_url} onChange={(e) => updateEmbed('thumbnail_url', e.target.value)} placeholder="URL" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">🖼️ Image</label>
                                                        <input type="text" value={currentEmbed.image_url} onChange={(e) => updateEmbed('image_url', e.target.value)} placeholder="URL" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Footer Text</label>
                                                        <input type="text" value={currentEmbed.footer_text} onChange={(e) => updateEmbed('footer_text', e.target.value)} placeholder="Footer" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">Footer Icon</label>
                                                        <input type="text" value={currentEmbed.footer_icon_url} onChange={(e) => updateEmbed('footer_icon_url', e.target.value)} placeholder="URL" className="w-full px-3 py-2 rounded-lg border-2 border-stone-200 focus:border-amber-400 focus:outline-none text-sm" />
                                                    </div>
                                                </div>
                                            </div>



                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={addEmbed} disabled={currentConfig.embeds.length >= 10} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition disabled:opacity-50">+ Embed</button>
                                            <button onClick={addComponentRow} disabled={(currentConfig.component_rows || []).length >= 5} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition disabled:opacity-50">+ Action Row</button>

                                            <button onClick={clearAll} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition">Clear</button>
                                        </div>

                                        {/* Action Rows UI */}
                                        <div className="space-y-3 mt-4">
                                            {(currentConfig.component_rows || []).map((row, i) => (
                                                <div key={i} className="bg-stone-800 rounded-xl p-3 border-2 border-stone-700 flex items-center gap-3 relative group">
                                                    <div className="text-stone-500 text-xs font-bold uppercase tracking-wider w-12 text-center">Row {i + 1}</div>

                                                    {/* Row Items */}
                                                    <div className="flex-1 flex gap-2 overflow-x-auto py-1">
                                                        {row.map((comp: any, j: number) => {
                                                            const isActive = activeComponent?.row === i && activeComponent?.col === j;
                                                            return (
                                                                <div key={j} className="relative group/item">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setActiveComponent({ row: i, col: j }); }}
                                                                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border transition ${isActive ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-300 ring-offset-2 ring-offset-stone-800' : (comp.type === 2 ? 'bg-stone-700 text-white border-stone-600 hover:bg-stone-600' : 'bg-stone-700 text-stone-300 border-stone-600 hover:bg-stone-600')}`}
                                                                    >
                                                                        {comp.type === 2 ? (
                                                                            <>
                                                                                <span>{comp.style === 5 ? '🔗' : '🔘'}</span>
                                                                                <span>{comp.label || 'Button'}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span>🔽</span>
                                                                                <span>{comp.placeholder || 'Select Menu'}</span>
                                                                            </>
                                                                        )}
                                                                        {comp.action_type && <span className="text-[10px] bg-black/30 px-1 rounded uppercase tracking-wider">{comp.action_type.replace('_', ' ')}</span>}
                                                                        <span className="ml-1 opacity-50 text-xs">⚙️</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); removeComponent(i, j); if (isActive) setActiveComponent(null); }}
                                                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition shadow-md z-10"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Add Buttons inside Row */}
                                                        {row.length < 5 && (
                                                            <>
                                                                <button onClick={() => addComponent(i, 'button')} className="px-3 py-2 bg-stone-700/50 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg text-sm font-bold border border-stone-600 border-dashed transition whitespace-nowrap">
                                                                    + Button
                                                                </button>
                                                                <button onClick={() => addComponent(i, 'select_menu')} className="px-3 py-2 bg-stone-700/50 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg text-sm font-bold border border-stone-600 border-dashed transition whitespace-nowrap">
                                                                    + Select Menu
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>

                                                    <button onClick={() => removeComponentRow(i)} className="text-stone-600 hover:text-red-500 transition px-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "variables" && (
                                    <div className="space-y-2">
                                        <p className="text-stone-500 text-sm mb-4">Click to copy variable</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {VARIABLES.map(v => (
                                                <button key={v.var} onClick={() => {
                                                    navigator.clipboard.writeText(v.var);
                                                    setMessage({ type: "success", text: `Copied ${v.var}!` });
                                                }} className={`flex items-center justify-center p-3 rounded-xl border-2 transition hover:scale-[1.02] ${v.color} `}>
                                                    <span className="font-mono font-bold">{v.var}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-80 border-l border-stone-200 p-5 bg-stone-50 overflow-y-auto">
                                <h3 className="text-sm font-bold text-stone-600 mb-3">👁️ Preview</h3>
                                {renderPreview()}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-stone-200">
                            <button onClick={() => setShowEditor(false)} className="px-6 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Close</button>
                            <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-50">
                                {saving ? "..." : "💾 Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-amber-300" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">💾</div>
                            <h2 className="text-2xl font-black text-stone-800 mb-2">Konfirmasi</h2>
                            <p className="text-stone-600">Simpan semua pengaturan?</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition">Batal</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition disabled:opacity-50">{saving ? "..." : "Ya, Simpan"}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button onClick={() => setShowConfirm(true)} disabled={saving} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg transition disabled:opacity-50">
                    {saving ? "..." : "💾 Save All Settings"}
                </button>
            </div>
        </>
    );
}
