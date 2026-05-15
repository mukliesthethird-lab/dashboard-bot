"use client";

import Loading from "@/components/Loading";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ToastContainer, { useToast } from "./Toast";
import CustomDropdown from "./CustomDropdown";
import { Channel } from "../types";

interface Props {
    guildId: string;
}

interface AutomodSettings {
    anti_links: boolean;
    anti_invites: boolean;
    anti_spam: boolean;
    anti_caps: boolean;
    anti_mentions: boolean;
    anti_zalgo: boolean;
    anti_emoji: boolean;
    spam_threshold: number;
    caps_threshold: number;
    mentions_threshold: number;
    emoji_threshold: number;
    penalty_action: string;
    blacklisted_words: string[];
    log_channel_id: string;
    exempt_channels: string[];
    exempt_roles: string[];
    escalation_rules: { warns: number; action: string }[];
    use_global_blacklist: boolean;
}

/* ── Standalone sub-components (MUST live outside the parent to keep refs stable across re-renders) ── */

const ShieldToggle = ({ label, desc, active, onToggle }: { label: string; desc: string; active: boolean; onToggle: () => void }) => (
    <div className={`p-3 rounded-xl border transition-all ${active ? 'bg-[#5865F2]/5 border-[#5865F2]/30 shadow-inner' : 'bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-white/10'}`}>
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
                <span className={`text-[13px] font-bold ${active ? 'text-white' : 'text-[var(--text-secondary)]'}`}>{label}</span>
            </div>
            <button
                onClick={onToggle}
                className={`relative w-9 h-5 rounded-full transition-colors ${active ? 'bg-[#5865F2]' : 'bg-[#4e5058]'}`}
            >
                <div className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-md transition-transform ${active ? 'left-[18px]' : 'left-[2px]'}`} />
            </button>
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">{desc}</p>
    </div>
);

function ThresholdSlider({ label, value, min, max, unit, active, onChange }: { label: string; value: number; min: number; max: number; unit: string; active: boolean; onChange: (v: number) => void }) {
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
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        trackRef.current.setPointerCapture(e.pointerId);
        onChange(calcValue(e.clientX));
    }, [active, calcValue, onChange]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || !active) return;
        e.preventDefault();
        onChange(calcValue(e.clientX));
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
                <span className="text-[11px] font-black text-[#5865F2] bg-[#5865F2]/10 px-2 py-0.5 rounded-md border border-[#5865F2]/20">{value}{unit}</span>
            </div>
            <div
                ref={trackRef}
                className="relative h-6 flex items-center select-none touch-none"
                style={{ cursor: active ? 'pointer' : 'not-allowed' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Track background */}
                <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--bg-tertiary)] pointer-events-none" />
                {/* Track fill */}
                <div className="absolute left-0 h-1.5 rounded-full bg-[#5865F2] pointer-events-none" style={{ width: `${pct}%` }} />
                {/* Thumb */}
                <div
                    className="absolute w-5 h-5 rounded-full bg-[#5865F2] border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                    style={{ left: `calc(${pct}% - 10px)` }}
                />
            </div>
        </div>
    );
}

export default function AutomodVisualizer({ guildId }: Props) {
    const { toast, success, error, hideToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<{ id: string; name: string; color: number }[]>([]);

    const [settings, setSettings] = useState<AutomodSettings>({
        anti_links: false,
        anti_invites: false,
        anti_spam: false,
        anti_caps: false,
        anti_mentions: false,
        anti_zalgo: false,
        anti_emoji: false,
        spam_threshold: 70,
        caps_threshold: 70,
        mentions_threshold: 5,
        emoji_threshold: 10,
        penalty_action: "warn",
        blacklisted_words: [],
        log_channel_id: "",
        exempt_channels: [],
        exempt_roles: [],
        escalation_rules: [],
        use_global_blacklist: false
    });

    const [activePreset, setActivePreset] = useState<'relaxed' | 'balanced' | 'aggressive' | null>(null);

    const [originalSettings, setOriginalSettings] = useState<AutomodSettings | null>(null);

    // Simulator State
    const [newWord, setNewWord] = useState("");
    const [testMessage, setTestMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [automodRes, chanRes, roleRes] = await Promise.all([
                    fetch(`/api/automod?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`)
                ]);

                const data = await automodRes.json();
                const chanData = await chanRes.json();
                const roleData = await roleRes.json();

                if (Array.isArray(chanData)) setChannels(chanData);
                if (Array.isArray(roleData)) setRoles(roleData);

                if (data && !data.error) {
                    const loadedSettings: AutomodSettings = {
                        anti_links: !!data.anti_links,
                        anti_invites: !!data.anti_invites,
                        anti_spam: !!data.anti_spam,
                        anti_caps: !!data.anti_caps,
                        anti_mentions: !!data.anti_mentions,
                        anti_zalgo: !!data.anti_zalgo,
                        anti_emoji: !!data.anti_emoji,
                        spam_threshold: data.spam_threshold || 70,
                        caps_threshold: data.caps_threshold || 70,
                        mentions_threshold: data.mentions_threshold || 5,
                        emoji_threshold: data.emoji_threshold || 10,
                        penalty_action: data.penalty_action || "warn",
                        log_channel_id: data.log_channel_id || "",
                        blacklisted_words: [],
                        exempt_channels: [],
                        exempt_roles: [],
                        escalation_rules: [],
                        use_global_blacklist: !!data.use_global_blacklist
                    };

                    try {
                        loadedSettings.exempt_channels = typeof data.exempt_channels === 'string' ? JSON.parse(data.exempt_channels) : (data.exempt_channels || []);
                        loadedSettings.exempt_roles = typeof data.exempt_roles === 'string' ? JSON.parse(data.exempt_roles) : (data.exempt_roles || []);
                        const escalation = typeof data.escalation_rules === 'string' ? JSON.parse(data.escalation_rules) : data.escalation_rules;
                        loadedSettings.escalation_rules = Array.isArray(escalation) ? escalation : [];
                    } catch { /* Fail silently */ }

                    try {
                        loadedSettings.blacklisted_words = typeof data.blacklisted_words === 'string'
                            ? JSON.parse(data.blacklisted_words)
                            : (data.blacklisted_words || []);
                    } catch (e) {
                        loadedSettings.blacklisted_words = [];
                    }

                    setSettings(loadedSettings);
                    setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings)));
                }
            } catch (err) {
                console.error("Failed to fetch automod settings", err);
            } finally {
                setLoading(false);
            }
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
            const res = await fetch('/api/automod', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guild_id: guildId,
                    ...settings,
                    blacklisted_words: JSON.stringify(settings.blacklisted_words)
                })
            });
            if (res.ok) {
                setOriginalSettings(JSON.parse(JSON.stringify(settings)));
                success("Automod configurations deployed successfully!");
            } else {
                error("Failed to save settings.");
            }
        } catch {
            error("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (originalSettings) {
            setSettings(JSON.parse(JSON.stringify(originalSettings)));
        }
    };

    const handleAddWord = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newWord.trim();
        if (trimmed && !settings.blacklisted_words.includes(trimmed)) {
            setSettings(prev => ({
                ...prev,
                blacklisted_words: [...prev.blacklisted_words, trimmed]
            }));
            setNewWord("");
        }
    };

    const removeWord = (index: number) => {
        setSettings(prev => ({
            ...prev,
            blacklisted_words: prev.blacklisted_words.filter((_, i) => i !== index)
        }));
    };

    const addEscalation = () => {
        setSettings(prev => ({
            ...prev,
            escalation_rules: [...prev.escalation_rules, { warns: 3, action: "mute_1h" }]
        }));
    };

    const removeEscalation = (idx: number) => {
        setSettings(prev => ({
            ...prev,
            escalation_rules: prev.escalation_rules.filter((_, i) => i !== idx)
        }));
    };

    const updateEscalation = (idx: number, field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            escalation_rules: prev.escalation_rules.map((rule, i) => i === idx ? { ...rule, [field]: value } : rule)
        }));
    };

    const matchedRules = useMemo(() => {
        const rules: string[] = [];
        if (!testMessage.trim()) return rules;
        const msg = testMessage.toLowerCase();

        if (settings.anti_invites && /(discord\.gg|discordapp\.com\/invite)\/[^\s]+/i.test(testMessage)) {
            rules.push("Discord Invite");
        }
        if (settings.anti_links && /https?:\/\/[^\s]+/.test(msg) && !rules.includes("Discord Invite")) {
            rules.push("URL / Links");
        }
        if (settings.anti_zalgo && /[\u0300-\u036F\u0483-\u0489]/.test(testMessage)) {
            rules.push("Zalgo Text");
        }
        if (settings.anti_caps && testMessage.length > 10) {
            const caps = testMessage.replace(/[^A-Z]/g, "").length;
            const ratio = (caps / testMessage.length) * 100;
            if (ratio > settings.caps_threshold) rules.push(`Excessive Caps (${Math.round(ratio)}%)`);
        }
        if (settings.anti_mentions) {
            const mentions = (testMessage.match(/<@!?\d+>|<@&\d+>/g) || []).length;
            if (mentions > settings.mentions_threshold) rules.push(`Mass Mention (${mentions})`);
        }
        if (settings.anti_emoji) {
            const emojis = (testMessage.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1F9FF}]/gu) || []).length;
            if (emojis > settings.emoji_threshold) rules.push(`Emoji Spam (${emojis})`);
        }
        if (settings.anti_spam) {
            // Simulator for duplicate messages
            const words = msg.split(/\s+/).filter(w => w.length > 3);
            const duplicates = words.filter((w, i) => words.indexOf(w) !== i);
            if (duplicates.length > 3) rules.push("Repetitive Patterns (Spam)");
        }
        if (settings.use_global_blacklist) {
            const badWords = ["scam", "free nitro", "gift", "@everyone", "discord.gg/scam"]; // Example system list
            for (const word of badWords) {
                if (msg.includes(word)) rules.push(`Global Blacklist: "${word}"`);
            }
        }
        for (const word of settings.blacklisted_words) {
            try {
                const regex = new RegExp(word, 'i');
                if (regex.test(msg)) rules.push(`Blocked Pattern: "${word}"`);
            } catch {
                if (msg.includes(word.toLowerCase())) rules.push(`Blocked Pattern: "${word}"`);
            }
        }
        return rules;
    }, [testMessage, settings]);

    if (loading) return <Loading message="Calibrating Security Shields..." />;

    const updateSetting = (key: keyof AutomodSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setActivePreset(null);
    };

    const applyPreset = (preset: 'relaxed' | 'balanced' | 'aggressive') => {
        setActivePreset(preset);
        const config: Record<'relaxed' | 'balanced' | 'aggressive', Partial<AutomodSettings>> = {
            relaxed: { 
                anti_links: false, 
                anti_invites: true, 
                anti_zalgo: true,
                anti_spam: true, 
                anti_caps: true,
                anti_mentions: true,
                anti_emoji: true,
                caps_threshold: 90, 
                mentions_threshold: 15, 
                emoji_threshold: 30,
                spam_threshold: 40,
                use_global_blacklist: false
            },
            balanced: { 
                anti_links: true, 
                anti_invites: true, 
                anti_zalgo: true,
                anti_spam: true, 
                anti_caps: true,
                anti_mentions: true,
                anti_emoji: true,
                caps_threshold: 70, 
                mentions_threshold: 5, 
                emoji_threshold: 12,
                spam_threshold: 70,
                use_global_blacklist: true
            },
            aggressive: { 
                anti_links: true, 
                anti_invites: true, 
                anti_zalgo: true,
                anti_spam: true, 
                anti_caps: true,
                anti_mentions: true,
                anti_emoji: true,
                caps_threshold: 40, 
                mentions_threshold: 3, 
                emoji_threshold: 6,
                spam_threshold: 90,
                use_global_blacklist: true
            }
        };
        setSettings(prev => ({ ...prev, ...config[preset] }));
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto animate-fade-up pb-24 px-2">
            {/* Page Title - More Compact */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight leading-tight uppercase">Automod Security+</h1>
                    <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-[0.2em]">Active Defense Matrix</p>
                </div>
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-[var(--border)]">
                    <button
                        onClick={() => applyPreset('relaxed')}
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all ${activePreset === 'relaxed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'hover:bg-white/5 text-emerald-400/60 hover:text-emerald-400'
                            }`}
                    >
                        Relaxed
                    </button>
                    <button
                        onClick={() => applyPreset('balanced')}
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all ${activePreset === 'balanced'
                                ? 'bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20'
                                : 'hover:bg-white/5 text-[#5865F2]/60 hover:text-[#5865F2]'
                            }`}
                    >
                        Balanced
                    </button>
                    <button
                        onClick={() => applyPreset('aggressive')}
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded transition-all ${activePreset === 'aggressive'
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'hover:bg-white/5 text-rose-500/60 hover:text-rose-500'
                            }`}
                    >
                        Aggressive
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* Left Column: Shield Matrix (7/12) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="glass-card p-4 rounded-xl border border-[var(--border)] space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Shield Configuration</h3>
                            <div className="flex items-center gap-2"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <ShieldToggle label="Anti-Links" desc="Blocks all http(s) URLs." active={settings.anti_links} onToggle={() => updateSetting('anti_links', !settings.anti_links)} />
                            <ShieldToggle label="Anti-Invites" desc="Blocks Discord invites." active={settings.anti_invites} onToggle={() => updateSetting('anti_invites', !settings.anti_invites)} />
                            <ShieldToggle label="Anti-Zalgo" desc="Blocks glitchy text." active={settings.anti_zalgo} onToggle={() => updateSetting('anti_zalgo', !settings.anti_zalgo)} />
                            <ShieldToggle label="Anti-Spam" desc="Rate-limits messages." active={settings.anti_spam} onToggle={() => updateSetting('anti_spam', !settings.anti_spam)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 pt-3 border-t border-[var(--border)]">
                            <div className="space-y-3">
                                <ShieldToggle label="Anti-Caps" desc="Limits uppercase usage." active={settings.anti_caps} onToggle={() => updateSetting('anti_caps', !settings.anti_caps)} />
                                <ThresholdSlider label="Caps Ratio" value={settings.caps_threshold} min={10} max={100} unit="%" active={settings.anti_caps} onChange={(v) => updateSetting('caps_threshold', v)} />
                            </div>
                            <div className="space-y-3">
                                <ShieldToggle label="Mass Mention" desc="Limits mention counts." active={settings.anti_mentions} onToggle={() => updateSetting('anti_mentions', !settings.anti_mentions)} />
                                <ThresholdSlider label="Mention Limit" value={settings.mentions_threshold} min={1} max={50} unit="" active={settings.anti_mentions} onChange={(v) => updateSetting('mentions_threshold', v)} />
                            </div>
                            <div className="space-y-3">
                                <ShieldToggle label="Emoji Spam" desc="Limits emoji counts." active={settings.anti_emoji} onToggle={() => updateSetting('anti_emoji', !settings.anti_emoji)} />
                                <ThresholdSlider label="Emoji Limit" value={settings.emoji_threshold} min={1} max={50} unit="" active={settings.anti_emoji} onChange={(v) => updateSetting('emoji_threshold', v)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Action & Pattern (5/12) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="glass-card p-4 rounded-xl border border-[var(--border)] space-y-4 h-fit">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
                            Action
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Sanction</label>
                                <CustomDropdown
                                    value={settings.penalty_action}
                                    onChange={(v) => updateSetting('penalty_action', v)}
                                    size="sm"
                                    options={[
                                        { value: "warn", label: "Warn + Delete" },
                                        { value: "mute_5m", label: "5m Timeout" },
                                        { value: "mute_1h", label: "1h Timeout" },
                                        { value: "kick", label: "Kick User" },
                                        { value: "ban", label: "Ban User" }
                                    ]}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Logging</label>
                                <CustomDropdown
                                    value={settings.log_channel_id}
                                    onChange={(v) => updateSetting('log_channel_id', v)}
                                    size="sm"
                                    options={[
                                        { value: "", label: "Disable" },
                                        ...channels.map(c => ({ value: c.id, label: `# ${c.name}` }))
                                    ]}
                                    placeholder="Select..."
                                />
                            </div>
                        </div>

                        {/* Global Blacklist Toggle */}
                        <div className="pt-3 border-t border-[var(--border)]">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div>
                                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Global Blacklist</span>
                                    <p className="text-[9px] text-[var(--text-tertiary)]">Block common scam links & spam.</p>
                                </div>
                                <button
                                    onClick={() => updateSetting('use_global_blacklist', !settings.use_global_blacklist)}
                                    className={`relative w-8 h-4 rounded-full transition-colors ${settings.use_global_blacklist ? 'bg-[#5865F2]' : 'bg-[#4e5058]'}`}
                                >
                                    <div className={`absolute top-[1px] w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${settings.use_global_blacklist ? 'left-[15px]' : 'left-[1px]'}`} />
                                </button>
                            </label>
                        </div>
                    </div>

                    <div className="glass-card p-4 rounded-xl border border-[var(--border)] space-y-3 flex-1 flex flex-col min-h-0">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Words Filter</h3>
                        <form onSubmit={handleAddWord} className="flex gap-2">
                            <input
                                type="text"
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                                placeholder="Add words..."
                                className="flex-1 bg-black/20 border border-[var(--border)] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#5865F2] font-mono text-[11px] transition-all"
                            />
                            <button type="submit" className="px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black rounded-lg text-sm">+</button>
                        </form>
                        <div className="flex flex-wrap gap-1.5 h-[50px] overflow-y-auto p-2 bg-black/40 rounded-lg border border-[var(--border)] content-start custom-scrollbar">
                            {settings.blacklisted_words.length === 0 && (
                                <div className="m-auto text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest italic opacity-40">Empty</div>
                            )}
                            {settings.blacklisted_words.map((word, idx) => (
                                <div
                                    key={`${word}-${idx}`}
                                    onClick={() => removeWord(idx)}
                                    className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-200 px-2.5 py-1.5 rounded-md text-[10px] font-mono group hover:bg-rose-500/20 hover:border-rose-500 cursor-pointer transition-all select-none"
                                >
                                    <span className="truncate max-w-[100px]">{word}</span>
                                    <span className="text-rose-500 group-hover:text-white transition-colors">✕</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Row: Exemption and Escalation Matrices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <div className="glass-card p-4 rounded-xl border border-[var(--border)] space-y-4">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Exemption Matrix</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Exempt Channels</label>
                            <div className="flex flex-wrap gap-1 mb-2 max-h-[100px] overflow-y-auto">
                                {settings.exempt_channels.map(id => (
                                    <span key={id} className="px-2 py-0.5 bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] text-[10px] font-bold rounded flex items-center gap-1">
                                        # {channels.find(c => c.id === id)?.name || id}
                                        <button onClick={() => updateSetting('exempt_channels', settings.exempt_channels.filter(x => x !== id))} className="hover:text-white">✕</button>
                                    </span>
                                ))}
                            </div>
                            <CustomDropdown
                                value=""
                                onChange={(v) => !settings.exempt_channels.includes(v) && updateSetting('exempt_channels', [...settings.exempt_channels, v])}
                                size="sm"
                                options={channels.filter(c => !settings.exempt_channels.includes(c.id)).map(c => ({ value: c.id, label: `# ${c.name}` }))}
                                placeholder="Add channel..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Exempt Roles</label>
                            <div className="flex flex-wrap gap-1 mb-2 max-h-[100px] overflow-y-auto">
                                {settings.exempt_roles.map(id => (
                                    <span key={id} className="px-2 py-0.5 bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] text-[10px] font-bold rounded flex items-center gap-1">
                                        @{roles.find(r => r.id === id)?.name || id}
                                        <button onClick={() => updateSetting('exempt_roles', settings.exempt_roles.filter(x => x !== id))} className="hover:text-white">✕</button>
                                    </span>
                                ))}
                            </div>
                            <CustomDropdown
                                value=""
                                onChange={(v) => !settings.exempt_roles.includes(v) && updateSetting('exempt_roles', [...settings.exempt_roles, v])}
                                size="sm"
                                options={roles.filter(r => !settings.exempt_roles.includes(r.id)).map(r => ({ value: r.id, label: `@ ${r.name}` }))}
                                placeholder="Add role..."
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl border border-[var(--border)] space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Escalation Matrix</h3>
                        <button onClick={addEscalation} className="text-[9px] font-bold text-[#5865F2] hover:underline uppercase tracking-widest">+ Add Rule</button>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {settings.escalation_rules.map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-[var(--border)]">
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={rule.warns}
                                        onChange={(e) => updateEscalation(idx, 'warns', parseInt(e.target.value))}
                                        className="w-10 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-1 py-0.5 text-[11px] font-bold text-center text-white outline-none"
                                    />
                                    <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-tight">Warns ➜</span>
                                </div>
                                <div className="flex-1">
                                    <CustomDropdown
                                        value={rule.action}
                                        onChange={(v) => updateEscalation(idx, 'action', v)}
                                        size="sm"
                                        options={[
                                            { value: "mute_5m", label: "5m Timeout" },
                                            { value: "mute_1h", label: "1h Timeout" },
                                            { value: "mute_24h", label: "24h Timeout" },
                                            { value: "kick", label: "Kick" },
                                            { value: "ban", label: "Ban" }
                                        ]}
                                    />
                                </div>
                                <button onClick={() => removeEscalation(idx)} className="text-[var(--text-tertiary)] hover:text-rose-500 transition-colors px-1">✕</button>
                            </div>
                        ))}
                        {settings.escalation_rules.length === 0 && (
                            <p className="text-[10px] text-[var(--text-tertiary)] italic text-center py-4">No escalation rules configured.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Simulator (Full Width) */}
            <div className={`glass-card p-4 rounded-xl border-2 transition-all flex flex-col ${testMessage === '' ? 'border-[var(--border)]' :
                matchedRules.length > 0 ? 'border-red-500/40 bg-red-500/[0.02]' : 'border-emerald-500/20 bg-emerald-500/[0.02]'
                }`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Security Simulator</h3>
                    {testMessage && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${matchedRules.length > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>
                            {matchedRules.length > 0 ? 'Blocked' : 'Clear'}
                        </span>
                    )}
                </div>
                <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Test security matrix with a message..."
                    className="w-full h-32 bg-black/40 border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#5865F2] transition-all resize-none font-mono text-xs shadow-inner"
                />
                {testMessage && matchedRules.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {matchedRules.map((rule, i) => (
                            <span key={i} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] font-mono rounded-md">{rule}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Save Bar — rendered via portal to escape transform-containing parent */}
            {hasChanges && typeof document !== 'undefined' && createPortal(
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#2f3136] border border-[#202225] px-4 py-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-fade-up flex items-center justify-between gap-12 min-w-[500px]">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[#ffffff] font-bold text-[13px] uppercase tracking-tight">Careful — you have unsaved changes!</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={handleReset}
                            className="text-[#b9bbbe] hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black rounded-[4px] transition-all flex items-center gap-2 group text-[11px] uppercase tracking-widest shadow-lg shadow-[#5865F2]/20 active:scale-95 disabled:opacity-50"
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
                </div>,
                document.body
            )}

            <ToastContainer toast={toast} onClose={hideToast} />
        </div>
    );
}
