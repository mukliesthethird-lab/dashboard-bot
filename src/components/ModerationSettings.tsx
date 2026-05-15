"use client";

import Loading from "@/components/Loading";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import CustomDropdown from "./CustomDropdown";
import { logActivity } from "@/lib/logger";
import ToastContainer, { useToast } from "./Toast";

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
    const [roleSearch, setRoleSearch] = useState('');
    const { toast, success, error: showError, hideToast } = useToast();

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

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

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
                setOriginalSettings(settings);
                success('Settings saved!');
                await logActivity(guildId, "Moderation settings updated", "General moderation config changed.");
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data.error || 'Failed to save settings');
            }
        } catch (err) {
            console.error('Failed to save settings:', err);
            showError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const resetSettings = () => {
        if (originalSettings) setSettings(originalSettings);
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

    const hasChanges = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings);
    }, [settings, originalSettings]);

    const menuItems = [
        {
            icon: "⚖️",
            title: "Appeals",
            desc: "Create custom forms for users to appeal their punishments.",
            isNew: true,
            isToggle: true,
            checked: settings.appeals_enabled,
            onToggle: () => updateSettings({ appeals_enabled: !settings.appeals_enabled })
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
            badge: settings.locked_channels.length > 0 ? `${settings.locked_channels.length} locked` : undefined,
            comingSoon: true
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

    if (loading) return <Loading message="Loading moderation settings..." />;

    return (
        <div className="space-y-8 animate-fade-in pb-20 relative">
            <ToastContainer toast={toast} onClose={hideToast} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-[8px] p-6 flex flex-col justify-between hover:bg-[var(--bg-hover)] transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center text-xl">📂</div>
                            <h2 className="text-xl font-bold text-gray-100">Cases</h2>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-6">Manage all ban, kick, mute and warn cases.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/cases`}>
                        <button className="self-start px-5 py-2.5 bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium rounded-[3px] transition flex items-center gap-2">View cases</button>
                    </Link>
                </div>

                <div className="glass-card rounded-[8px] p-6 flex flex-col justify-between hover:bg-[var(--bg-hover)] transition group">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-[#da373c]/20 text-[#da373c] flex items-center justify-center text-xl">🚩</div>
                            <h2 className="text-xl font-bold text-gray-100">User reports</h2>
                        </div>
                        <p className="text-[var(--text-secondary)] mb-6">Manage incoming reports from your community.</p>
                    </div>
                    <Link href={`/dashboard/${guildId}/moderation/reports`}>
                        <button className="self-start px-5 py-2.5 bg-[var(--bg-hover)] hover:bg-white/20 text-white font-medium rounded-[3px] transition flex items-center gap-2">View reports</button>
                    </Link>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-100 mb-4">⚙️ Configuration</h2>
                <div className="flex flex-col gap-4">
                    {menuItems.map((item, index) => (
                        <div
                            key={index}
                            onClick={item.isToggle || item.comingSoon ? undefined : item.onClick}
                            className={`glass-card rounded-[8px] p-5 hover:bg-[#35373c] transition-all flex items-center gap-5 group ${!item.isToggle && !item.comingSoon && item.onClick ? 'cursor-pointer' : ''} ${item.comingSoon ? 'opacity-60' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] group-hover:text-white flex items-center justify-center text-2xl transition-colors">{item.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-white transition-colors">{item.title}</h3>
                                    {item.isNew && <span className="px-2 py-0.5 bg-[#da373c] text-white text-[10px] font-black uppercase tracking-wider rounded-[3px]">New</span>}
                                    {item.comingSoon && <span className="px-2 py-0.5 bg-[#80848e]/30 text-[#87898c] text-[10px] font-black uppercase tracking-wider rounded-[3px]">Coming Soon</span>}
                                    {item.badge && <span className="px-2 py-0.5 bg-[#5865F2]/20 text-[#5865F2] text-xs font-bold rounded-[3px]">{item.badge}</span>}
                                </div>
                                <p className="text-[var(--text-secondary)] font-medium text-sm">{item.desc}</p>
                            </div>
                            <div>
                                {item.isToggle ? (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); if (item.onToggle) item.onToggle(); }}
                                        className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.checked ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.checked ? "translate-x-[16px]" : "translate-x-0"}`} />
                                    </div>
                                ) : item.action ? (
                                    <div>{item.action}</div>
                                ) : (
                                    <div className="w-10 h-10 rounded-[3px] bg-[var(--bg-hover)] text-[var(--text-secondary)] group-hover:bg-[#5865F2] group-hover:text-white flex items-center justify-center transition-colors">
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

            {showImmuneRolesModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fade-in" onClick={() => setShowImmuneRolesModal(false)}>
                    <div className="bg-[var(--bg-primary)] rounded-[12px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                            <button onClick={() => setShowImmuneRolesModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center text-lg">🛡️</div>
                                <h2 className="text-xl font-bold text-gray-100">Immune Roles</h2>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">Roles selected here will be ignored by all automod filters.</p>

                            {/* Search Bar */}
                            <div className="mt-4 relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search roles..."
                                    value={roleSearch}
                                    onChange={e => setRoleSearch(e.target.value)}
                                    className="w-full bg-[var(--bg-tertiary)] border-none rounded-[4px] py-2 pl-10 pr-10 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[#5865F2] placeholder-[#87898c] transition-all"
                                />
                                {roleSearch && (
                                    <button
                                        onClick={() => setRoleSearch('')}
                                        className="absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)] hover:text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Role List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
                            {roles
                                .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                                .map(role => (
                                    <label
                                        key={role.id}
                                        className={`flex items-center gap-3 p-2.5 rounded-[6px] cursor-pointer transition-all hover:bg-[var(--bg-hover)] group ${settings.immune_roles.includes(role.id) ? 'bg-[#5865F2]/5' : ''}`}
                                    >
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={settings.immune_roles.includes(role.id)}
                                                onChange={() => toggleImmuneRole(role.id)}
                                                className="w-5 h-5 rounded-[4px] border-2 border-[var(--border)] bg-transparent text-[#5865F2] focus:ring-0 focus:ring-offset-0 transition-all checked:border-[#5865F2] cursor-pointer"
                                            />
                                        </div>
                                        <div
                                            className="w-3.5 h-3.5 rounded-full shadow-sm ring-1 ring-white/10"
                                            style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }}
                                        />
                                        <span className={`font-medium transition-colors ${settings.immune_roles.includes(role.id) ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                                            {role.name}
                                        </span>
                                    </label>
                                ))}
                            {roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 && (
                                <div className="py-10 text-center text-[var(--text-secondary)]">
                                    <div className="text-3xl mb-2">🔍</div>
                                    <p className="text-sm font-medium">No roles found matching "{roleSearch}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-[var(--bg-secondary)]/30 border-t border-[var(--border)] flex justify-between items-center">
                            <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                                {settings.immune_roles.length} Roles Selected
                            </span>
                            <button
                                onClick={() => setShowImmuneRolesModal(false)}
                                className="px-5 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-[4px] shadow-lg shadow-[#5865F2]/10 transition-all active:scale-95 text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {showReasonsModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fade-in" onClick={() => setShowReasonsModal(false)}>
                    <div className="bg-[var(--bg-primary)] rounded-[12px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50">
                            <button onClick={() => setShowReasonsModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white transition-colors p-2">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center text-lg">📋</div>
                                <h2 className="text-xl font-bold text-gray-100">Predefined Reasons</h2>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">Create aliases for frequently used punishment reasons.</p>

                            {/* Add New Reason Form */}
                            <div className="mt-6 flex items-end gap-3 w-full">
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Alias</label>
                                    <input
                                        type="text"
                                        placeholder="spam"
                                        value={newReasonKey}
                                        onChange={e => setNewReasonKey(e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[4px] py-2 px-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[#5865F2] placeholder-[#87898c] transition-all"
                                    />
                                </div>
                                <div className="flex-[2] flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Full Reason</label>
                                    <input
                                        type="text"
                                        placeholder="Massive spamming..."
                                        value={newReasonValue}
                                        onChange={e => setNewReasonValue(e.target.value)}
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-[4px] py-2 px-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-[#5865F2] placeholder-[#87898c] transition-all"
                                    />
                                </div>
                                <button
                                    onClick={addPredefinedReason}
                                    className="shrink-0 px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-[4px] transition-all active:scale-95 text-sm shadow-lg shadow-[#5865F2]/10 mb-[1px]"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Reasons List */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-2">
                            {Object.entries(settings.predefined_reasons).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-3 p-3 rounded-[6px] border border-[var(--border)] bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-hover)] transition-all group">
                                    <div className="px-2 py-1 bg-[var(--bg-tertiary)] text-[#5865F2] font-mono text-xs font-bold rounded-[3px] border border-[#5865F2]/20">
                                        {key}
                                    </div>
                                    <div className="flex-1 min-w-0 px-2">
                                        <p className="text-sm text-[var(--text-primary)] truncate font-medium">{value}</p>
                                    </div>
                                    <button
                                        onClick={() => removePredefinedReason(key)}
                                        className="p-2 text-[#da373c] hover:bg-[#da373c]/10 rounded-[4px] transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Alias"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {Object.keys(settings.predefined_reasons).length === 0 && (
                                <div className="py-12 text-center text-[var(--text-secondary)]">
                                    <div className="text-4xl mb-3 opacity-20">📋</div>
                                    <p className="text-sm font-medium">No aliases created yet.</p>
                                    <p className="text-xs opacity-60">Add one using the form above.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 bg-[var(--bg-secondary)]/30 border-t border-[var(--border)] flex justify-end">
                            <button
                                onClick={() => setShowReasonsModal(false)}
                                className="px-8 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-[4px] transition-all active:scale-95 text-sm shadow-lg shadow-[#5865F2]/10"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {showPrivacyModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fade-in" onClick={() => setShowPrivacyModal(false)}>
                    <div className="bg-[var(--bg-primary)] rounded-[8px] p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">👁️ Privacy Settings</h2>
                        <div className="space-y-2">
                            {['privacy_show_moderator', 'privacy_show_reason', 'privacy_show_duration'].map(key => (
                                <label key={key} className="flex items-center justify-between p-3 glass-card rounded-[4px] cursor-pointer">
                                    <span className="font-medium text-[var(--text-primary)] text-sm">{key.replace(/_/g, ' ').replace('privacy show ', '')}</span>
                                    <div onClick={() => updateSettings({ [key]: !settings[key as keyof Settings] })} className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings[key as keyof Settings] ? "bg-[#23a559]" : "bg-[#80848e]"}`}>
                                        <span className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition duration-200 ${settings[key as keyof Settings] ? "translate-x-[16px]" : "translate-x-0"}`} />
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                            <button onClick={() => setShowPrivacyModal(false)} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition">Done</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {showPunishModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] animate-fade-in" onClick={() => setShowPunishModal(false)}>
                    <div className="bg-[var(--bg-primary)] rounded-[8px] p-6 w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowPunishModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-100 mb-2">🔨 Punish Settings</h2>
                        <div className="space-y-4">
                            {['mute', 'ban'].map(type => (
                                <div key={type}>
                                    <label className="block text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Default {type} Duration</label>
                                    <select
                                        value={(settings as any)[`default_${type}_duration`]}
                                        onChange={e => updateSettings({ [`default_${type}_duration`]: e.target.value })}
                                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2] cursor-pointer"
                                    >
                                        {type === 'mute' ? (
                                            ['10 minutes', '30 minutes', '1 hour', '6 hours', '12 hours', '1 day', '7 days', 'Permanent'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                                        ) : (
                                            ['1 day', '7 days', '30 days', 'Permanent'].map(opt => <option key={opt} value={opt}>{opt}</option>)
                                        )}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
                            <button onClick={() => setShowPunishModal(false)} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[3px] transition">Done</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Unsaved Changes Bar */}
            {hasChanges && (
                <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-[9999] bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border border-[var(--border)] pl-4 pr-3 py-3 rounded-[8px] shadow-2xl animate-fade-in-up flex items-center gap-6 min-w-[400px]">
                    <span className="text-white font-medium text-sm flex-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-2">
                        <button onClick={resetSettings} className="px-3 py-1.5 text-white hover:underline font-medium text-sm transition-colors">Reset</button>
                        <button onClick={persistSettings} disabled={saving} className="px-4 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-medium text-sm rounded-[3px] transition-colors flex items-center gap-2">
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
