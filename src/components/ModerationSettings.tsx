"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ModerationSettingsProps {
    guildId: string;
}

interface Settings {
    user_notifications: boolean;
    purge_pinned: boolean;
    appeals_enabled: boolean;
    immune_roles: string[];
    predefined_reasons: Record<string, string>;
    locked_channels: string[];
    privacy_show_moderator: boolean;
    privacy_show_reason: boolean;
    privacy_show_duration: boolean;
    appeals_channel_id: string | null;
    default_mute_duration: string;
    default_ban_duration: string;
}

interface Role {
    id: string;
    name: string;
    color: number;
    position: number;
}

export default function ModerationSettings({ guildId }: ModerationSettingsProps) {
    const [settings, setSettings] = useState<Settings>({
        user_notifications: true,
        purge_pinned: true,
        appeals_enabled: false,
        immune_roles: [],
        predefined_reasons: {},
        locked_channels: [],
        privacy_show_moderator: true,
        privacy_show_reason: true,
        privacy_show_duration: true,
        appeals_channel_id: null,
        default_mute_duration: '1 hour',
        default_ban_duration: 'Permanent'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [showImmuneRolesModal, setShowImmuneRolesModal] = useState(false);
    const [showReasonsModal, setShowReasonsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showPunishModal, setShowPunishModal] = useState(false);
    const [newReasonKey, setNewReasonKey] = useState('');
    const [newReasonValue, setNewReasonValue] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchRoles();
    }, [guildId]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`/api/moderation?action=settings&guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch(`/api/moderation?action=roles&guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setRoles(data);
            }
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        }
    };

    const saveSettings = async (newSettings: Partial<Settings>) => {
        setSaving(true);
        try {
            const updatedSettings = { ...settings, ...newSettings };
            const res = await fetch('/api/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'settings',
                    guild_id: guildId,
                    ...updatedSettings
                })
            });
            if (res.ok) {
                setSettings(updatedSettings);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const toggleImmuneRole = (roleId: string) => {
        const newRoles = settings.immune_roles.includes(roleId)
            ? settings.immune_roles.filter(id => id !== roleId)
            : [...settings.immune_roles, roleId];
        saveSettings({ immune_roles: newRoles });
    };

    const addPredefinedReason = () => {
        if (newReasonKey && newReasonValue) {
            const newReasons = { ...settings.predefined_reasons, [newReasonKey]: newReasonValue };
            saveSettings({ predefined_reasons: newReasons });
            setNewReasonKey('');
            setNewReasonValue('');
        }
    };

    const removePredefinedReason = (key: string) => {
        const newReasons = { ...settings.predefined_reasons };
        delete newReasons[key];
        saveSettings({ predefined_reasons: newReasons });
    };

    const menuItems = [
        {
            icon: "⚖️",
            title: "Appeals",
            desc: "Create custom forms for users to appeal their punishments.",
            isNew: true,
            onClick: () => saveSettings({ appeals_enabled: !settings.appeals_enabled }),
            isToggle: true,
            checked: settings.appeals_enabled
        },
        {
            icon: "🔨",
            title: "Punish settings",
            desc: "Edit ban, kick, mute and warn actions, default values and more.",
            onClick: () => setShowPunishModal(true)
        },
        {
            icon: "🛡️",
            title: "Immune roles",
            desc: "Set roles that are immune to moderation actions.",
            onClick: () => setShowImmuneRolesModal(true),
            badge: settings.immune_roles.length > 0 ? `${settings.immune_roles.length} roles` : undefined
        },
        {
            icon: "🔔",
            title: "User notifications",
            desc: "Toggle direct messages on punishments.",
            isToggle: true,
            checked: settings.user_notifications,
            onToggle: () => saveSettings({ user_notifications: !settings.user_notifications })
        },
        {
            icon: "📋",
            title: "Predefined reasons",
            desc: "Define reason aliases for punishments.",
            onClick: () => setShowReasonsModal(true),
            badge: Object.keys(settings.predefined_reasons).length > 0
                ? `${Object.keys(settings.predefined_reasons).length} reasons`
                : undefined
        },
        {
            icon: "🔒",
            title: "Channel locking",
            desc: "Lock channels to prevent users from sending messages or joining voice channels.",
            badge: settings.locked_channels.length > 0 ? `${settings.locked_channels.length} locked` : undefined
        },
        {
            icon: "👁️",
            title: "Privacy",
            desc: "Decide what case information is shown to users.",
            onClick: () => setShowPrivacyModal(true)
        },
        {
            icon: "📌",
            title: "Purge pinned messages",
            desc: "Keep pinned messages when purging channel history.",
            isToggle: true,
            checked: settings.purge_pinned,
            onToggle: () => saveSettings({ purge_pinned: !settings.purge_pinned })
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white mb-2">Moderation System</h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Manage automated moderation, cases, and punishments to keep your server safe.
                    </p>
                    {saving && (
                        <div className="absolute top-0 right-0 flex items-center gap-2 text-amber-400 text-sm font-bold">
                            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </div>
                    )}
                </div>
            </div>

            {/* Top Cards: Cases & Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cases Card */}
                <div className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.02] transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                                📂
                            </div>
                            <h2 className="text-xl font-bold text-white">Cases</h2>
                        </div>
                        <p className="text-gray-400 mb-6">Manage all ban, kick, mute and warn cases.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/cases`}>
                        <button className="self-start px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-md transition flex items-center gap-2">
                            View cases
                        </button>
                    </Link>
                </div>

                {/* User Reports Card */}
                <div className="glass-card rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.02] transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-xl">
                                🚩
                            </div>
                            <h2 className="text-xl font-bold text-white">User reports</h2>
                        </div>
                        <p className="text-gray-400 mb-6">Manage incoming reports from your community.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/reports`}>
                        <button className="self-start px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-md transition flex items-center gap-2">
                            View reports
                        </button>
                    </Link>
                </div>
            </div>

            {/* Menu List */}
            <div className="flex flex-col gap-4">
                {menuItems.map((item, index) => (
                    <div
                        key={index}
                        onClick={item.isToggle ? undefined : item.onClick}
                        className={`glass-card rounded-2xl p-5 hover:bg-white/10 transition-all flex items-center gap-5 group ${!item.isToggle && item.onClick ? 'cursor-pointer' : ''}`}
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-amber-500/20 text-gray-400 group-hover:text-amber-400 flex items-center justify-center text-2xl transition-colors">
                            {item.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                                    {item.title}
                                </h3>
                                {item.isNew && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md">
                                        New
                                    </span>
                                )}
                                {item.badge && (
                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-md">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 font-medium text-sm">{item.desc}</p>
                        </div>

                        {/* Action / Arrow */}
                        <div>
                            {item.isToggle ? (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.onToggle) item.onToggle();
                                        else if (item.onClick) item.onClick();
                                    }}
                                    className={`w-14 h-8 rounded-full relative transition-colors duration-300 cursor-pointer ${item.checked ? 'bg-emerald-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.checked ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-amber-500 group-hover:text-black text-gray-500 flex items-center justify-center transition-all">
                                    <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Immune Roles Modal */}
            {showImmuneRolesModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowImmuneRolesModal(false)}>
                    <div className="bg-[#16161f] rounded-3xl p-8 w-full max-w-md max-h-[80vh] overflow-y-auto border border-white/10" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-white mb-4">🛡️ Immune Roles</h2>
                        <p className="text-gray-400 mb-6">Select roles that are immune to moderation actions.</p>
                        <div className="space-y-2">
                            {roles.map(role => (
                                <label key={role.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.immune_roles.includes(role.id)}
                                        onChange={() => toggleImmuneRole(role.id)}
                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500"
                                    />
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                                    />
                                    <span className="font-bold text-gray-200">{role.name}</span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowImmuneRolesModal(false)}
                            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Predefined Reasons Modal */}
            {showReasonsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReasonsModal(false)}>
                    <div className="bg-[#16161f] rounded-3xl p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto border border-white/10" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-white mb-4">📋 Predefined Reasons</h2>
                        <p className="text-gray-400 mb-6">Create shortcuts for common punishment reasons.</p>

                        {/* Add new reason */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Alias (e.g., spam)"
                                value={newReasonKey}
                                onChange={e => setNewReasonKey(e.target.value)}
                                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 text-white"
                            />
                            <input
                                type="text"
                                placeholder="Full reason"
                                value={newReasonValue}
                                onChange={e => setNewReasonValue(e.target.value)}
                                className="flex-[2] px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 text-white"
                            />
                            <button
                                onClick={addPredefinedReason}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition"
                            >
                                Add
                            </button>
                        </div>

                        {/* List existing reasons */}
                        <div className="space-y-2">
                            {Object.entries(settings.predefined_reasons).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 font-mono text-sm rounded">{key}</span>
                                    <span className="flex-1 text-gray-300 truncate">{value}</span>
                                    <button
                                        onClick={() => removePredefinedReason(key)}
                                        className="p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {Object.keys(settings.predefined_reasons).length === 0 && (
                                <p className="text-gray-500 text-center py-4">No predefined reasons yet.</p>
                            )}
                        </div>

                        <button
                            onClick={() => setShowReasonsModal(false)}
                            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPrivacyModal(false)}>
                    <div className="bg-[#16161f] rounded-3xl p-8 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-white mb-4">👁️ Privacy Settings</h2>
                        <p className="text-gray-400 mb-6">Choose what information to show users about their cases.</p>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer">
                                <span className="font-bold text-gray-200">Show moderator name</span>
                                <div
                                    onClick={() => saveSettings({ privacy_show_moderator: !settings.privacy_show_moderator })}
                                    className={`w-12 h-7 rounded-full relative transition-colors duration-300 cursor-pointer ${settings.privacy_show_moderator ? 'bg-emerald-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.privacy_show_moderator ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer">
                                <span className="font-bold text-gray-200">Show punishment reason</span>
                                <div
                                    onClick={() => saveSettings({ privacy_show_reason: !settings.privacy_show_reason })}
                                    className={`w-12 h-7 rounded-full relative transition-colors duration-300 cursor-pointer ${settings.privacy_show_reason ? 'bg-emerald-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.privacy_show_reason ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer">
                                <span className="font-bold text-gray-200">Show duration</span>
                                <div
                                    onClick={() => saveSettings({ privacy_show_duration: !settings.privacy_show_duration })}
                                    className={`w-12 h-7 rounded-full relative transition-colors duration-300 cursor-pointer ${settings.privacy_show_duration ? 'bg-emerald-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.privacy_show_duration ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={() => setShowPrivacyModal(false)}
                            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Punish Settings Modal */}
            {showPunishModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPunishModal(false)}>
                    <div className="bg-[#16161f] rounded-3xl p-8 w-full max-w-md border border-white/10" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-white mb-4">🔨 Punish Settings</h2>
                        <p className="text-gray-400 mb-6">Set default values for punishments.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Default Mute Duration</label>
                                <select
                                    value={settings.default_mute_duration}
                                    onChange={e => saveSettings({ default_mute_duration: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 text-white"
                                >
                                    <option value="10 minutes">10 minutes</option>
                                    <option value="30 minutes">30 minutes</option>
                                    <option value="1 hour">1 hour</option>
                                    <option value="6 hours">6 hours</option>
                                    <option value="12 hours">12 hours</option>
                                    <option value="1 day">1 day</option>
                                    <option value="7 days">7 days</option>
                                    <option value="Permanent">Permanent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-2">Default Ban Duration</label>
                                <select
                                    value={settings.default_ban_duration}
                                    onChange={e => saveSettings({ default_ban_duration: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-amber-500/50 text-white"
                                >
                                    <option value="1 day">1 day</option>
                                    <option value="7 days">7 days</option>
                                    <option value="30 days">30 days</option>
                                    <option value="Permanent">Permanent</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowPunishModal(false)}
                            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
