"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Form, Channel, EmbedData } from "@/types";
import { useToast, ToastContainer } from "./Toast";
import CustomDropdown from "./CustomDropdown";
import EmojiPicker from "./EmojiPicker";

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
    embed_author_name: string;
    embed_author_icon: string;
    embed_footer_text: string;
    embed_footer_icon: string;
    button_label: string;
    button_style: 'primary' | 'secondary' | 'success' | 'danger';
    button_emoji: string;
    webhook_name: string;
    webhook_avatar: string;
    message_content: string;
}

const BUTTON_STYLES = [
    { value: 'primary', label: 'Primary', color: 'bg-[#5865F2]', hover: 'hover:bg-[#4752C4]' },
    { value: 'secondary', label: 'Secondary', color: 'bg-[#4e5058]', hover: 'hover:bg-[#6d6f73]' },
    { value: 'success', label: 'Success', color: 'bg-[#248046]', hover: 'hover:bg-[#1a6334]' },
    { value: 'danger', label: 'Danger', color: 'bg-[#da373c]', hover: 'hover:bg-[#a12828]' },
];

const AccordionItem = ({ title, children, isOpen, onToggle }: { title: React.ReactNode, children: React.ReactNode, isOpen: boolean, onToggle: () => void }) => (
    <div className="border border-[#1e1f22] rounded-[8px] bg-[#2b2d31] overflow-hidden shadow-sm transition-all duration-200">
        <div
            className="flex items-center justify-between p-4 bg-[#1e1f22]/50 cursor-pointer hover:bg-[#4e5058]/20 transition select-none"
            onClick={onToggle}
        >
            <div className="flex items-center gap-3 font-bold text-[#f2f3f5]">
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                {title}
            </div>
        </div>
        {isOpen && (
            <div className="p-4 border-t border-[#1e1f22] animate-slide-down">
                {children}
            </div>
        )}
    </div>
);

