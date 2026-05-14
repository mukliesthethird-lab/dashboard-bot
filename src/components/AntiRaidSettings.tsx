"use client";

import Loading from "@/components/Loading";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ToastContainer, { useToast } from "./Toast";
import CustomDropdown from "./CustomDropdown";
import { Channel } from "../types";

interface Props { guildId: string; }

interface AntiRaidConfig {
    enabled: boolean;
    mass_join_enabled: boolean;
    mass_join_threshold: number;
    mass_join_window: number;
    mass_join_action: string;
    account_age_enabled: boolean;
    min_account_age_days: number;
    account_age_action: string;
    no_avatar_enabled: boolean;
    no_avatar_action: string;
    auto_lockdown_enabled: boolean;
    lockdown_duration_minutes: number;
    verification_enabled: boolean;
    verification_role_id: string;
    dm_notification_enabled: boolean;
    dm_message: string;
    whitelist_role_ids: string[];
    log_channel_id: string;
    anti_bot_enabled: boolean;
    join_slowmode_enabled: boolean;
    join_slowmode_seconds: number;
}

/* ── Standalone sub-components ── */

const ShieldToggle = ({ label, desc, active, onToggle, color = "#da373c" }: { label: string; desc: string; active: boolean; onToggle: () => void; color?: string }) => (
    <div className={`p-3 rounded-xl border transition-all ${active ? `bg-[${color}]/5 border-[${color}]/30 shadow-inner` : 'bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-white/10'}`}
        style={active ? { background: `${color}11`, borderColor: `${color}55` } : {}}>
        <div className="flex items-center justify-between mb-1">
            <span className={`text-[13px] font-bold ${active ? 'text-white' : 'text-[var(--text-secondary)]'}`}>{label}</span>
            <button onClick={onToggle} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: active ? color : '#4e5058' }}>
                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-md transition-transform ${active ? 'left-[18px]' : 'left-[2px]'}`} />
            </button>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">{desc}</p>
    </div>
);

function RaidSlider({ label, value, min, max, unit, active, onChange, color = "#da373c" }: { label: string; value: number; min: number; max: number; unit: string; active: boolean; onChange: (v: number) => void; color?: string }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const calcValue = useCallback((clientX: number) => {
        if (!trackRef.current) return value;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(min + ratio * (max - min));
    }, [min, max, value]);
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!active || !trackRef.current) return;
        e.preventDefault(); e.stopPropagation();
        isDragging.current = true;
        trackRef.current.setPointerCapture(e.pointerId);
        onChange(calcValue(e.clientX));
    }, [active, calcValue, onChange]);
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || !active) return;
        e.preventDefault(); onChange(calcValue(e.clientX));
    }, [active, calcValue, onChange]);
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (!trackRef.current) return;
        isDragging.current = false;
        trackRef.current.releasePointerCapture(e.pointerId);
    }, []);
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className={`space-y-2 ${!active ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md border" style={{ color, background: `${color}18`, borderColor: `${color}33` }}>{value}{unit}</span>
            </div>
            <div ref={trackRef} className="relative h-6 flex items-center select-none touch-none" style={{ cursor: active ? 'pointer' : 'not-allowed' }}
                onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--bg-tertiary)] pointer-events-none" />
                <div className="absolute left-0 h-1.5 rounded-full pointer-events-none" style={{ width: `${pct}%`, background: color }} />
                <div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `calc(${pct}% - 10px)`, background: color }} />
            </div>
        </div>
    );
}

