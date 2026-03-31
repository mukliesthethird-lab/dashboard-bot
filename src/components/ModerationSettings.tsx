"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import CustomDropdown from "./CustomDropdown";
import CatLoader from "./CatLoader";
import { logActivity } from "@/lib/logger";

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
    report_channel_id: string | null;
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
        default_ban_duration: 'Permanent',
        report_channel_id: null
    });
    // Store original settings for comparison
    const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [channels, setChannels] = useState<{ id: string, name: string }[]>([]);
    const [showImmuneRolesModal, setShowImmuneRolesModal] = useState(false);
    const [showReportChannelModal, setShowReportChannelModal] = useState(false);
    const [showReasonsModal, setShowReasonsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showPunishModal, setShowPunishModal] = useState(false);
    const [newReasonKey, setNewReasonKey] = useState('');
    const [newReasonValue, setNewReasonValue] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchRoles();
        fetchChannels();
    }, [guildId]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`/api/moderation?action=settings&guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                setOriginalSettings(data);
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

    const fetchChannels = async () => {
        try {
            const res = await fetch(`/api/moderation?action=channels&guild_id=${guildId}`);
            if (res.ok) {
                const data = await res.json();
                setChannels(data);
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
        }
    };

    // Update local state only
    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Save to API
    const persistSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'settings',
                    guild_id: guildId,
                    ...settings
                })
            });
            if (res.ok) {
                setOriginalSettings(settings); // Update original to match current
                await logActivity(guildId, "Moderation settings updated", "General moderation config changed.");
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const resetSettings = () => {
        if (originalSettings) {
            setSettings(originalSettings);
        }
    };

    const toggleImmuneRole = (roleId: string) => {
        const newRoles = settings.immune_roles.includes(roleId)
            ? settings.immune_roles.filter(id => id !== roleId)
            : [...settings.immune_roles, roleId];
        updateSettings({ immune_roles: newRoles });
    };

    const addPredefinedReason = () => {
        if (newReasonKey && newReasonValue) {
            const newReasons = { ...settings.predefined_reasons, [newReasonKey]: newReasonValue };
            updateSettings({ predefined_reasons: newReasons });
            setNewReasonKey('');
            setNewReasonValue('');
        }
    };

    const removePredefinedReason = (key: string) => {
        const newReasons = { ...settings.predefined_reasons };
        delete newReasons[key];
        updateSettings({ predefined_reasons: newReasons });
    };

    const menuItems = [
        {
            icon: "⚖️",
            title: "Appeals",
            desc: "Create custom forms for users to appeal their punishments.",
            isNew: true,
            onClick: () => updateSettings({ appeals_enabled: !settings.appeals_enabled }),
            isToggle: true,
            checked: settings.appeals_enabled
        },
        {
            icon: "📢",
            title: "Report Channel",
            desc: "Select the channel where use reports will be sent.",
            action: (
                <div className="w-48" onClick={(e) => e.stopPropagation()}>
                    <CustomDropdown
                        value={settings.report_channel_id || ''}
                        onChange={(value) => updateSettings({ report_channel_id: value })}
                        options={channels.map(channel => ({
                            value: channel.id,
                            label: `#${channel.name}`
                        }))}
                        placeholder="No Channel"
                    />
                </div>
            )
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
            onToggle: () => updateSettings({ user_notifications: !settings.user_notifications })
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
            onToggle: () => updateSettings({ purge_pinned: !settings.purge_pinned })
        },
    ];

    if (loading) {
        return <CatLoader message="Loading moderation settings..." />;
    }

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    return (
        <div className="space-y-8 animate-fade-in pb-20 relative">
            {/* Header Removed - Moved to Page Component */}

            {/* Top Cards: Cases & Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cases Card */}
                <div className="glass-card rounded-[8px] p-6 flex flex-col justify-between hover:bg-white/5 transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center text-xl">
                                📂
                            </div>
                            <h2 className="text-xl font-bold text-gray-100">Cases</h2>
                        </div>
                        <p className="text-gray-400 mb-6">Manage all ban, kick, mute and warn cases.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/cases`}>
                        <button className="self-start px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition flex items-center gap-2">
                            View cases
                        </button>
                    </Link>
                </div>

                {/* User Reports Card */}
                <div className="glass-card rounded-[8px] p-6 flex flex-col justify-between hover:bg-white/5 transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#da373c]/20 text-[#da373c] flex items-center justify-center text-xl">
                                🚩
                            </div>
                            <h2 className="text-xl font-bold text-gray-100">User reports</h2>
                        </div>
                        <p className="text-gray-400 mb-6">Manage incoming reports from your community.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/reports`}>
                        <button className="self-start px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-[3px] transition flex items-center gap-2">
                            View reports
                        </button>
                    </Link>
                </div>
            </div>

            {/* Menu List */}
            <div>
                <h2 className="text-xl font-bold text-gray-100 mb-4">⚙️ Configuration</h2>
                <div className="flex flex-col gap-4">
                    {menuItems.map((item, index) => (
                        <div
                            key={index}
                            onClick={item.isToggle ? undefined : item.onClick}
                            className={`glass-card rounded-[8px] p-5 hover:bg-[#35373c] transition-all flex items-center gap-5 group ${!item.isToggle && item.onClick ? 'cursor-pointer' : ''}`}
                        >
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-lg bg-white/5 text-gray-400 group-hover:text-white flex items-center justify-center text-2xl transition-colors">
                                {item.icon}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-white transition-colors">
                                        {item.title}
                                    </h3>
                                    {item.isNew && (
                                        <span className="px-2 py-0.5 bg-[#da373c] text-white text-[10px] font-black uppercase tracking-wider rounded-[3px]">
                                            New
                                        </span>
                                    )}
                                    {item.badge && (
                                        <span className="px-2 py-0.5 bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold rounded-[3px]">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 font-medium text-sm">{item.desc}</p>
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
                                        className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.checked ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.checked ? "translate-x-[16px]" : "translate-x-0"}`} />
                                    </div>
                                ) : item.action ? (
                                    <div>{item.action}</div>
                                ) : (
                                    <div className="w-10 h-10 rounded-[3px] bg-white/5 text-gray-400 group-hover:bg-[#5865F2] group-hover:text-white flex items-center justify-center transition-colors">
                                        <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Immune Roles Modal */}
            {showImmuneRolesModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowImmuneRolesModal(false)}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowImmuneRolesModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">🛡️ Immune Roles</h2>
                        <p className="text-gray-400 mb-6 text-sm">Select roles that are immune to moderation actions.</p>
                        <div className="space-y-1">
                            {roles.map(role => (
                                <label key={role.id} className="flex items-center gap-3 p-2 rounded-[4px] hover:glass-card cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.immune_roles.includes(role.id)}
                                        onChange={() => toggleImmuneRole(role.id)}
                                        className="w-5 h-5 rounded-[4px] border-none bg-black/20 text-[#5865F2] focus:ring-0 cursor-pointer"
                                    />
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                                    />
                                    <span className="font-medium text-gray-200">{role.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setShowImmuneRolesModal(false)}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Predefined Reasons Modal */}
            {showReasonsModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowReasonsModal(false)}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowReasonsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">📋 Predefined Reasons</h2>
                        <p className="text-gray-400 mb-6 text-sm">Create shortcuts for common punishment reasons.</p>

                        {/* Add new reason */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Alias (e.g., spam)"
                                value={newReasonKey}
                                onChange={e => setNewReasonKey(e.target.value)}
                                className="flex-1 px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                            />
                            <input
                                type="text"
                                placeholder="Full reason"
                                value={newReasonValue}
                                onChange={e => setNewReasonValue(e.target.value)}
                                className="flex-[2] px-3 py-2 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2]"
                            />
                            <button
                                onClick={addPredefinedReason}
                                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition"
                            >
                                Add
                            </button>
                        </div>

                        {/* List existing reasons */}
                        <div className="space-y-2">
                            {Object.entries(settings.predefined_reasons).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3 p-3 glass-card rounded-[4px]">
                                    <span className="px-2 py-1 bg-black/20 text-gray-200 font-mono text-sm rounded-[3px]">{key}</span>
                                    <span className="flex-1 text-gray-400 truncate text-sm">{value}</span>
                                    <button
                                        onClick={() => removePredefinedReason(key)}
                                        className="p-1.5 text-[#da373c] hover:bg-[#da373c]/10 rounded-[3px] transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {Object.keys(settings.predefined_reasons).length === 0 && (
                                <p className="text-[#87898c] text-center py-4 text-sm">No predefined reasons yet.</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setShowReasonsModal(false)}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowPrivacyModal(false)}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">👁️ Privacy Settings</h2>
                        <p className="text-gray-400 mb-6 text-sm">Choose what information to show users about their cases.</p>

                        <div className="space-y-2">
                            <label className="flex items-center justify-between p-3 glass-card rounded-[4px] cursor-pointer">
                                <span className="font-medium text-gray-200 text-sm">Show moderator name</span>
                                <div
                                    onClick={() => updateSettings({ privacy_show_moderator: !settings.privacy_show_moderator })}
                                    className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.privacy_show_moderator ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.privacy_show_moderator ? "translate-x-[16px]" : "translate-x-0"}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-3 glass-card rounded-[4px] cursor-pointer">
                                <span className="font-medium text-gray-200 text-sm">Show punishment reason</span>
                                <div
                                    onClick={() => updateSettings({ privacy_show_reason: !settings.privacy_show_reason })}
                                    className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.privacy_show_reason ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.privacy_show_reason ? "translate-x-[16px]" : "translate-x-0"}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between p-3 glass-card rounded-[4px] cursor-pointer">
                                <span className="font-medium text-gray-200 text-sm">Show duration</span>
                                <div
                                    onClick={() => updateSettings({ privacy_show_duration: !settings.privacy_show_duration })}
                                    className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.privacy_show_duration ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                >
                                    <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.privacy_show_duration ? "translate-x-[16px]" : "translate-x-0"}`} />
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Punish Settings Modal */}
            {showPunishModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowPunishModal(false)}>
                    <div className="bg-[#0a0a0f] rounded-[8px] p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPunishModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">🔨 Punish Settings</h2>
                        <p className="text-gray-400 mb-6 text-sm">Set default values for punishments.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Default Mute Duration</label>
                                <select
                                    value={settings.default_mute_duration}
                                    onChange={e => updateSettings({ default_mute_duration: e.target.value })}
                                    className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2] cursor-pointer"
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
                                <label className="block text-[12px] font-bold text-gray-400 uppercase tracking-wide mb-2">Default Ban Duration</label>
                                <select
                                    value={settings.default_ban_duration}
                                    onChange={e => updateSettings({ default_ban_duration: e.target.value })}
                                    className="w-full px-3 py-2 bg-black/20 text-gray-200 rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2] cursor-pointer"
                                >
                                    <option value="1 day">1 day</option>
                                    <option value="7 days">7 days</option>
                                    <option value="30 days">30 days</option>
                                    <option value="Permanent">Permanent</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setShowPunishModal(false)}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved Changes Bar */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#030305]/90 backdrop-blur-3xl border border-white/10 pl-4 pr-3 py-3 rounded-[8px] shadow-2xl animate-fade-in-up flex items-center gap-6 min-w-[400px]">
                    <span className="text-white font-medium text-sm flex-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetSettings}
                            className="px-3 py-1.5 text-white hover:underline font-medium text-sm transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={persistSettings}
                            disabled={saving}
                            className="px-4 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-medium text-sm rounded-[3px] transition-colors flex items-center gap-2"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}




