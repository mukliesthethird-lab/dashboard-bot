"use client";

import { useState, useEffect } from "react";
import { Form, Channel } from "@/types";
import { useToast, ToastContainer } from "./Toast";

interface FormPanelEditorProps {
    form: Form;
    channels: Channel[];
    guildId: string;
    onClose: () => void;
    onSave: () => void;
}

interface PanelConfig {
    channel_id: string;
    embed_title: string;
    embed_description: string;
    embed_color: string;
    embed_thumbnail: string;
    embed_image: string;
    button_label: string;
    button_style: 'primary' | 'secondary' | 'success' | 'danger';
    button_emoji: string;
    webhook_name: string;
    webhook_avatar: string;
}

const BUTTON_STYLES = [
    { value: 'primary', label: 'Primary', color: 'bg-[#5865F2]', textColor: 'text-white' },
    { value: 'secondary', label: 'Secondary', color: 'bg-[#4f545c]', textColor: 'text-white' },
    { value: 'success', label: 'Success', color: 'bg-[#3ba55c]', textColor: 'text-white' },
    { value: 'danger', label: 'Danger', color: 'bg-[#ed4245]', textColor: 'text-white' },
];

const COLOR_PRESETS = [
    { name: 'Gold', value: '#f59e0b' },
    { name: 'Blue', value: '#5865F2' },
    { name: 'Green', value: '#3ba55c' },
    { name: 'Red', value: '#ed4245' },
    { name: 'Purple', value: '#9b59b6' },
    { name: 'Cyan', value: '#00d4ff' },
];

