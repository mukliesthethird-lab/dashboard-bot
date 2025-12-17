"use client";

import { useState, useEffect } from "react";
import CatLoader from "./CatLoader";
import CustomDropdown from "./CustomDropdown";

interface Channel { id: string; name: string; }
interface Role { id: string; name: string; color: number; }
interface Member { id: string; username: string; display_name: string; avatar: string | null; }

interface LoggingSettings {
    guild_id: string;
    use_webhooks: boolean;
    ignore_embeds: boolean;
    ignore_voice_users: boolean;
    log_deleted_polls: boolean;
    log_sticky_messages: boolean;
    ignored_channels: string[];
    ignored_roles: string[];
    ignored_users: string[];
    category_channels: Record<string, string>;
    type_channels: Record<string, string>;
}

interface LoggingSettingsProps {
    guildId: string;
}

interface LogType {
    id: string;
    name: string;
}

interface LogCategory {
    id: string;
    name: string;
    icon: string;
    types: LogType[];
}

const LOG_CATEGORIES: LogCategory[] = [
    {
        id: "applications", name: "Applications", icon: "📋",
        types: [
            { id: "app_add", name: "App Add" },
            { id: "app_remove", name: "App Remove" },
            { id: "app_permission_update", name: "App Command Permission Update" },
        ]
    },
    {
        id: "channels", name: "Channels", icon: "📁",
        types: [
            { id: "channel_create", name: "Channel Create" },
            { id: "channel_delete", name: "Channel Delete" },
            { id: "channel_pins_update", name: "Channel Pins Update" },
            { id: "channel_name_update", name: "Channel Name Update" },
            { id: "channel_topic_update", name: "Channel Topic Update" },
            { id: "channel_nsfw_update", name: "Channel NSFW Update" },
            { id: "channel_parent_update", name: "Channel Parent Update" },
            { id: "channel_permissions_update", name: "Channel Permissions Update" },
            { id: "channel_type_update", name: "Channel Type Update" },
            { id: "channel_bitrate_update", name: "Channel Bitrate Update" },
            { id: "channel_user_limit_update", name: "Channel User Limit Update" },
            { id: "channel_slowmode_update", name: "Channel Slow Mode Update" },
            { id: "channel_rtc_region_update", name: "Channel RTC Region Update" },
            { id: "channel_video_quality_update", name: "Channel Video Quality Update" },
            { id: "channel_archive_duration_update", name: "Channel Default Archive Duration Update" },
            { id: "channel_thread_slowmode_update", name: "Channel Default Thread Slow Mode Update" },
            { id: "channel_reaction_emoji_update", name: "Channel Default Reaction Emoji Update" },
            { id: "channel_sort_order_update", name: "Channel Default Sort Order Update" },
            { id: "channel_forum_tags_update", name: "Channel Forum Tags Update" },
            { id: "channel_forum_layout_update", name: "Channel Forum Layout Update" },
            { id: "channel_voice_status_update", name: "Channel Voice Status Update" },
        ]
    },
    {
        id: "automod", name: "Discord AutoMod", icon: "🤖",
        types: [
            { id: "automod_rule_create", name: "AutoMod Rule Create" },
            { id: "automod_rule_update", name: "AutoMod Rule Update" },
            { id: "automod_rule_delete", name: "AutoMod Rule Delete" },
            { id: "automod_action_execute", name: "AutoMod Action Execute" },
        ]
    },
    {
        id: "emojis", name: "Emojis", icon: "😀",
        types: [
            { id: "emoji_create", name: "Emoji Create" },
            { id: "emoji_update", name: "Emoji Update" },
            { id: "emoji_delete", name: "Emoji Delete" },
        ]
    },
    {
        id: "events", name: "Events", icon: "📅",
        types: [
            { id: "event_create", name: "Scheduled Event Create" },
            { id: "event_update", name: "Scheduled Event Update" },
            { id: "event_delete", name: "Scheduled Event Delete" },
            { id: "event_user_add", name: "Scheduled Event User Add" },
            { id: "event_user_remove", name: "Scheduled Event User Remove" },
        ]
    },
    {
        id: "invites", name: "Invites", icon: "🔗",
        types: [
            { id: "invite_create", name: "Invite Create" },
            { id: "invite_delete", name: "Invite Delete" },
        ]
    },
    {
        id: "messages", name: "Messages", icon: "💬",
        types: [
            { id: "message_delete", name: "Message Delete" },
            { id: "message_bulk_delete", name: "Message Bulk Delete" },
            { id: "message_edit", name: "Message Edit" },
            { id: "message_pin", name: "Message Pin" },
            { id: "message_unpin", name: "Message Unpin" },
            { id: "reaction_add", name: "Reaction Add" },
            { id: "reaction_remove", name: "Reaction Remove" },
            { id: "reaction_clear", name: "Reaction Clear" },
        ]
    },
    {
        id: "polls", name: "Polls", icon: "📊",
        types: [
            { id: "poll_vote_add", name: "Poll Vote Add" },
            { id: "poll_vote_remove", name: "Poll Vote Remove" },
            { id: "poll_end", name: "Poll End" },
        ]
    },
    {
        id: "roles", name: "Roles", icon: "🎭",
        types: [
            { id: "role_create", name: "Role Create" },
            { id: "role_delete", name: "Role Delete" },
            { id: "role_name_update", name: "Role Name Update" },
            { id: "role_color_update", name: "Role Color Update" },
            { id: "role_permissions_update", name: "Role Permissions Update" },
            { id: "role_position_update", name: "Role Position Update" },
            { id: "role_mentionable_update", name: "Role Mentionable Update" },
            { id: "role_hoist_update", name: "Role Hoist Update" },
            { id: "role_icon_update", name: "Role Icon Update" },
        ]
    },
    {
        id: "stage", name: "Stage", icon: "🎤",
        types: [
            { id: "stage_instance_create", name: "Stage Instance Create" },
            { id: "stage_instance_update", name: "Stage Instance Update" },
            { id: "stage_instance_delete", name: "Stage Instance Delete" },
        ]
    },
    {
        id: "server", name: "Server", icon: "🏠",
        types: [
            { id: "guild_update", name: "Server Update" },
            { id: "guild_ban_add", name: "Server Ban Add" },
            { id: "guild_ban_remove", name: "Server Ban Remove" },
            { id: "guild_integrations_update", name: "Integrations Update" },
        ]
    },
    {
        id: "stickers", name: "Stickers", icon: "🏷️",
        types: [
            { id: "sticker_create", name: "Sticker Create" },
            { id: "sticker_update", name: "Sticker Update" },
            { id: "sticker_delete", name: "Sticker Delete" },
        ]
    },
    {
        id: "soundboard", name: "Soundboard", icon: "🔊",
        types: [
            { id: "soundboard_sound_create", name: "Soundboard Sound Create" },
            { id: "soundboard_sound_update", name: "Soundboard Sound Update" },
            { id: "soundboard_sound_delete", name: "Soundboard Sound Delete" },
        ]
    },
    {
        id: "threads", name: "Threads", icon: "🧵",
        types: [
            { id: "thread_create", name: "Thread Create" },
            { id: "thread_update", name: "Thread Update" },
            { id: "thread_delete", name: "Thread Delete" },
            { id: "thread_member_update", name: "Thread Member Update" },
        ]
    },
    {
        id: "users", name: "Users", icon: "👤",
        types: [
            { id: "member_join", name: "Member Join" },
            { id: "member_leave", name: "Member Leave" },
            { id: "member_update", name: "Member Update" },
            { id: "member_nickname_update", name: "Member Nickname Update" },
            { id: "member_roles_update", name: "Member Roles Update" },
            { id: "member_avatar_update", name: "Member Avatar Update" },
            { id: "user_update", name: "User Update" },
        ]
    },
    {
        id: "voice", name: "Voice", icon: "🎙️",
        types: [
            { id: "voice_state_update", name: "Voice State Update" },
            { id: "voice_channel_join", name: "Voice Channel Join" },
            { id: "voice_channel_leave", name: "Voice Channel Leave" },
            { id: "voice_channel_move", name: "Voice Channel Move" },
            { id: "voice_mute", name: "Voice Mute" },
            { id: "voice_deafen", name: "Voice Deafen" },
            { id: "voice_stream", name: "Voice Stream" },
        ]
    },
    {
        id: "webhooks", name: "Webhooks", icon: "🔌",
        types: [
            { id: "webhook_create", name: "Webhook Create" },
            { id: "webhook_update", name: "Webhook Update" },
            { id: "webhook_delete", name: "Webhook Delete" },
        ]
    },
    {
        id: "moderation", name: "Moderation", icon: "🛡️",
        types: [
            { id: "mod_ban", name: "Ban" },
            { id: "mod_unban", name: "Unban" },
            { id: "mod_kick", name: "Kick" },
            { id: "mod_timeout", name: "Timeout" },
            { id: "mod_timeout_remove", name: "Timeout Remove" },
            { id: "mod_warn", name: "Warn" },
            { id: "mod_mute", name: "Mute" },
            { id: "mod_unmute", name: "Unmute" },
        ]
    },
];