const SectionCard = ({ title, subtitle, children, accent = "#da373c" }: { title: string; subtitle?: string; children: React.ReactNode; accent?: string }) => (
    <div className="glass-card p-5 rounded-xl border border-[var(--border)] space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ background: accent }} />
            <div>
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest">{title}</h3>
                {subtitle && <p className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

export default function AntiRaidSettings({ guildId }: Props) {
    const { toast, success, error, hideToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

    const defaultSettings: AntiRaidConfig = {
        enabled: false, mass_join_enabled: true, mass_join_threshold: 5, mass_join_window: 10, mass_join_action: "kick",
        account_age_enabled: false, min_account_age_days: 7, account_age_action: "kick",
        no_avatar_enabled: false, no_avatar_action: "flag",
        auto_lockdown_enabled: false, lockdown_duration_minutes: 10,
        verification_enabled: false, verification_role_id: "",
        dm_notification_enabled: true, dm_message: "",
        whitelist_role_ids: [], log_channel_id: "",
        anti_bot_enabled: false, join_slowmode_enabled: false, join_slowmode_seconds: 30,
    };

    const [settings, setSettings] = useState<AntiRaidConfig>(defaultSettings);
    const [originalSettings, setOriginalSettings] = useState<AntiRaidConfig | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [raidRes, chanRes, rolesRes] = await Promise.all([
                    fetch(`/api/antiraid?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/roles?action=roles&guild_id=${guildId}`),
                ]);
                const data = await raidRes.json();
                const chanData = await chanRes.json();
                const rolesData = await rolesRes.json();
                if (Array.isArray(chanData)) setChannels(chanData);
                if (Array.isArray(rolesData)) setRoles(rolesData.map((r: any) => ({ id: r.id, name: r.name })));
                if (data && !data.error) {
                    let whitelist: string[] = [];
                    try { whitelist = typeof data.whitelist_role_ids === 'string' ? JSON.parse(data.whitelist_role_ids) : (data.whitelist_role_ids || []); } catch { whitelist = []; }
                    const loaded: AntiRaidConfig = {
                        enabled: !!data.enabled, mass_join_enabled: !!data.mass_join_enabled, mass_join_threshold: data.mass_join_threshold || 5,
                        mass_join_window: data.mass_join_window || 10, mass_join_action: data.mass_join_action || "kick",
                        account_age_enabled: !!data.account_age_enabled, min_account_age_days: data.min_account_age_days || 7, account_age_action: data.account_age_action || "kick",
                        no_avatar_enabled: !!data.no_avatar_enabled, no_avatar_action: data.no_avatar_action || "flag",
                        auto_lockdown_enabled: !!data.auto_lockdown_enabled, lockdown_duration_minutes: data.lockdown_duration_minutes || 10,
                        verification_enabled: !!data.verification_enabled, verification_role_id: data.verification_role_id?.toString() || "",
                        dm_notification_enabled: !!data.dm_notification_enabled, dm_message: data.dm_message || "",
                        whitelist_role_ids: whitelist, log_channel_id: data.log_channel_id?.toString() || "",
                        anti_bot_enabled: !!data.anti_bot_enabled, join_slowmode_enabled: !!data.join_slowmode_enabled, join_slowmode_seconds: data.join_slowmode_seconds || 30,
                    };
                    setSettings(loaded);
                    setOriginalSettings(JSON.parse(JSON.stringify(loaded)));
                }
            } catch (err) { console.error("Failed to fetch anti-raid settings", err); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [guildId]);

    const hasChanges = useMemo(() => {
        if (!originalSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(originalSettings);
    }, [settings, originalSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/antiraid', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guild_id: guildId, ...settings, whitelist_role_ids: JSON.stringify(settings.whitelist_role_ids) })
            });
            if (res.ok) { setOriginalSettings(JSON.parse(JSON.stringify(settings))); success("Anti-Raid configurations deployed!"); }
            else { error("Failed to save settings."); }
        } catch { error("Network error."); }
        finally { setSaving(false); }
    };

    const handleReset = () => { if (originalSettings) setSettings(JSON.parse(JSON.stringify(originalSettings))); };
    const update = (key: keyof AntiRaidConfig, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

    if (loading) return <Loading message="Initializing Raid Defense Systems..." />;

    const actionOptions = [
        { value: "kick", label: "Kick" }, { value: "ban", label: "Ban" },
        { value: "timeout", label: "Timeout (1h)" }, { value: "flag", label: "Flag Only" },
    ];

    return (
        <div className="space-y-4 max-w-7xl mx-auto animate-fade-up pb-24 px-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <div>
                    <h1 className="text-lg font-black text-white tracking-tight leading-tight uppercase">Anti-Raid Shield</h1>
                    <p className="text-[var(--text-tertiary)] text-[9px] font-bold uppercase tracking-[0.2em]">Server Perimeter Defense</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${settings.enabled ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>
                        {settings.enabled ? 'ARMED' : 'DISARMED'}
                    </span>
                    <button onClick={() => update('enabled', !settings.enabled)}
                        className={`relative w-12 h-6 rounded-full transition-all ${settings.enabled ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-[#4e5058]'}`}>
                        <div className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-transform ${settings.enabled ? 'left-[27px]' : 'left-[3px]'}`} />
                    </button>
                </div>
            </div>

            <div className={`transition-all ${!settings.enabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Left Column */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        {/* Mass Join */}
                        <SectionCard title="Mass Join Detection" subtitle="Detect coordinated join attacks" accent="#ef4444">
                            <ShieldToggle label="Mass Join Protection" desc="Detect and act on raids when many users join at once." active={settings.mass_join_enabled} onToggle={() => update('mass_join_enabled', !settings.mass_join_enabled)} color="#ef4444" />
                            <div className="grid grid-cols-2 gap-4">
                                <RaidSlider label="Join Threshold" value={settings.mass_join_threshold} min={2} max={20} unit=" users" active={settings.mass_join_enabled} onChange={(v) => update('mass_join_threshold', v)} color="#ef4444" />
                                <RaidSlider label="Time Window" value={settings.mass_join_window} min={3} max={60} unit="s" active={settings.mass_join_enabled} onChange={(v) => update('mass_join_window', v)} color="#ef4444" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Raid Action</label>
                                <CustomDropdown value={settings.mass_join_action} onChange={(v) => update('mass_join_action', v)} size="sm" options={actionOptions} />
                            </div>
                        </SectionCard>

                        {/* Account Age */}
                        <SectionCard title="Account Age Filter" subtitle="Block suspiciously new accounts" accent="#f59e0b">
                            <ShieldToggle label="Minimum Account Age" desc="Reject accounts younger than the threshold." active={settings.account_age_enabled} onToggle={() => update('account_age_enabled', !settings.account_age_enabled)} color="#f59e0b" />
                            <div className="grid grid-cols-2 gap-4">
                                <RaidSlider label="Min Age" value={settings.min_account_age_days} min={1} max={90} unit=" days" active={settings.account_age_enabled} onChange={(v) => update('min_account_age_days', v)} color="#f59e0b" />
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Action</label>
                                    <CustomDropdown value={settings.account_age_action} onChange={(v) => update('account_age_action', v)} size="sm" options={actionOptions} />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Secondary Shields */}
                        <SectionCard title="Secondary Shields" subtitle="Additional defense layers" accent="#8b5cf6">
                            <div className="grid grid-cols-2 gap-3">
                                <ShieldToggle label="No Avatar Detection" desc="Flag accounts without a profile picture." active={settings.no_avatar_enabled} onToggle={() => update('no_avatar_enabled', !settings.no_avatar_enabled)} color="#8b5cf6" />
                                <ShieldToggle label="Anti-Bot Patterns" desc="Detect suspicious bot-like usernames." active={settings.anti_bot_enabled} onToggle={() => update('anti_bot_enabled', !settings.anti_bot_enabled)} color="#8b5cf6" />
                            </div>
                            {settings.no_avatar_enabled && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">No Avatar Action</label>
                                    <CustomDropdown value={settings.no_avatar_action} onChange={(v) => update('no_avatar_action', v)} size="sm" options={actionOptions} />
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* Lockdown */}
                        <SectionCard title="Auto Lockdown" subtitle="Emergency server lock" accent="#dc2626">
                            <ShieldToggle label="Automatic Lockdown" desc="Lock all channels when a raid is detected." active={settings.auto_lockdown_enabled} onToggle={() => update('auto_lockdown_enabled', !settings.auto_lockdown_enabled)} color="#dc2626" />
                            <RaidSlider label="Lockdown Duration" value={settings.lockdown_duration_minutes} min={1} max={60} unit=" min" active={settings.auto_lockdown_enabled} onChange={(v) => update('lockdown_duration_minutes', v)} color="#dc2626" />
                        </SectionCard>

                        {/* Verification Gate */}
                        <SectionCard title="Verification Gate" subtitle="Hold new members for review" accent="#06b6d4">
                            <ShieldToggle label="Verification Required" desc="Assign a verification role to new joins." active={settings.verification_enabled} onToggle={() => update('verification_enabled', !settings.verification_enabled)} color="#06b6d4" />
                            {settings.verification_enabled && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Verification Role</label>
                                    <CustomDropdown value={settings.verification_role_id} onChange={(v) => update('verification_role_id', v)} size="sm" placeholder="Select role..."
                                        options={[{ value: "", label: "None" }, ...roles.map(r => ({ value: r.id, label: `@${r.name}` }))]} />
                                </div>
                            )}
                        </SectionCard>

                        {/* Join Slowmode */}
                        <SectionCard title="Join Slowmode" subtitle="Rate-limit new member joins" accent="#10b981">
                            <ShieldToggle label="Join Rate Limit" desc="Flag users who join too quickly after each other." active={settings.join_slowmode_enabled} onToggle={() => update('join_slowmode_enabled', !settings.join_slowmode_enabled)} color="#10b981" />
                            <RaidSlider label="Cooldown" value={settings.join_slowmode_seconds} min={5} max={120} unit="s" active={settings.join_slowmode_enabled} onChange={(v) => update('join_slowmode_seconds', v)} color="#10b981" />
                        </SectionCard>

                        {/* Logging & Notifications */}
                        <SectionCard title="Logging & Alerts" subtitle="Configure raid notifications" accent="#5865F2">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Log Channel</label>
                                <CustomDropdown value={settings.log_channel_id} onChange={(v) => update('log_channel_id', v)} size="sm" placeholder="Select channel..."
                                    options={[{ value: "", label: "Disable" }, ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))]} />
                            </div>
                            <ShieldToggle label="DM Notification" desc="Send a DM to flagged users explaining the action." active={settings.dm_notification_enabled} onToggle={() => update('dm_notification_enabled', !settings.dm_notification_enabled)} color="#5865F2" />
                            {settings.dm_notification_enabled && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Custom DM Message <span className="opacity-50">(leave empty for default)</span></label>
                                    <textarea value={settings.dm_message} onChange={(e) => update('dm_message', e.target.value)} placeholder="You have been flagged by our anti-raid system..."
                                        className="w-full bg-black/40 border border-[var(--border)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#5865F2] transition-all resize-none font-mono text-[11px] shadow-inner min-h-[60px]" />
                                </div>
                            )}
                        </SectionCard>
                    </div>
                </div>
            </div>

            {/* Floating Save Bar */}
            {hasChanges && typeof document !== 'undefined' && createPortal(
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#2f3136] border border-[#202225] px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-fade-up flex items-center justify-between gap-12 min-w-[500px]">
                    <span className="text-[#ffffff] font-bold text-[13px] uppercase tracking-tight">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-4 shrink-0">
                        <button onClick={handleReset} className="text-[#b9bbbe] hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors">Reset</button>
                        <button onClick={handleSave} disabled={saving}
                            className="px-6 py-2 bg-[#248046] hover:bg-[#1a6334] text-white font-black rounded-lg transition-all flex items-center gap-2 text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50">
                            {saving ? (<><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...</>) : "Save Changes"}
                        </button>
                    </div>
                </div>,
                document.body
            )}
            <ToastContainer toast={toast} onClose={hideToast} />
        </div>
    );
}