export default function FormPanelEditor({
    form,
    channels,
    guildId,
    onClose,
    onSave
}: FormPanelEditorProps) {
    const [config, setConfig] = useState<PanelConfig>({
        channel_id: '',
        embed_title: form.name,
        embed_description: form.description || 'Click the button below to fill out this form.',
        embed_color: '#f59e0b',
        embed_thumbnail: '',
        embed_image: '',
        button_label: 'Open Form',
        button_style: 'primary',
        button_emoji: '📝',
        webhook_name: '',
        webhook_avatar: '',
    });
    const [sending, setSending] = useState(false);
    const { toast, hideToast, success, error } = useToast();

    // Use all channels (text channels typically have type 0, but our interface doesn't include type)
    const textChannels = channels;

    const handleSendPanel = async () => {
        if (!config.channel_id) {
            error("Please select a channel");
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/forms/panels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_id: form.id,
                    guild_id: guildId,
                    channel_id: config.channel_id,
                    embed: {
                        title: config.embed_title,
                        description: config.embed_description,
                        color: parseInt(config.embed_color.replace('#', ''), 16),
                        thumbnail: config.embed_thumbnail ? { url: config.embed_thumbnail } : undefined,
                        image: config.embed_image ? { url: config.embed_image } : undefined,
                    },
                    button: {
                        label: config.button_label,
                        style: config.button_style,
                        emoji: config.button_emoji,
                    },
                    webhook: config.webhook_name ? {
                        name: config.webhook_name,
                        avatar: config.webhook_avatar,
                    } : undefined,
                })
            });

            if (res.ok) {
                success("Panel sent successfully!");
                onSave();
                onClose();
            } else {
                const data = await res.json();
                error(data.error || "Failed to send panel");
            }
        } catch (err) {
            error("Failed to send panel");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-[#12121a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <ToastContainer toast={toast} onClose={hideToast} />

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white">📤 Send Form Panel</h2>
                        <p className="text-gray-400 mt-1">Configure and send the form button to a channel</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Settings Column */}
                        <div className="space-y-6">
                            {/* Channel Selection */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">📢</span> Channel
                                </h3>
                                <select
                                    value={config.channel_id}
                                    onChange={(e) => setConfig({ ...config, channel_id: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="">Select a channel...</option>
                                    {textChannels.map(ch => (
                                        <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Embed Settings */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">📝</span> Embed Message
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={config.embed_title}
                                            onChange={(e) => setConfig({ ...config, embed_title: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                            placeholder="Form title..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                        <textarea
                                            value={config.embed_description}
                                            onChange={(e) => setConfig({ ...config, embed_description: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 resize-none"
                                            placeholder="Describe the form..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Embed Color</label>
                                        <div className="flex items-center gap-2">
                                            {COLOR_PRESETS.map(c => (
                                                <button
                                                    key={c.value}
                                                    onClick={() => setConfig({ ...config, embed_color: c.value })}
                                                    className={`w-8 h-8 rounded-full border-2 transition ${config.embed_color === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c.value }}
                                                    title={c.name}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={config.embed_color}
                                                onChange={(e) => setConfig({ ...config, embed_color: e.target.value })}
                                                className="w-8 h-8 rounded-lg cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Thumbnail URL</label>
                                            <input
                                                type="text"
                                                value={config.embed_thumbnail}
                                                onChange={(e) => setConfig({ ...config, embed_thumbnail: e.target.value })}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Image URL</label>
                                            <input
                                                type="text"
                                                value={config.embed_image}
                                                onChange={(e) => setConfig({ ...config, embed_image: e.target.value })}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Button Settings */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">🔘</span> Button
                                </h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Label</label>
                                            <input
                                                type="text"
                                                value={config.button_label}
                                                onChange={(e) => setConfig({ ...config, button_label: e.target.value })}
                                                maxLength={80}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                                placeholder="Open Form"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Emoji</label>
                                            <input
                                                type="text"
                                                value={config.button_emoji}
                                                onChange={(e) => setConfig({ ...config, button_emoji: e.target.value })}
                                                maxLength={2}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 text-center text-2xl"
                                                placeholder="📝"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Style</label>
                                        <div className="flex flex-wrap gap-2">
                                            {BUTTON_STYLES.map(style => (
                                                <button
                                                    key={style.value}
                                                    onClick={() => setConfig({ ...config, button_style: style.value as any })}
                                                    className={`px-4 py-2 rounded-lg font-medium transition ${style.color} ${style.textColor} ${config.button_style === style.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#12121a]' : 'opacity-70 hover:opacity-100'}`}
                                                >
                                                    {style.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Webhook Settings (Optional) */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="text-xl">🤖</span> Custom Profile
                                    <span className="text-xs px-2 py-0.5 bg-gray-500/30 text-gray-400 rounded-full">Optional</span>
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">Customize the bot&apos;s name and avatar for this message</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={config.webhook_name}
                                            onChange={(e) => setConfig({ ...config, webhook_name: e.target.value })}
                                            maxLength={80}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                            placeholder="Bot name..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Avatar URL</label>
                                        <input
                                            type="text"
                                            value={config.webhook_avatar}
                                            onChange={(e) => setConfig({ ...config, webhook_avatar: e.target.value })}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Column */}
                        <div className="lg:sticky lg:top-0">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                <span className="text-xl">👁️</span> Preview
                            </h3>
                            <div className="bg-[#36393f] rounded-xl p-4 border border-white/10">
                                {/* Discord-style message preview */}
                                <div className="flex gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                                        {config.webhook_name ? config.webhook_name[0].toUpperCase() : 'D'}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Username & timestamp */}
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-white">
                                                {config.webhook_name || 'Don Pollo Bot'}
                                            </span>
                                            <span className="text-xs text-gray-400">Today at 12:00 PM</span>
                                        </div>

                                        {/* Embed */}
                                        <div
                                            className="rounded-md overflow-hidden border-l-4 bg-[#2f3136] max-w-md"
                                            style={{ borderColor: config.embed_color }}
                                        >
                                            <div className="p-3">
                                                {config.embed_title && (
                                                    <div className="font-semibold text-white mb-1">{config.embed_title}</div>
                                                )}
                                                {config.embed_description && (
                                                    <div className="text-sm text-gray-300 whitespace-pre-wrap">{config.embed_description}</div>
                                                )}
                                            </div>
                                            {config.embed_image && (
                                                <div className="px-3 pb-3">
                                                    <div className="bg-white/10 rounded-md h-32 flex items-center justify-center text-gray-400 text-sm">
                                                        Image Preview
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Button */}
                                        <div className="mt-2">
                                            <button
                                                className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 ${BUTTON_STYLES.find(s => s.value === config.button_style)?.color || 'bg-[#5865F2]'
                                                    } text-white`}
                                            >
                                                {config.button_emoji && <span>{config.button_emoji}</span>}
                                                {config.button_label || 'Open Form'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500 mt-4 text-center">
                                This is how the form panel will appear in Discord
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSendPanel}
                        disabled={sending || !config.channel_id}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {sending ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <span>📤</span>
                                Send to Channel
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