const EmojiRenderer = ({ emoji }: { emoji: string }) => {
    if (!emoji) return null;
    const customMatch = emoji.match(/<a?:(\w+):(\d+)>/);
    if (customMatch) {
        return <img src={`https://cdn.discordapp.com/emojis/${customMatch[2]}.png`} alt="" className="w-5 h-5 object-contain" />;
    }
    return <span className="text-lg">{emoji}</span>;
};

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
        embed_author_name: '',
        embed_author_icon: '',
        embed_footer_text: '',
        embed_footer_icon: '',
        button_label: 'Open Form',
        button_style: 'primary',
        button_emoji: '📝',
        webhook_name: '',
        webhook_avatar: '',
        message_content: '',
    });
    
    const [sending, setSending] = useState(false);
    const { toast, hideToast, success, error } = useToast();
    const [openSections, setOpenSections] = useState<string[]>(['channel', 'embed', 'button']);
    const [mounted, setMounted] = useState(false);
    const [activeEmbedTab, setActiveEmbedTab] = useState<'body' | 'author' | 'footer' | 'images'>('body');
    const [history, setHistory] = useState<PanelConfig[]>([config]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const updateConfig = (newConfig: PanelConfig) => {
        setConfig(newConfig);
        const newHistory = history.slice(0, historyIndex + 1);
        if (newHistory.length >= 50) newHistory.shift();
        setHistory([...newHistory, newConfig]);
        setHistoryIndex(newHistory.length);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setConfig(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setConfig(history[historyIndex + 1]);
        }
    };

    const exportConfig = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `form_panel_${form.name.toLowerCase().replace(/\s+/g, '_')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                updateConfig({ ...config, ...imported });
            } catch (err) {
                error("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => { setMounted(true); }, []);

    const toggleSection = (id: string) => {
        setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handleSendPanel = async () => {
        if (!config.channel_id) {
            error("Please select a target channel!");
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
                    message_content: config.message_content,
                    embed_data: {
                        title: config.embed_title,
                        description: config.embed_description,
                        color: parseInt(config.embed_color.replace('#', ''), 16),
                        thumbnail: config.embed_thumbnail ? { url: config.embed_thumbnail } : undefined,
                        image: config.embed_image ? { url: config.embed_image } : undefined,
                        author: config.embed_author_name ? {
                            name: config.embed_author_name,
                            icon_url: config.embed_author_icon
                        } : undefined,
                        footer: config.embed_footer_text ? {
                            text: config.embed_footer_text,
                            icon_url: config.embed_footer_icon
                        } : undefined,
                    },
                    components: [
                        {
                            type: 1, // Action Row
                            components: [
                                {
                                    type: 2, // Button
                                    label: config.button_label,
                                    style: config.button_style === 'primary' ? 1 
                                         : config.button_style === 'secondary' ? 2 
                                         : config.button_style === 'success' ? 3 
                                         : 4, // danger
                                    emoji: config.button_emoji.includes(':') ? {
                                        id: config.button_emoji.split(':')[2].slice(0, -1),
                                        name: config.button_emoji.split(':')[1],
                                        animated: config.button_emoji.startsWith('<a:')
                                    } : { name: config.button_emoji },
                                    custom_id: `form_${form.id}`
                                }
                            ]
                        }
                    ],
                    webhook_name: config.webhook_name || undefined,
                    webhook_avatar_url: config.webhook_avatar || undefined,
                })
            });

            if (res.ok) {
                success("Panel sent successfully!");
                onSave();
                setTimeout(onClose, 1500);
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

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in">
            <div className="bg-[#2b2d31] w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-[8px] shadow-2xl flex flex-col overflow-hidden border-0 md:border border-[#1e1f22] animate-scale-in">
                <ToastContainer toast={toast} onClose={hideToast} />

                {/* Top Bar */}
                <div className="bg-[#212226] border-b border-[#1e1f22] px-6 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-300 transition">✕</button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-white">Edit</h2>
                            
                            {/* Undo/Redo Icons */}
                            <div className="flex items-center gap-1 border-l border-[#1e1f22] pl-4 ml-2">
                                <button 
                                    onClick={undo}
                                    disabled={historyIndex === 0}
                                    className={`p-2 text-gray-500 hover:text-gray-300 transition ${historyIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 rounded-full'}`}
                                    title="Undo"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={redo}
                                    disabled={historyIndex === history.length - 1}
                                    className={`p-2 text-gray-500 hover:text-gray-300 transition ${historyIndex === history.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 rounded-full'}`}
                                    title="Redo"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-1 border-l border-[#1e1f22] pl-4">
                                <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-gray-300 transition cursor-pointer hover:bg-white/5 rounded-[4px]">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Import
                                    <input type="file" accept=".json" onChange={importConfig} className="hidden" />
                                </label>
                                <button 
                                    onClick={exportConfig}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-gray-300 transition hover:bg-white/5 rounded-[4px]"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <CustomDropdown
                            value={config.channel_id}
                            onChange={(val) => updateConfig({ ...config, channel_id: val })}
                            options={[
                                { value: '', label: 'Select channel...' },
                                ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                            ]}
                            placeholder="Select Channel..."
                            className="w-48"
                        />
                        <button
                            onClick={handleSendPanel}
                            disabled={sending || !config.channel_id}
                            className={`px-6 py-2 bg-[#248046] hover:bg-[#1a5c32] text-white font-bold rounded-[3px] shadow-md transition disabled:opacity-50 flex items-center gap-2 ${sending ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                            {sending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Applying...</span>
                                </>
                            ) : (
                                "Apply Form Panel"
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT COLUMN: Editor inputs */}
                    <div className="w-full md:w-1/2 overflow-y-auto custom-scrollbar p-8 space-y-6">
                        {/* 1. Message Content */}
                        <AccordionItem
                            title="Message Content"
                            isOpen={openSections.includes('content')}
                            onToggle={() => toggleSection('content')}
                        >
                            <div className="space-y-3">
                                <textarea
                                    className="w-full h-32 p-4 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none resize-none text-sm text-[#dbdee1] placeholder-[#4e5058] transition"
                                    placeholder="Message content (above embeds)..."
                                    value={config.message_content}
                                    onChange={e => updateConfig({ ...config, message_content: e.target.value })}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider py-1">Quick insert:</span>
                                    {['{user}', '{server}'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => updateConfig({ ...config, message_content: config.message_content + v })}
                                            className="px-2 py-1 bg-[#1e1f22] text-[#b5bac1] text-[10px] font-mono rounded-[3px] border border-transparent hover:border-[#5865f2] transition"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </AccordionItem>

                        {/* 2. Embed Content */}
                        <AccordionItem
                            title="Embeds (1)"
                            isOpen={openSections.includes('embed')}
                            onToggle={() => toggleSection('embed')}
                        >
                            <div className="bg-[#2b2d31] rounded-[8px] border border-[#1e1f22] overflow-hidden shadow-sm">
                                {/* Embed Header */}
                                <div className="flex items-center justify-between p-3 bg-[#1e1f22]/50 border-b border-[#1e1f22]">
                                    <div className="font-bold text-xs uppercase tracking-wider text-[#b5bac1] flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.embed_color }}></span>
                                        EMBED #1
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-[#1e1f22] border-b border-[#1e1f22] overflow-x-auto no-scrollbar">
                                    {(['body', 'author', 'footer', 'images'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveEmbedTab(tab)}
                                            className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition border-b-2 flex-shrink-0 ${activeEmbedTab === tab ? 'text-[#f2f3f5] border-[#5865f2] bg-[#5865f2]/10' : 'text-[#b5bac1] border-transparent hover:text-[#dbdee1] hover:bg-[#1e1f22]'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="p-4 space-y-4">
                                    {activeEmbedTab === 'body' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Title</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_title}
                                                    onChange={(e) => updateConfig({ ...config, embed_title: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1] transition"
                                                    placeholder="Form Title"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Description</label>
                                                <textarea
                                                    value={config.embed_description}
                                                    onChange={(e) => updateConfig({ ...config, embed_description: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1] h-32 resize-none transition"
                                                    placeholder="Form Description"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Color</label>
                                                    <div className="flex gap-2 mt-1">
                                                        <input
                                                            type="color"
                                                            value={config.embed_color}
                                                            onChange={(e) => updateConfig({ ...config, embed_color: e.target.value })}
                                                            className="h-10 w-12 rounded-[3px] cursor-pointer border-0 p-0 flex-shrink-0 bg-transparent"
                                                        />
                                                        <input
                                                            value={config.embed_color}
                                                            onChange={(e) => updateConfig({ ...config, embed_color: e.target.value })}
                                                            className="flex-1 p-2 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] uppercase text-sm text-[#dbdee1] outline-none transition"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2">
                                                        {COLOR_PRESETS.map(preset => (
                                                            <button
                                                                key={preset.value}
                                                                onClick={() => updateConfig({ ...config, embed_color: preset.value })}
                                                                className={`w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-110 ${config.embed_color === preset.value ? 'ring-2 ring-[#5865F2] ring-offset-2 ring-offset-[#2b2d31]' : ''}`}
                                                                style={{ backgroundColor: preset.value }}
                                                                title={preset.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {activeEmbedTab === 'author' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Author Name</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_author_name}
                                                    onChange={(e) => updateConfig({ ...config, embed_author_name: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1]"
                                                    placeholder="Author"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Author Icon URL</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_author_icon}
                                                    onChange={(e) => updateConfig({ ...config, embed_author_icon: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-xs text-[#dbdee1]"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeEmbedTab === 'footer' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Footer Text</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_footer_text}
                                                    onChange={(e) => updateConfig({ ...config, embed_footer_text: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1]"
                                                    placeholder="Footer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Footer Icon URL</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_footer_icon}
                                                    onChange={(e) => updateConfig({ ...config, embed_footer_icon: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-xs text-[#dbdee1]"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeEmbedTab === 'images' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Thumbnail URL</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_thumbnail}
                                                    onChange={(e) => updateConfig({ ...config, embed_thumbnail: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-xs text-[#dbdee1] transition"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider">Image URL (Main)</label>
                                                <input
                                                    type="text"
                                                    value={config.embed_image}
                                                    onChange={(e) => updateConfig({ ...config, embed_image: e.target.value })}
                                                    className="w-full mt-1 p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-xs text-[#dbdee1]"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AccordionItem>

                        {/* 3. Button Configuration */}
                        <AccordionItem
                            title="Interaction Button"
                            isOpen={openSections.includes('button')}
                            onToggle={() => toggleSection('button')}
                        >
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">Button Label</label>
                                        <input
                                            type="text"
                                            value={config.button_label}
                                            onChange={(e) => updateConfig({ ...config, button_label: e.target.value })}
                                            className="w-full p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1] transition"
                                            placeholder="Button Label"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">Button Emoji</label>
                                        <div className="relative">
                                            <EmojiPicker 
                                                value={config.button_emoji} 
                                                onChange={(emoji) => updateConfig({ ...config, button_emoji: emoji })}
                                                guildId={guildId}
                                                trigger={
                                                    <button className="w-full p-3 bg-[#1e1f22] border border-transparent hover:border-[#5865F2] rounded-[3px] flex items-center justify-center text-2xl h-[46px] transition">
                                                        <EmojiRenderer emoji={config.button_emoji} />
                                                    </button>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider block mb-3">Button Style</label>
                                    <div className="flex flex-wrap gap-3">
                                        {BUTTON_STYLES.map(style => (
                                            <button
                                                key={style.value}
                                                onClick={() => updateConfig({ ...config, button_style: style.value as any })}
                                                className={`px-6 py-2 rounded-[3px] font-bold text-xs uppercase tracking-wider transition-all ${style.color} text-white ${config.button_style === style.value ? 'ring-2 ring-white ring-offset-4 ring-offset-[#2b2d31] scale-105' : 'opacity-40 hover:opacity-70'}`}
                                            >
                                                {style.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>

                        {/* 4. Webhook Profile */}
                        <AccordionItem
                            title="Custom Bot Identity (Optional)"
                            isOpen={openSections.includes('profile')}
                            onToggle={() => toggleSection('profile')}
                        >
                            <div className="space-y-4">
                                <p className="text-xs text-[#b5bac1]">Customize how the bot appears for this specific post.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">Bot Name</label>
                                        <input
                                            type="text"
                                            value={config.webhook_name}
                                            onChange={(e) => updateConfig({ ...config, webhook_name: e.target.value })}
                                            className="w-full p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1] transition"
                                            placeholder="Bot Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#b5bac1] uppercase tracking-wider block mb-2">Avatar URL</label>
                                        <input
                                            type="text"
                                            value={config.webhook_avatar}
                                            onChange={(e) => updateConfig({ ...config, webhook_avatar: e.target.value })}
                                            className="w-full p-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[3px] outline-none text-sm text-[#dbdee1] transition"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionItem>
                    </div>

                    {/* RIGHT COLUMN: Preview */}
                    <div className="hidden md:flex flex-1 bg-[#313338] items-center justify-center p-8 overflow-y-auto border-l border-[#1e1f22]">
                        <div className="w-full max-w-[550px] space-y-4">
                            <h3 className="text-[10px] font-black text-[#949ba4] uppercase tracking-[0.2em] text-center mb-6">Live Preview</h3>
                            
                            <div className="bg-[#313338] font-sans text-white text-[15px] leading-[1.375rem]">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                                        {config.webhook_avatar ? (
                                            <img src={config.webhook_avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            config.webhook_name ? config.webhook_name[0].toUpperCase() : 'D'
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-medium hover:underline cursor-pointer">{config.webhook_name || 'Don Pollo Bot'}</span>
                                            <span className="bg-[#5865F2] text-[10px] px-1.5 rounded-[3px] py-[0.5px] font-medium leading-[1.2]">APP</span>
                                            <span className="text-xs text-[#949BA4] ml-1">Today at 4:20 PM</span>
                                        </div>

                                        {/* Message Content */}
                                        {config.message_content && (
                                            <div className="text-[#dbdee1] mb-2 whitespace-pre-wrap">{config.message_content}</div>
                                        )}

                                        {/* Embed */}
                                        <div className="bg-[#2B2D31] rounded-[4px] border-l-4 overflow-hidden max-w-[520px]" style={{ borderLeftColor: config.embed_color }}>
                                            <div className="p-4">
                                                {config.embed_author_name && (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {config.embed_author_icon && <img src={config.embed_author_icon} alt="" className="w-6 h-6 rounded-full" />}
                                                        <span className="text-xs font-bold text-white hover:underline cursor-pointer">{config.embed_author_name}</span>
                                                    </div>
                                                )}
                                                <div className="flex gap-4">
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        {config.embed_title && <div className="font-bold text-white text-base">{config.embed_title}</div>}
                                                        {config.embed_description && <div className="text-sm text-[#dbdee1] whitespace-pre-wrap">{config.embed_description}</div>}
                                                    </div>
                                                    {config.embed_thumbnail && (
                                                        <div className="shrink-0 w-20 h-20 rounded-[4px] overflow-hidden">
                                                            <img src={config.embed_thumbnail} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                                {config.embed_image && (
                                                    <div className="mt-4 rounded-[4px] overflow-hidden border border-[#1e1f22]">
                                                        <img src={config.embed_image} alt="" className="w-full max-h-[300px] object-cover" />
                                                    </div>
                                                )}
                                                {config.embed_footer_text && (
                                                    <div className="flex items-center gap-2 mt-4">
                                                        {config.embed_footer_icon && <img src={config.embed_footer_icon} alt="" className="w-5 h-5 rounded-full" />}
                                                        <span className="text-[12px] text-[#b5bac1] font-medium">{config.embed_footer_text}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Interaction Button */}
                                        <div className="mt-2 flex gap-2">
                                            <div className={`px-4 py-1.5 rounded-[3px] text-sm font-medium transition flex items-center gap-2 min-h-[32px]
                                                ${BUTTON_STYLES.find(s => s.value === config.button_style)?.color || 'bg-[#5865F2]'} text-white`}>
                                                <EmojiRenderer emoji={config.button_emoji} />
                                                <span>{config.button_label || 'Open Form'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-xs text-[#949ba4] text-center pt-8 italic">
                                Note: This is a preview. The actual message in Discord will match this layout.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