const defaultSettings: LoggingSettings = {
    guild_id: "",
    use_webhooks: true,
    ignore_embeds: false,
    ignore_voice_users: false,
    log_deleted_polls: true,
    log_sticky_messages: true,
    ignored_channels: [],
    ignored_roles: [],
    ignored_users: [],
    category_channels: {},
    type_channels: {},
};

export default function LoggingSettings({ guildId }: LoggingSettingsProps) {
    const [settings, setSettings] = useState<LoggingSettings>({ ...defaultSettings, guild_id: guildId });
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"types" | "settings">("types");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    useEffect(() => {
        Promise.all([
            fetch(`/api/logging?guild_id=${guildId}`).then(r => r.json()),
            fetch(`/api/logging?action=channels&guild_id=${guildId}`).then(r => r.json()),
            fetch(`/api/logging?action=roles&guild_id=${guildId}`).then(r => r.json()),
            fetch(`/api/logging?action=members&guild_id=${guildId}`).then(r => r.json()),
        ]).then(([data, chans, rols, mems]) => {
            if (data && !data.error) {
                setSettings({ ...defaultSettings, ...data, guild_id: guildId });
            }
            if (Array.isArray(chans)) setChannels(chans);
            if (Array.isArray(rols)) setRoles(rols);
            if (Array.isArray(mems)) setMembers(mems);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [guildId]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/logging', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            setMessage(res.ok ? { type: "success", text: "Settings saved! ✅" } : { type: "error", text: data.error || "Failed" });
        } catch {
            setMessage({ type: "error", text: "Network error" });
        }
        setSaving(false);
    };

    const setCategoryChannel = (categoryId: string, channelId: string | null) => {
        setSettings(prev => {
            const newChannels = { ...prev.category_channels };
            if (channelId) {
                newChannels[categoryId] = channelId;
            } else {
                delete newChannels[categoryId];
            }
            return { ...prev, category_channels: newChannels };
        });
    };

    const setTypeChannel = (typeId: string, channelId: string | null) => {
        setSettings(prev => {
            const newChannels = { ...prev.type_channels };
            if (channelId) {
                newChannels[typeId] = channelId;
            } else {
                delete newChannels[typeId];
            }
            return { ...prev, type_channels: newChannels };
        });
    };

    const setAllChannels = (channelId: string | null) => {
        setSettings(prev => {
            const newChannels: Record<string, string> = {};
            if (channelId) {
                LOG_CATEGORIES.forEach(cat => { newChannels[cat.id] = channelId; });
            }
            return { ...prev, category_channels: newChannels };
        });
    };

    const toggleIgnored = (type: "channels" | "roles" | "users", id: string) => {
        const key = `ignored_${type}` as keyof LoggingSettings;
        setSettings(prev => {
            const list = prev[key] as string[];
            return {
                ...prev,
                [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id]
            };
        });
    };

    const getEffectiveChannel = (categoryId: string, typeId: string) => {
        return settings.type_channels[typeId] || settings.category_channels[categoryId] || null;
    };

    const filteredCategories = LOG_CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.types.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return <CatLoader message="Loading logging settings..." />;
    }

    return (
        <>
            {message && (
                <div className={`mb-6 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                    {message.text}
                </div>
            )}

            {/* Header */}
            <div className="glass-card rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">📝</div>
                    <div>
                        <h2 className="text-xl font-black text-white">Logging</h2>
                        <p className="text-gray-400 text-sm">Log all actions happening in this server. Click on a category to see all its log types.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("types")}
                        className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === "types" ? "bg-amber-500 text-black" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
                    >
                        📁 Types
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`px-6 py-2 rounded-xl font-bold transition ${activeTab === "settings" ? "bg-amber-500 text-black" : "bg-white/5 text-gray-300 hover:bg-white/10"}`}
                    >
                        ⚙️ Settings
                    </button>
                </div>
            </div>

            {activeTab === "types" && (
                <div className="space-y-4">
                    {/* Search and Actions */}
                    <div className="glass-card rounded-2xl p-5 relative z-10">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Search for types..."
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none mb-4 text-white"
                        />
                        <div className="flex flex-wrap gap-3">
                            <div className="flex-1 min-w-[200px]">
                                <CustomDropdown
                                    value=""
                                    onChange={(val) => { if (val) setAllChannels(val); }}
                                    options={[
                                        { value: '', label: '📢 Set channel for all types' },
                                        ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                    ]}
                                    placeholder="📢 Set channel for all types"
                                    className="w-full"
                                />
                            </div>
                            <button
                                onClick={() => setAllChannels(null)}
                                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition border border-red-500/30"
                            >
                                🗑️ Remove channel for all types
                            </button>
                            <button
                                onClick={() => setExpandedCategories(expandedCategories.length === LOG_CATEGORIES.length ? [] : LOG_CATEGORIES.map(c => c.id))}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold transition border border-white/10"
                            >
                                {expandedCategories.length === LOG_CATEGORIES.length ? "🔼 Collapse All" : "🔽 Expand All"}
                            </button>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-3">
                        {filteredCategories.map(cat => {
                            const categoryChannelId = settings.category_channels[cat.id];
                            const categoryChannel = channels.find(c => c.id === categoryChannelId);
                            const isExpanded = expandedCategories.includes(cat.id);

                            return (
                                <div key={cat.id} className="glass-card rounded-2xl border border-white/10 relative overflow-visible">
                                    {/* Category Header */}
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-t-2xl relative z-20 overflow-visible">
                                        <button
                                            onClick={() => setExpandedCategories(prev =>
                                                isExpanded ? prev.filter(x => x !== cat.id) : [...prev, cat.id]
                                            )}
                                            className="flex items-center gap-3 text-left flex-1"
                                        >
                                            <span className="text-2xl">{cat.icon}</span>
                                            <span className="font-black text-white text-lg">{cat.name}</span>
                                            <span className="text-gray-500 text-sm">({cat.types.length} types)</span>
                                            <span className="text-stone-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {categoryChannel && (
                                                <button
                                                    onClick={() => setCategoryChannel(cat.id, null)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                                                >×</button>
                                            )}
                                            {categoryChannel ? (
                                                <span className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-bold">
                                                    # {categoryChannel.name}
                                                </span>
                                            ) : (
                                                <CustomDropdown
                                                    value=""
                                                    onChange={(val) => setCategoryChannel(cat.id, val)}
                                                    options={[
                                                        { value: '', label: 'Set category channel' },
                                                        ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                                    ]}
                                                    placeholder="Set category channel"
                                                    className="min-w-[180px]"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Types */}
                                    {isExpanded && (
                                        <div className="border-t border-white/10 overflow-visible">
                                            {cat.types.map(type => {
                                                const typeChannelId = settings.type_channels[type.id];
                                                const effectiveChannelId = typeChannelId || categoryChannelId;
                                                const effectiveChannel = channels.find(c => c.id === effectiveChannelId);
                                                const isOverridden = !!typeChannelId;

                                                return (
                                                    <div key={type.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition relative z-10 overflow-visible">
                                                        <div className="flex items-center gap-3 pl-8">
                                                            <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                                            <span className="text-gray-300 font-medium">{type.name}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {effectiveChannel && (
                                                                <button
                                                                    onClick={() => setTypeChannel(type.id, null)}
                                                                    className={`w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition ${!isOverridden && 'invisible'}`}
                                                                >×</button>
                                                            )}
                                                            {effectiveChannel ? (
                                                                <span className={`px-4 py-1.5 rounded-lg text-sm font-bold ${isOverridden ? 'bg-indigo-500 text-white' : 'bg-indigo-400/80 text-white'}`}>
                                                                    # {effectiveChannel.name}
                                                                </span>
                                                            ) : (
                                                                <CustomDropdown
                                                                    value=""
                                                                    onChange={(val) => setTypeChannel(type.id, val)}
                                                                    options={[
                                                                        { value: '', label: 'Set channel' },
                                                                        ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                                                    ]}
                                                                    placeholder="Set channel"
                                                                    className="min-w-[150px]"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === "settings" && (
                <div className="space-y-4">
                    {/* Toggle Settings */}
                    {[
                        { key: "use_webhooks", title: "Use webhooks", desc: "If enabled, creates a webhook per channel to send log messages", default: true },
                        { key: "ignore_embeds", title: "Ignore embeds", desc: "If enabled, messages including embeds are ignored from Logging", default: false },
                        { key: "ignore_voice_users", title: "Apply ignore to users in voice", desc: "If enabled, voice log messages are not sent when the user is ignored", default: false },
                        { key: "log_deleted_polls", title: "Log deleted polls with Message Delete", desc: "Poll deletions are logged by two types: Poll Delete and Message Delete", default: true },
                        { key: "log_sticky_messages", title: "Log deleted sticky messages", desc: "Templates can be sticky messages. Disable to skip logging them", default: true },
                    ].map(setting => (
                        <div key={setting.key} className="glass-card rounded-2xl p-5 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-white">{setting.title}</div>
                                <div className="text-gray-400 text-sm">{setting.desc}</div>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof LoggingSettings] }))}
                                className={`relative w-14 h-7 rounded-full transition-colors ${settings[setting.key as keyof LoggingSettings] ? 'bg-emerald-500' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${settings[setting.key as keyof LoggingSettings] ? 'translate-x-7' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    ))}

                    {/* Ignore Channels */}
                    <div className="glass-card rounded-2xl p-5 relative z-30 overflow-visible">
                        <div className="font-bold text-white mb-1">Ignore channels</div>
                        <div className="text-gray-400 text-sm mb-3">All actions involving these channels are ignored from Logging</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {settings.ignored_channels.length === 0 && (
                                <span className="text-gray-500 text-sm">+ No channels added</span>
                            )}
                            {settings.ignored_channels.map(id => {
                                const ch = channels.find(c => c.id === id);
                                return ch ? (
                                    <span key={id} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold flex items-center gap-2 border border-amber-500/30">
                                        #{ch.name}
                                        <button onClick={() => toggleIgnored("channels", id)} className="hover:text-red-500 font-bold">×</button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <CustomDropdown
                            value=""
                            onChange={(val) => { if (val) toggleIgnored("channels", val); }}
                            options={[
                                { value: '', label: '+ Add channel to ignore' },
                                ...channels.filter(c => !settings.ignored_channels.includes(c.id)).map(c => ({ value: c.id, label: `#${c.name}` }))
                            ]}
                            placeholder="+ Add channel to ignore"
                            className="w-full"
                        />
                    </div>

                    {/* Ignore Roles */}
                    <div className="glass-card rounded-2xl p-5 relative z-20 overflow-visible">
                        <div className="font-bold text-white mb-1">Ignore roles</div>
                        <div className="text-gray-400 text-sm mb-3">All actions from users with these roles are ignored from Logging</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {settings.ignored_roles.length === 0 && (
                                <span className="text-gray-500 text-sm">+ No roles added</span>
                            )}
                            {settings.ignored_roles.map(id => {
                                const role = roles.find(r => r.id === id);
                                return role ? (
                                    <span key={id} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-full text-sm font-bold flex items-center gap-2 border border-purple-500/30">
                                        {role.name}
                                        <button onClick={() => toggleIgnored("roles", id)} className="hover:text-red-500 font-bold">×</button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <CustomDropdown
                            value=""
                            onChange={(val) => { if (val) toggleIgnored("roles", val); }}
                            options={[
                                { value: '', label: '+ Add role to ignore' },
                                ...roles.filter(r => !settings.ignored_roles.includes(r.id)).map(r => ({ value: r.id, label: r.name }))
                            ]}
                            placeholder="+ Add role to ignore"
                            className="w-full"
                        />
                    </div>

                    {/* Ignore Users */}
                    <div className="glass-card rounded-2xl p-5 relative z-10 overflow-visible">
                        <div className="font-bold text-white mb-1">Ignore users</div>
                        <div className="text-gray-400 text-sm mb-3">All actions from these users are ignored from Logging</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {settings.ignored_users.length === 0 && (
                                <span className="text-gray-500 text-sm">+ No users added</span>
                            )}
                            {settings.ignored_users.map(id => {
                                const user = members.find(m => m.id === id);
                                return user ? (
                                    <span key={id} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold flex items-center gap-2 border border-blue-500/30">
                                        {user.display_name}
                                        <button onClick={() => toggleIgnored("users", id)} className="hover:text-red-500 font-bold">×</button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <CustomDropdown
                            value=""
                            onChange={(val) => { if (val) toggleIgnored("users", val); }}
                            options={[
                                { value: '', label: '+ Add user to ignore' },
                                ...members.filter(m => !settings.ignored_users.includes(m.id)).map(m => ({ value: m.id, label: `${m.display_name} (@${m.username})` }))
                            ]}
                            placeholder="+ Add user to ignore"
                            className="w-full"
                        />
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end mt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg transition disabled:opacity-50"
                >
                    {saving ? "..." : "💾 Save All Settings"}
                </button>
            </div>
        </>
    );
}
