"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import EmojiPicker from "./EmojiPicker";
import CustomDropdown from "./CustomDropdown";
import {
    ReactionRoleMessage,
    Channel,
    Role,
    EmbedData,
    Component,
    SelectOption,
    BotAction
} from "../types";

// --- Placeholder Variables Data ---
const PLACEHOLDER_VARIABLES = [
    // User Variables
    { category: 'User', variable: '{user}', description: 'Mention user (@User)', preview: '@User' },
    { category: 'User', variable: '{user.name}', description: 'Username (tanpa mention)', preview: 'Username' },
    { category: 'User', variable: '{user.id}', description: 'ID user', preview: '123456789' },
    { category: 'User', variable: '{user.tag}', description: 'Username dengan discriminator', preview: 'User#0001' },
    { category: 'User', variable: '{user.avatar}', description: 'URL avatar user', preview: '🐔' },
    { category: 'User', variable: '{user.created}', description: 'Tanggal akun dibuat', preview: '1 Jan 2020' },
    { category: 'User', variable: '{user.joined}', description: 'Tanggal join server', preview: '15 Mar 2023' },
    // Server Variables
    { category: 'Server', variable: '{server}', description: 'Nama server', preview: 'Server Name' },
    { category: 'Server', variable: '{server.id}', description: 'ID server', preview: '987654321' },
    { category: 'Server', variable: '{server.icon}', description: 'URL icon server', preview: '🏠' },
    { category: 'Server', variable: '{server.members}', description: 'Jumlah total member', preview: '1,234' },
    { category: 'Server', variable: '{server.online}', description: 'Jumlah member online', preview: '567' },
    { category: 'Server', variable: '{server.boosts}', description: 'Jumlah boost server', preview: '14' },
    { category: 'Server', variable: '{server.level}', description: 'Level boost server', preview: '2' },
    // Role Variables
    { category: 'Role', variable: '{role}', description: 'Nama role (untuk role messages)', preview: 'Role Name' },
    { category: 'Role', variable: '{role.id}', description: 'ID role', preview: '111222333' },
    { category: 'Role', variable: '{role.mention}', description: 'Mention role (@Role)', preview: '@Role' },
    { category: 'Role', variable: '{role.color}', description: 'Warna role (hex)', preview: '#FF5733' },
    // Channel Variables
    { category: 'Channel', variable: '{channel}', description: 'Nama channel saat ini', preview: '#general' },
    { category: 'Channel', variable: '{channel.id}', description: 'ID channel', preview: '444555666' },
    { category: 'Channel', variable: '{channel.mention}', description: 'Mention channel', preview: '#channel' },
    // Date/Time Variables
    { category: 'Date', variable: '{date}', description: 'Tanggal hari ini', preview: '16 Dec 2024' },
    { category: 'Date', variable: '{time}', description: 'Waktu saat ini', preview: '21:19' },
    { category: 'Date', variable: '{datetime}', description: 'Tanggal dan waktu lengkap', preview: '16 Dec 2024, 21:19' },
    // Counter Variables
    { category: 'Counter', variable: '{count}', description: 'Nomor urut member (join count)', preview: '1234' },
    { category: 'Counter', variable: '{count.ordinal}', description: 'Nomor urut dengan suffix', preview: '1234th' },
];

// Variables Section Component (Accordion Style)
const VariablesSection = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copiedVar, setCopiedVar] = useState<string | null>(null);

    const categories = [...new Set(PLACEHOLDER_VARIABLES.map(v => v.category))];

    const filteredVariables = PLACEHOLDER_VARIABLES.filter(v => {
        const matchesSearch = v.variable.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || v.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categoryColors: Record<string, string> = {
        'User': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        'Server': 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
        'Role': 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
        'Channel': 'bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100',
        'Date': 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200',
        'Counter': 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
    };

    const categoryIcons: Record<string, string> = {
        'User': '👤',
        'Server': '🏠',
        'Role': '🎭',
        'Channel': '💬',
        'Date': '📅',
        'Counter': '🔢',
    };

    const handleCopy = (variable: string) => {
        navigator.clipboard.writeText(variable);
        setCopiedVar(variable);
        setTimeout(() => setCopiedVar(null), 1500);
    };

    // Group by category
    const groupedVariables = categories.reduce((acc, cat) => {
        acc[cat] = filteredVariables.filter(v => v.category === cat);
        return acc;
    }, {} as Record<string, typeof PLACEHOLDER_VARIABLES>);

    return (
        <div className="space-y-4">
            {/* Tip Banner */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                        <p className="font-bold text-amber-400 text-sm">Cara Menggunakan Variables</p>
                        <p className="text-gray-400 text-xs mt-1">
                            Klik variable untuk menyalin, lalu paste di Message Content, Embed Title, Description, atau Footer.
                        </p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                <input
                    type="text"
                    placeholder="Cari variable..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-amber-500/50 transition text-white"
                />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${!selectedCategory
                        ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:border-amber-500/30'
                        }`}
                >
                    Semua ({PLACEHOLDER_VARIABLES.length})
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition border flex items-center gap-1.5 ${selectedCategory === cat
                            ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                            : 'bg-white/5 text-gray-300 border-white/10 hover:border-amber-500/30'
                            }`}
                    >
                        <span>{categoryIcons[cat]}</span>
                        <span>{cat}</span>
                        <span className="opacity-60">({PLACEHOLDER_VARIABLES.filter(v => v.category === cat).length})</span>
                    </button>
                ))}
            </div>

            {/* Variables Grid */}
            {filteredVariables.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                    <span className="text-3xl block mb-2">🔍</span>
                    <p className="text-sm">Tidak ada variable yang cocok dengan pencarian.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {categories.map(cat => {
                        const catVars = groupedVariables[cat];
                        if (catVars.length === 0) return null;

                        return (
                            <div key={cat} className="bg-[#16161f] rounded-xl border border-white/10 overflow-hidden">
                                {/* Category Header */}
                                <div className="px-4 py-2.5 border-b border-white/10 bg-white/5 flex items-center gap-2">
                                    <span>{categoryIcons[cat]}</span>
                                    <span className="font-bold text-sm text-white">{cat} Variables</span>
                                    <span className="text-xs text-gray-500 ml-auto">{catVars.length} items</span>
                                </div>

                                {/* Variables List */}
                                <div className="divide-y divide-white/5">
                                    {catVars.map((v, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleCopy(v.variable)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition group flex items-center gap-4"
                                        >
                                            {/* Variable Code */}
                                            <div className="flex-1">
                                                <code className="text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                                    {v.variable}
                                                </code>
                                                <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                                            </div>

                                            {/* Preview */}
                                            <div className="text-xs text-gray-500 bg-white/5 px-2.5 py-1 rounded font-medium">
                                                → {v.preview}
                                            </div>

                                            {/* Copy Indicator */}
                                            <div className={`text-xs font-bold transition-all ${copiedVar === v.variable
                                                ? 'text-green-400 opacity-100'
                                                : 'text-gray-500 opacity-0 group-hover:opacity-100'
                                                }`}>
                                                {copiedVar === v.variable ? '✓ Copied!' : '📋 Copy'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- Helper Components ---

const AccordionItem = ({ title, children, isOpen, onToggle, extraActions }: { title: React.ReactNode, children: React.ReactNode, isOpen: boolean, onToggle: () => void, extraActions?: React.ReactNode }) => (
    <div className="border border-white/10 rounded-xl bg-[#16161f] overflow-hidden shadow-sm transition-all duration-200">
        <div
            className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition select-none"
            onClick={onToggle}
        >
            <div className="flex items-center gap-3 font-bold text-white">
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                {title}
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {extraActions}
            </div>
        </div>
        {isOpen && (
            <div className="p-4 border-t border-white/10 animate-slide-down">
                {children}
            </div>
        )}
    </div>

);

// --- Emoji Renderer ---
const renderEmoji = (emoji: string) => {
    if (!emoji) return null;
    // Check for custom emoji format <:name:id> or <a:name:id>
    const customMatch = emoji.match(/<(a?):(\w+):(\d+)>/);
    if (customMatch) {
        const [_, animated, name, id] = customMatch;
        const ext = animated ? 'gif' : 'png';
        return (
            <img
                src={`https://cdn.discordapp.com/emojis/${id}.${ext}`}
                alt={name}
                className="w-5 h-5 object-contain inline-block"
                title={`:${name}:`}
            />
        );
    }
    // Standard unicode emoji
    return <span className="inline-block">{emoji}</span>;
};

// --- Embed Editor Component ---

const EmbedEditor = ({ embed, onChange, onDelete, index }: { embed: EmbedData, onChange: (updates: Partial<EmbedData>) => void, onDelete: () => void, index: number }) => {
    const [activeTab, setActiveTab] = useState<'body' | 'author' | 'fields' | 'footer' | 'images'>('body');

    return (
        <div className="bg-[#16161f] rounded-xl border border-white/10 overflow-hidden shadow-sm">
            {/* Embed Header */}
            <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
                <div className="font-bold text-sm text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: embed.color || '#FFD700' }}></span>
                    Embed #{index + 1}
                </div>
                <button onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1 rounded text-xs font-bold transition">
                    🗑️ Delete Embed
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white/5 border-b border-white/10 overflow-x-auto no-scrollbar">
                {(['body', 'author', 'fields', 'footer', 'images'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition border-b-2 flex-shrink-0 ${activeTab === tab ? 'text-amber-400 border-amber-500 bg-amber-500/10' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 space-y-4">
                {activeTab === 'body' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                            <input
                                value={embed.title}
                                onChange={e => onChange({ title: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none transition text-white"
                                placeholder="Embed Title"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                            <textarea
                                value={embed.description}
                                onChange={e => onChange({ description: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none h-24 resize-y transition text-white"
                                placeholder="Embed Description"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Title URL</label>
                                <input
                                    value={embed.url || ''}
                                    onChange={e => onChange({ url: e.target.value })}
                                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none transition text-white"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Color</label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={embed.color || '#FFD700'}
                                        onChange={e => onChange({ color: e.target.value })}
                                        className="h-10 w-12 rounded cursor-pointer border-0 p-0 flex-shrink-0"
                                    />
                                    <input
                                        value={embed.color || '#FFD700'}
                                        onChange={e => onChange({ color: e.target.value })}
                                        className="flex-1 min-w-0 p-2 bg-white/5 border border-white/10 rounded-lg uppercase text-sm text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'author' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Author Name</label>
                            <input
                                value={embed.author_name}
                                onChange={e => onChange({ author_name: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="Author Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Author URL</label>
                            <input
                                value={embed.author_url || ''}
                                onChange={e => onChange({ author_url: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Author Icon URL</label>
                            <input
                                value={embed.author_icon_url}
                                onChange={e => onChange({ author_icon_url: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {activeTab === 'fields' && (
                    <div className="space-y-3">
                        {embed.fields.map((field, idx) => (
                            <div key={idx} className="flex gap-2 items-start bg-white/5 p-3 rounded-lg border border-white/10 shadow-sm">
                                <span className="text-xs font-bold text-gray-500 mt-2">#{idx + 1}</span>
                                <div className="flex-1 space-y-2">
                                    <input
                                        value={field.name}
                                        onChange={e => {
                                            const newFields = [...embed.fields];
                                            newFields[idx].name = e.target.value;
                                            onChange({ fields: newFields });
                                        }}
                                        className="w-full p-1.5 text-sm bg-white/5 border border-white/10 rounded focus:border-amber-500/50 outline-none font-bold text-white"
                                        placeholder="Field Name"
                                    />
                                    <textarea
                                        value={field.value}
                                        onChange={e => {
                                            const newFields = [...embed.fields];
                                            newFields[idx].value = e.target.value;
                                            onChange({ fields: newFields });
                                        }}
                                        className="w-full p-1.5 text-sm bg-white/5 border border-white/10 rounded focus:border-amber-500/50 outline-none resize-none h-16 text-white"
                                        placeholder="Field Value"
                                    />
                                    <label className="flex items-center gap-2 text-xs text-gray-400 font-bold cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={field.inline}
                                            onChange={e => {
                                                const newFields = [...embed.fields];
                                                newFields[idx].inline = e.target.checked;
                                                onChange({ fields: newFields });
                                            }}
                                            className="rounded text-amber-500 focus:ring-amber-400"
                                        />
                                        Inline
                                    </label>
                                </div>
                                <button
                                    onClick={() => onChange({ fields: embed.fields.filter((_, i) => i !== idx) })}
                                    className="text-gray-500 hover:text-red-400 px-2"
                                    title="Remove Field"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => onChange({ fields: [...embed.fields, { name: '', value: '', inline: false }] })}
                            className="w-full py-2 border-2 border-dashed border-white/20 text-gray-500 font-bold rounded-lg hover:border-amber-500/50 hover:text-amber-400 transition"
                        >
                            + Add Field
                        </button>
                    </div>
                )}

                {activeTab === 'footer' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Footer Text</label>
                            <input
                                value={embed.footer_text}
                                onChange={e => onChange({ footer_text: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="Footer Text"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Footer Icon URL</label>
                            <input
                                value={embed.footer_icon_url}
                                onChange={e => onChange({ footer_icon_url: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {activeTab === 'images' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Image URL (Large)</label>
                            <input
                                value={embed.image_url}
                                onChange={e => onChange({ image_url: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Thumbnail URL (Small)</label>
                            <input
                                value={embed.thumbnail_url}
                                onChange={e => onChange({ thumbnail_url: e.target.value })}
                                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-white"
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Action Components ---

const ActionEditor = ({
    action,
    onChange,
    onDelete,
    roles,
    channels,
    index
}: {
    action: BotAction,
    onChange: (updates: Partial<BotAction>) => void,
    onDelete: () => void,
    roles: Role[],
    channels: Channel[],
    index: number
}) => {
    return (
        <div className="bg-white/5 p-3 rounded-lg border border-white/10 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onDelete} className="text-gray-500 hover:text-red-400 font-bold p-1">×</button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Action #{index + 1}</label>
                    <CustomDropdown
                        value={action.type || ''}
                        onChange={(value) => onChange({ type: value })}
                        placeholder="Select Action Type..."
                        options={[
                            { value: 'add_role', label: 'Add Role', icon: '➕' },
                            { value: 'remove_role', label: 'Remove Role', icon: '➖' },
                            { value: 'toggle_role', label: 'Toggle Role', icon: '🔄' },
                            { value: 'send_message', label: 'Send Message (Reply)', icon: '💬' },
                            { value: 'send_message_channel', label: 'Send Message to Channel', icon: '📢' },
                            { value: 'dm_user', label: 'DM User', icon: '✉️' },
                            { value: 'move_voice', label: 'Move User to Voice Channel', icon: '🔊' },
                        ]}
                    />
                </div>

                {/* Role Selector for Role Actions */}
                {['add_role', 'remove_role', 'toggle_role', 'set_role'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Target Role</label>
                        <CustomDropdown
                            value={action.role_id || ''}
                            onChange={(value) => onChange({ role_id: value })}
                            placeholder="Select Role..."
                            options={roles.map(r => ({ value: r.id, label: r.name }))}
                        />
                    </div>
                )}

                {/* Message Content for Message Actions */}
                {['send_message', 'send_message_channel', 'dm_user'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Message Content</label>
                        <textarea
                            value={action.message_content || ''}
                            onChange={(e) => onChange({ message_content: e.target.value })}
                            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-amber-500/50 text-sm text-white h-20 resize-y"
                            placeholder="Type your message here..."
                        />
                    </div>
                )}

                {/* Channel Selector for Channel Actions */}
                {['send_message_channel', 'move_voice'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Target Channel</label>
                        <CustomDropdown
                            value={action.target_channel_id || ''}
                            onChange={(value) => onChange({ target_channel_id: value })}
                            placeholder="Select Channel..."
                            options={channels.map(c => ({ value: c.id, label: `#${c.name}` }))}
                        />
                    </div>
                )}

                {/* Custom Success/Failure Messages */}
                {action.type && action.type !== '' && (
                    <div className="space-y-3 pt-2 border-t border-white/10">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Success Message (Optional)</label>
                            <input
                                value={action.success_message || ''}
                                onChange={(e) => onChange({ success_message: e.target.value })}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-green-500/50 text-sm placeholder-gray-600 text-white"
                                placeholder="e.g. Role added successfully!"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Failure Message (Optional)</label>
                            <input
                                value={action.failure_message || ''}
                                onChange={(e) => onChange({ failure_message: e.target.value })}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-red-500/50 text-sm placeholder-gray-600 text-white"
                                placeholder="e.g. Failed to add role."
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ActionManager = ({
    actions,
    onChange,
    roles,
    channels
}: {
    actions: BotAction[],
    onChange: (actions: BotAction[]) => void,
    roles: Role[],
    channels: Channel[]
}) => {
    const addAction = () => {
        onChange([...actions, { type: 'add_role' }]); // Default to Add Role
    };

    const updateAction = (index: number, updates: Partial<BotAction>) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        onChange(newActions);
    };

    const removeAction = (index: number) => {
        const newActions = actions.filter((_, i) => i !== index);
        onChange(newActions);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-300">Actions ({actions.length})</label>
                <button
                    onClick={addAction}
                    disabled={actions.length >= 5}
                    className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    + Add Action
                </button>
            </div>

            <div className="space-y-3">
                {actions.map((action, i) => (
                    <ActionEditor
                        key={i}
                        index={i}
                        action={action}
                        onChange={(updates) => updateAction(i, updates)}
                        onDelete={() => removeAction(i)}
                        roles={roles}
                        channels={channels}
                    />
                ))}
                {actions.length === 0 && (
                    <div className="text-center p-4 border-2 border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                        No actions configured. Click "Add Action" to start.
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Notification Toast Component ---

const NotificationToast = ({
    notification,
    onClose
}: {
    notification: { type: 'success' | 'error', message: string } | null,
    onClose: () => void
}) => {
    if (!notification) return null;

    return (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-[10000] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-bounce-in
            ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
        `}>
            <span className="font-bold text-xl">
                {notification.type === 'success' ? '✓' : '⚠'}
            </span>
            <span className="font-bold text-base">{notification.message}</span>
            <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full transition">✕</button>
        </div>
    );
};

// --- Main Modal Component ---

interface CreateMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMessage: ReactionRoleMessage | null;
    isEditing: boolean;
    channels: Channel[];
    roles: Role[];
    guildId?: string;
    onSave: (message: ReactionRoleMessage, channelId: string) => Promise<void>;
}

export default function CreateMessageModal({
    isOpen,
    onClose,
    initialMessage,
    isEditing,
    channels,
    roles,
    onSave,
    guildId,
    saveLabel = "Send Message",
    disableChannelSelect = false
}: CreateMessageModalProps & { saveLabel?: string; disableChannelSelect?: boolean }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const createDefaultEmbed = (): EmbedData => ({
        author_name: '', author_icon_url: '', title: 'New Embed', description: 'Description here...',
        color: '#FFD700', thumbnail_url: '', image_url: '', footer_text: '', footer_icon_url: '', fields: []
    });

    const createDefaultMessage = (): ReactionRoleMessage => ({
        message_id: null, channel_id: '', message_content: '', embeds: [createDefaultEmbed()], component_rows: []
    });

    // Editor State
    const [editingMsg, setEditingMsgInternal] = useState<ReactionRoleMessage>(createDefaultMessage());
    const [targetChannel, setTargetChannel] = useState<string>("");

    // History State for Undo/Redo
    const [history, setHistory] = useState<ReactionRoleMessage[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const MAX_HISTORY = 50;

    // Import/Export Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importError, setImportError] = useState<string | null>(null);

    // UI State for Editor
    const [openSections, setOpenSections] = useState<string[]>(['content', 'embeds', 'components']);
    const [sending, setSending] = useState(false);

    // Component Editor State
    const [activeComponent, setActiveComponent] = useState<{ row: number, col: number } | null>(null);
    const [compSettings, setCompSettings] = useState<Component | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Mobile view state
    const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

    // Wrapper for setEditingMsg - simplified version without complex history in setter
    const setEditingMsg = (newMsg: ReactionRoleMessage | ((prev: ReactionRoleMessage) => ReactionRoleMessage)) => {
        setEditingMsgInternal(prev => {
            const safePrev = prev || createDefaultMessage();
            if (typeof newMsg === 'function') {
                return newMsg(safePrev) || safePrev;
            }
            return newMsg || safePrev;
        });
    };

    // Track history with useEffect (debounced)
    const historyTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!editingMsg || !isOpen) return;

        // Debounce history tracking - only save after 500ms of no changes
        if (historyTimeout.current) {
            clearTimeout(historyTimeout.current);
        }

        historyTimeout.current = setTimeout(() => {
            const lastHistory = history[historyIndex];
            if (!lastHistory || JSON.stringify(lastHistory) !== JSON.stringify(editingMsg)) {
                // Only add if different from last history entry
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(JSON.parse(JSON.stringify(editingMsg)));

                if (newHistory.length > MAX_HISTORY) {
                    newHistory.shift();
                }

                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
        }, 500);

        return () => {
            if (historyTimeout.current) {
                clearTimeout(historyTimeout.current);
            }
        };
    }, [editingMsg, isOpen]);

    // Undo function
    const undo = () => {
        if (historyIndex > 0 && history[historyIndex - 1]) {
            const prevState = JSON.parse(JSON.stringify(history[historyIndex - 1]));
            setHistoryIndex(historyIndex - 1);
            setEditingMsgInternal(prevState);
            setNotification({ type: 'success', message: '↩️ Undo!' });
            setTimeout(() => setNotification(null), 1000);
        }
    };

    // Redo function
    const redo = () => {
        if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
            const nextState = JSON.parse(JSON.stringify(history[historyIndex + 1]));
            setHistoryIndex(historyIndex + 1);
            setEditingMsgInternal(nextState);
            setNotification({ type: 'success', message: '↪️ Redo!' });
            setTimeout(() => setNotification(null), 1000);
        }
    };

    // Keyboard shortcuts
    useKeyboardShortcuts([
        { key: 'Escape', handler: onClose, description: 'Close modal' },
        { key: 'z', ctrl: true, handler: undo, description: 'Undo' },
        { key: 'y', ctrl: true, handler: redo, description: 'Redo' },
    ], { enabled: isOpen });

    // Export to JSON
    const exportToJson = () => {
        if (!editingMsg) return;
        const jsonData = JSON.stringify(editingMsg, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `message-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setNotification({ type: 'success', message: '📥 JSON exported!' });
        setTimeout(() => setNotification(null), 2000);
    };

    // Import from JSON - supports both internal format and Discord API format
    const importFromJson = () => {
        try {
            const parsed = JSON.parse(importJson);

            // Validate structure
            if (typeof parsed !== 'object') {
                throw new Error('Invalid JSON structure');
            }

            // Convert Discord API format to internal format
            let componentRows: Component[][] = [];

            // Check for Discord API format (components with action rows)
            if (Array.isArray(parsed.components)) {
                componentRows = parsed.components.map((actionRow: any) => {
                    // Each action row has type: 1 and contains components
                    if (actionRow.type === 1 && Array.isArray(actionRow.components)) {
                        return actionRow.components.map((comp: any) => {
                            // Convert emoji format from Discord API format
                            let emoji = '';
                            if (comp.emoji) {
                                if (comp.emoji.id) {
                                    emoji = `<:${comp.emoji.name}:${comp.emoji.id}>`;
                                } else if (comp.emoji.name) {
                                    emoji = comp.emoji.name;
                                }
                            }

                            // Convert select menu options
                            let options = comp.options?.map((opt: any) => {
                                let optEmoji = '';
                                if (opt.emoji) {
                                    if (opt.emoji.id) {
                                        optEmoji = `<:${opt.emoji.name}:${opt.emoji.id}>`;
                                    } else if (opt.emoji.name) {
                                        optEmoji = opt.emoji.name;
                                    }
                                }
                                return {
                                    label: opt.label || '',
                                    value: opt.value || '',
                                    description: opt.description || '',
                                    emoji: optEmoji,
                                    actions: opt.actions || []
                                };
                            }) || [];

                            return {
                                type: comp.type, // 2 = button, 3 = select menu
                                style: comp.style || 1,
                                label: comp.label || '',
                                emoji: emoji,
                                custom_id: comp.custom_id || `comp_${Date.now()}`,
                                placeholder: comp.placeholder || '',
                                min_values: comp.min_values || 0,
                                max_values: comp.max_values || 1,
                                options: options,
                                actions: comp.actions || []
                            };
                        });
                    }
                    return [];
                });
            } else if (Array.isArray(parsed.component_rows)) {
                // Internal format
                componentRows = parsed.component_rows;
            }

            // Convert embeds from Discord API format
            let embeds = [];
            if (Array.isArray(parsed.embeds)) {
                embeds = parsed.embeds.map((embed: any) => ({
                    author_name: embed.author?.name || '',
                    author_icon_url: embed.author?.icon_url || '',
                    title: embed.title || '',
                    description: embed.description || '',
                    color: embed.color ? `#${embed.color.toString(16).padStart(6, '0')}` : '#FFD700',
                    url: embed.url || '',
                    thumbnail_url: embed.thumbnail?.url || '',
                    image_url: embed.image?.url || '',
                    footer_text: embed.footer?.text || '',
                    footer_icon_url: embed.footer?.icon_url || '',
                    fields: embed.fields || []
                }));
            }

            // Create a valid message from the import
            const importedMsg: ReactionRoleMessage = {
                message_id: parsed.message_id || null,
                channel_id: parsed.channel_id || '',
                message_content: parsed.message_content || parsed.content || '',
                embeds: embeds,
                component_rows: componentRows
            };

            // Reset any active editing states
            setActiveComponent(null);
            setCompSettings(null);

            // Update the message state
            setEditingMsgInternal(importedMsg);
            setShowImportModal(false);
            setImportJson('');
            setImportError(null);
            setNotification({ type: 'success', message: '📤 JSON imported successfully! All components loaded.' });
            setTimeout(() => setNotification(null), 3000);
        } catch (e: any) {
            setImportError(e.message || 'Invalid JSON format');
        }
    };

    // Handle file upload for import
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setImportJson(content);
                setImportError(null);
            };
            reader.readAsText(file);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (initialMessage) {
                setEditingMsgInternal(initialMessage);
            } else {
                setEditingMsgInternal(createDefaultMessage());
            }
            setTargetChannel(initialMessage?.channel_id || "");
            setOpenSections(['content', 'embeds', 'components']);
            setActiveComponent(null);
            setCompSettings(null);
            // Reset history when modal opens
            setHistory([]);
            setHistoryIndex(-1);
        }
    }, [isOpen, initialMessage]);

    // Internal Functions
    const toggleSection = (id: string) => {
        if (openSections.includes(id)) {
            setOpenSections(openSections.filter(s => s !== id));
        } else {
            setOpenSections([...openSections, id]);
        }
    };

    const handleSendMessage = async () => {
        if (!targetChannel) {
            setNotification({ type: 'error', message: 'Please select a channel!' });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        setSending(true);
        try {
            await onSave(editingMsg, targetChannel);
            setNotification({ type: 'success', message: 'Message sent successfully!' });
            setTimeout(() => {
                setNotification(null);
                onClose(); // Optional: Close modal on success
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Failed to send message.' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setSending(false);
        }
    };

    // --- Component Helpers ---
    const addComponentRow = () => {
        if ((editingMsg.component_rows || []).length >= 5) return;
        setEditingMsg({ ...editingMsg, component_rows: [...(editingMsg.component_rows || []), []] });
    };

    const addComponentData = (rowIndex: number, type: 'button' | 'select_menu') => {
        const rows = [...(editingMsg.component_rows || [])];
        const currentRow = rows[rowIndex];

        // Validation
        if (type === 'select_menu') {
            if (currentRow.length > 0) {
                alert("Select Menus must be on their own row. Add a new row.");
                return;
            }
        } else {
            // Button
            if (currentRow.some(c => c.type === 3)) {
                alert("Cannot add buttons to a Select Menu row.");
                return;
            }
            if (currentRow.length >= 5) {
                alert("Max 5 buttons per row.");
                return;
            }
        }

        const newComponent: Component = type === 'button'
            ? { type: 2, style: 1, label: 'Button', custom_id: `btn_${Date.now()}` }
            : { type: 3, placeholder: 'Select Option...', custom_id: `menu_${Date.now()}`, options: [], min_values: 0, max_values: 1 };

        rows[rowIndex] = [...currentRow, newComponent];
        setEditingMsg({ ...editingMsg, component_rows: rows });
    };

    const removeComponent = (rowIndex: number, compIdx: number) => {
        const rows = [...(editingMsg.component_rows || [])];
        rows[rowIndex] = rows[rowIndex].filter((_: Component, i: number) => i !== compIdx);
        // If row empty, REMOVE THE ROW
        if (rows[rowIndex].length === 0) {
            rows.splice(rowIndex, 1);
        }
        setEditingMsg({ ...editingMsg, component_rows: rows });
    };

    const saveCompSettings = (updates: Partial<Component>) => {
        if (!activeComponent || !compSettings) return;
        const rows = [...(editingMsg.component_rows || [])];
        rows[activeComponent.row] = rows[activeComponent.row].map((c: Component, i: number) =>
            i === activeComponent.col ? { ...c, ...updates } : c
        );
        setEditingMsg({ ...editingMsg, component_rows: rows });
        setCompSettings({ ...compSettings, ...updates });
    };

    // --- Preview Renderer ---
    const preview = (text: string) => {
        if (!text) return '';
        return text
            // User Variables
            .replace(/{user}/g, '@User')
            .replace(/{user\.name}/g, 'Username')
            .replace(/{user\.id}/g, '123456789')
            .replace(/{user\.tag}/g, 'User#0001')
            .replace(/{user\.created}/g, '1 Jan 2020')
            .replace(/{user\.joined}/g, '15 Mar 2023')
            // Server Variables
            .replace(/{server}/g, 'Server Name')
            .replace(/{server\.id}/g, '987654321')
            .replace(/{server\.members}/g, '1,234')
            .replace(/{server\.online}/g, '567')
            .replace(/{server\.boosts}/g, '14')
            .replace(/{server\.level}/g, '2')
            // Role Variables
            .replace(/{role}/g, 'Role Name')
            .replace(/{role\.id}/g, '111222333')
            .replace(/{role\.mention}/g, '@Role')
            .replace(/{role\.color}/g, '#FF5733')
            // Channel Variables
            .replace(/{channel}/g, '#general')
            .replace(/{channel\.id}/g, '444555666')
            .replace(/{channel\.mention}/g, '#channel')
            // Date/Time Variables
            .replace(/{date}/g, new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }))
            .replace(/{time}/g, new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
            .replace(/{datetime}/g, new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
            // Counter Variables
            .replace(/{count}/g, '1234')
            .replace(/{count\.ordinal}/g, '1234th');
    };

    const PreviewImage = ({ src, className, alt = "" }: { src: string, className?: string, alt?: string }) => {
        if (!src) return null;

        // Check for variables
        if (src.includes('{user.avatar}')) {
            return (
                <div className={`${className} bg-amber-200 flex items-center justify-center text-stone-500 overflow-hidden`}>
                    <span className="text-2xl">🐔</span>
                </div>
            );
        }
        if (src.includes('{server.icon}')) {
            return (
                <div className={`${className} bg-indigo-200 flex items-center justify-center text-indigo-500 overflow-hidden`}>
                    <span className="font-bold text-xs">SRV</span>
                </div>
            );
        }

        // If it's a variable but not one we know specifically, show generic
        if (src.includes('{')) {
            return (
                <div className={`${className} bg-stone-200 flex items-center justify-center text-stone-400 overflow-hidden`}>
                    <span className="font-bold text-[10px]">{src}</span>
                </div>
            );
        }

        return <img src={src} className={className} alt={alt} />;
    };

    const renderPreview = () => {
        return (
            <div className="bg-[#313338] rounded-md shadow-sm font-sans text-white text-[15px] leading-[1.375rem] overflow-hidden">
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-lg select-none">🐔</div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium hover:underline cursor-pointer">Don Pollo</span>
                            <span className="bg-[#5865F2] text-[10px] px-1.5 rounded-[3px] py-[0.5px] font-medium leading-[1.2]">APP</span>
                            <span className="text-xs text-[#949BA4] ml-1">Today at 4:20 PM</span>
                        </div>
                    </div>
                    <div className="pl-[3.25rem]">
                        {editingMsg.message_content && (
                            <div className="whitespace-pre-wrap text-[#DBDEE1] mb-2">{preview(editingMsg.message_content)}</div>
                        )}

                        <div className="space-y-2">
                            {editingMsg.embeds.map((e, i) => (
                                <div key={i} className="bg-[#2B2D31] rounded max-w-[520px] overflow-hidden" style={{ borderLeft: `4px solid ${e.color || '#202225'}` }}>
                                    <div className="flex">
                                        {/* Main Content */}
                                        <div className="flex-1 p-4 space-y-2 min-w-0">
                                            {/* Author - clickable if author_url exists */}
                                            {(e.author_name) && (
                                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                    {e.author_icon_url && <PreviewImage src={e.author_icon_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />}
                                                    {e.author_url ? (
                                                        <a
                                                            href={e.author_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="truncate hover:underline"
                                                            onClick={(ev) => ev.stopPropagation()}
                                                        >
                                                            {preview(e.author_name)}
                                                        </a>
                                                    ) : (
                                                        <span className="truncate">{preview(e.author_name)}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Title - clickable if url exists */}
                                            {e.title && (
                                                e.url ? (
                                                    <a
                                                        href={e.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-semibold text-[#00AFF4] hover:underline block"
                                                        onClick={(ev) => ev.stopPropagation()}
                                                    >
                                                        {preview(e.title)}
                                                    </a>
                                                ) : (
                                                    <div className="font-semibold text-white">{preview(e.title)}</div>
                                                )
                                            )}

                                            {e.description && <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap break-words">{preview(e.description)}</div>}

                                            {/* Fields - Proper 3 column grid for inline fields */}
                                            {e.fields && e.fields.length > 0 && (
                                                <div className="grid gap-2 mt-2" style={{
                                                    gridTemplateColumns: 'repeat(3, 1fr)'
                                                }}>
                                                    {e.fields.map((field, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={field.inline ? '' : 'col-span-3'}
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            <div className="font-semibold text-xs text-white mb-0.5 break-words">{field.name}</div>
                                                            <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap break-words">{field.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Large Image */}
                                            {e.image_url && (
                                                <div className="mt-3">
                                                    <PreviewImage src={e.image_url} className="rounded max-w-full max-h-[300px] object-cover" />
                                                </div>
                                            )}

                                            {/* Footer */}
                                            {(e.footer_text || e.footer_icon_url) && (
                                                <div className="flex items-center gap-2 text-xs text-[#949BA4] pt-1">
                                                    {e.footer_icon_url && <PreviewImage src={e.footer_icon_url} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />}
                                                    <span>{preview(e.footer_text)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Thumbnail - Right side */}
                                        {e.thumbnail_url && (
                                            <div className="flex-shrink-0 p-4 pl-0">
                                                <PreviewImage src={e.thumbnail_url} className="w-20 h-20 rounded object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(editingMsg.component_rows || []).length > 0 && (
                            <div className="space-y-2 mt-2">
                                {editingMsg.component_rows!.map((row, i) => (
                                    <div key={i} className="flex flex-wrap gap-2">
                                        {row.map((comp: Component, j: number) => (
                                            <div key={j} className={`px-4 py-2 rounded-[3px] text-sm font-medium transition-opacity hover:opacity-80 flex items-center gap-1.5 min-h-[32px]
                                                ${comp.style === 5 ? 'bg-[#4F545C] text-white' :
                                                    comp.style === 2 ? 'bg-[#4F545C] text-white' :
                                                        comp.style === 3 ? 'bg-[#2D7D46] text-white' :
                                                            comp.style === 4 ? 'bg-[#ED4245] text-white' :
                                                                comp.type === 2 ? 'bg-[#5865F2] text-white' :
                                                                    'bg-[#2B2D31] text-[#DBDEE1] border border-[#1e1f22] w-full justify-between'} 
                                            `}>
                                                <div className="flex items-center gap-2">
                                                    {comp.emoji && renderEmoji(comp.emoji)}
                                                    <span>{comp.label || comp.placeholder}</span>
                                                    {/* Link icon for Link buttons */}
                                                    {comp.style === 5 && (
                                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    )}
                                                </div>
                                                {comp.type === 3 && <span className="text-xs">▼</span>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;
    if (!mounted) return null;
    if (!editingMsg) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in">
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />
            <div className="bg-[#16161f] w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 md:border border-white/10 animate-scale-in">

                {/* Top Bar */}
                <div className="bg-[#1a1a24] border-b border-white/10 px-3 md:px-6 py-3 flex flex-col md:flex-row gap-2 md:gap-0 md:justify-between md:items-center shadow-sm z-10 shrink-0">
                    {/* Row 1: Close, Title, Undo/Redo */}
                    <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4">
                        <div className="flex items-center gap-2 md:gap-4">
                            <button onClick={onClose} className="text-xl md:text-2xl text-gray-500 hover:text-gray-300">✕</button>
                            <h2 className="text-base md:text-xl font-black text-white truncate">
                                {isEditing ? 'Edit' : 'Create'}
                            </h2>
                        </div>

                        {/* Undo/Redo Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={undo}
                                disabled={historyIndex < 0}
                                className="p-2 rounded-lg hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Undo (Ctrl+Z)"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-2 rounded-lg hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Redo (Ctrl+Y)"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                                </svg>
                            </button>
                            {historyIndex >= 0 && (
                                <span className="text-xs text-gray-500 ml-1">{historyIndex + 1}/{history.length}</span>
                            )}
                        </div>

                        {/* Import/Export Buttons */}
                        <div className="flex items-center gap-1 border-l border-white/10 pl-4">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-400 hover:bg-white/10 rounded-lg transition"
                                title="Import JSON"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import
                            </button>
                            <button
                                onClick={exportToJson}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-400 hover:bg-white/10 rounded-lg transition"
                                title="Export JSON"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export
                            </button>
                        </div>
                    </div>
                    {/* Row 2: Channel + Save (responsive) */}
                    <div className="flex gap-2 md:gap-3 items-center">
                        {!disableChannelSelect && (
                            <CustomDropdown
                                value={targetChannel}
                                onChange={(val) => setTargetChannel(val)}
                                options={[
                                    { value: '', label: 'Channel...' },
                                    ...channels.map(c => ({ value: c.id, label: `#${c.name}` }))
                                ]}
                                placeholder="Channel..."
                                className="flex-1 md:flex-none md:w-48"
                            />
                        )}
                        <button
                            onClick={handleSendMessage}
                            disabled={sending}
                            className="px-4 md:px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg shadow-md transition disabled:opacity-50 text-sm md:text-base whitespace-nowrap"
                        >
                            {sending ? '...' : saveLabel}
                        </button>
                    </div>
                </div>

                {/* Mobile Tab Toggle */}
                <div className="md:hidden flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setMobileView('editor')}
                        className={`flex-1 py-3 font-bold text-sm transition ${mobileView === 'editor' ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/10' : 'text-gray-500'}`}
                    >
                        ✏️ Editor
                    </button>
                    <button
                        onClick={() => setMobileView('preview')}
                        className={`flex-1 py-3 font-bold text-sm transition ${mobileView === 'preview' ? 'text-amber-400 border-b-2 border-amber-500 bg-amber-500/10' : 'text-gray-500'}`}
                    >
                        👁️ Preview
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT COLUMN: Editor inputs */}
                    <div className={`w-full md:w-1/2 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-4 md:space-y-6 ${mobileView === 'editor' ? 'block' : 'hidden md:block'}`}>

                        {/* 1. Message Content */}
                        <AccordionItem
                            title="Message Content"
                            isOpen={openSections.includes('content')}
                            onToggle={() => toggleSection('content')}
                        >
                            <div className="space-y-3">
                                <textarea
                                    className="w-full h-32 p-3 bg-white/5 border border-white/10 rounded-xl focus:border-amber-500/50 outline-none resize-none text-sm text-white"
                                    placeholder="Message content (above embeds).../
                                    Contoh: Hey {user}, selamat datang di **{server}**!"
                                    value={editingMsg.message_content}
                                    onChange={e => setEditingMsg({ ...editingMsg, message_content: e.target.value })}
                                />
                                {/* Quick Insert Chips */}
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs text-gray-500 mr-1">Quick insert:</span>
                                    {['{user}', '{server}', '{channel}', '{date}'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setEditingMsg({ ...editingMsg, message_content: editingMsg.message_content + v })}
                                            className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-mono rounded border border-amber-500/30 hover:bg-amber-500/20 transition"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </AccordionItem>

                        {/* 2. Embeds */}
                        <AccordionItem
                            title={`Embeds (${editingMsg.embeds.length})`}
                            isOpen={openSections.includes('embeds')}
                            onToggle={() => toggleSection('embeds')}
                            extraActions={
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (editingMsg.embeds.length < 10) {
                                            setEditingMsg({ ...editingMsg, embeds: [...editingMsg.embeds, createDefaultEmbed()] });
                                            if (!openSections.includes('embeds')) toggleSection('embeds');
                                        }
                                    }}
                                    className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded font-bold hover:bg-amber-500/20 transition"
                                >
                                    + Add
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                {editingMsg.embeds.map((embed, i) => (
                                    <EmbedEditor
                                        key={i}
                                        index={i}
                                        embed={embed}
                                        onChange={(updates) => {
                                            const newEmbeds = [...editingMsg.embeds];
                                            newEmbeds[i] = { ...newEmbeds[i], ...updates };
                                            setEditingMsg({ ...editingMsg, embeds: newEmbeds });
                                        }}
                                        onDelete={() => {
                                            const newEmbeds = editingMsg.embeds.filter((_, idx) => idx !== i);
                                            setEditingMsg({ ...editingMsg, embeds: newEmbeds });
                                        }}
                                    />
                                ))}
                                {editingMsg.embeds.length === 0 && <div className="text-center text-gray-500 italic py-4">No embeds added.</div>}
                            </div>
                        </AccordionItem>

                        {/* 3. Components */}
                        <AccordionItem
                            title="Interactive Components"
                            isOpen={openSections.includes('components')}
                            onToggle={() => toggleSection('components')}
                            extraActions={
                                <button
                                    onClick={(e) => { e.stopPropagation(); addComponentRow(); if (!openSections.includes('components')) toggleSection('components'); }}
                                    className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded font-bold hover:bg-indigo-500/20 transition"
                                >
                                    + Row
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                {(editingMsg.component_rows || []).map((row, ri) => (
                                    <div key={ri} className="p-4 bg-white/5 rounded-xl border border-white/10 relative">
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Row {ri + 1}</span>
                                            <button onClick={() => { const rows = [...editingMsg.component_rows!]; rows.splice(ri, 1); setEditingMsg({ ...editingMsg, component_rows: rows }) }} className="text-gray-500 hover:text-red-400 font-bold">×</button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center mt-4">
                                            {row.map((comp, ci) => (
                                                <button
                                                    key={ci}
                                                    onClick={() => { setActiveComponent({ row: ri, col: ci }); setCompSettings(comp); }}
                                                    className={`px-3 py-2 rounded-lg text-sm font-bold border transition flex items-center gap-2 bg-white/10 hover:border-amber-500/50 text-white ${comp.style === 5 ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/20'
                                                        } ${comp.type === 3 ? 'w-full justify-between' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {comp.emoji && renderEmoji(comp.emoji)}
                                                        <span>{comp.label || comp.placeholder}</span>
                                                        {/* Link indicator for Link buttons */}
                                                        {comp.style === 5 && (
                                                            <span className="text-blue-400 text-xs">🔗</span>
                                                        )}
                                                    </div>
                                                    {comp.type === 3 && <span className="text-xs text-gray-500">▼</span>}
                                                </button>
                                            ))}

                                            {/* Add Buttons Logic */}
                                            <div className="flex items-center gap-2">
                                                {(row.length === 0 || (row.length < 5 && !row.some(c => c.type === 3))) && (
                                                    <button
                                                        onClick={() => addComponentData(ri, 'button')}
                                                        className="px-3 py-1.5 rounded-lg border-2 border-dashed border-white/20 text-gray-400 hover:border-amber-500/50 hover:text-amber-400 text-xs font-bold transition"
                                                    >
                                                        + Button
                                                    </button>
                                                )}
                                                {(row.length === 0) && (
                                                    <button
                                                        onClick={() => addComponentData(ri, 'select_menu')}
                                                        className="px-3 py-1.5 rounded-lg border-2 border-dashed border-white/20 text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400 text-xs font-bold transition"
                                                    >
                                                        + Select Menu
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(editingMsg.component_rows || []).length === 0 && <div className="text-center text-gray-500 italic py-2">No components. Add a row to start.</div>}
                            </div>
                        </AccordionItem>

                        {/* 4. Variables Guide */}
                        <AccordionItem
                            title={
                                <div className="flex items-center gap-2">
                                    <span>📝</span>
                                    <span>Variables Guide</span>
                                    <span className="text-xs font-normal text-gray-500">({PLACEHOLDER_VARIABLES.length} variables)</span>
                                </div>
                            }
                            isOpen={openSections.includes('variables')}
                            onToggle={() => toggleSection('variables')}
                        >
                            <VariablesSection />
                        </AccordionItem>

                    </div>

                    {/* RIGHT COLUMN: Live Preview */}
                    <div className={`w-full md:w-1/2 bg-[#2f3136] p-4 md:p-8 overflow-y-auto flex flex-col items-center ${mobileView === 'preview' ? 'block' : 'hidden md:flex'}`}>
                        <h3 className="text-xs font-black text-[#72767d] uppercase tracking-widest mb-4 md:mb-6 select-none">Live Preview</h3>
                        <div className="w-full max-w-[550px] md:scale-95 origin-top">
                            {renderPreview()}
                        </div>
                    </div>
                </div>

                {/* Component Edit Modal Overlay */}
                {activeComponent && compSettings && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-2 md:p-4">
                        <div className="bg-[#1a1a24] rounded-2xl shadow-2xl w-full max-w-[600px] border border-white/10 animate-scale-in max-h-[95vh] md:max-h-[85vh] flex flex-col overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 md:p-6 pb-0 flex-shrink-0">
                                <h3 className="font-bold text-lg text-white">
                                    Edit {compSettings.type === 2 ? 'Button' : 'Select Menu'}
                                </h3>
                                <button
                                    onClick={() => { setActiveComponent(null); setCompSettings(null); }}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                                >
                                    ✕
                                </button>
                            </div>
                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-4">
                                <div className="space-y-4">
                                    {/* Label / Placeholder */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">
                                            {compSettings.type === 2 ? 'Label' : 'Placeholder'}
                                        </label>
                                        <input
                                            value={compSettings.label || compSettings.placeholder || ''}
                                            onChange={(e) => compSettings && saveCompSettings(compSettings.type === 2 ? { label: e.target.value } : { placeholder: e.target.value })}
                                            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-amber-500/50 text-white"
                                        />
                                    </div>



                                    {/* BUTTON SPECIFIC: Emoji & Style */}
                                    {compSettings.type === 2 && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 mb-1">Emoji</label>
                                                <EmojiPicker value={compSettings.emoji || ''} onChange={(val) => saveCompSettings({ emoji: val })} className="w-full" guildId={guildId} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 mb-2">Style</label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[
                                                        { style: 1, label: 'Primary', color: '#5865F2' },
                                                        { style: 2, label: 'Secondary', color: '#4F545C' },
                                                        { style: 3, label: 'Success', color: '#2D7D46' },
                                                        { style: 4, label: 'Danger', color: '#ED4245' },
                                                        { style: 5, label: 'Link', color: '#4F545C', icon: '🔗' },
                                                    ].map(s => (
                                                        <button
                                                            key={s.style}
                                                            onClick={() => saveCompSettings({ style: s.style, url: s.style === 5 ? (compSettings.url || '') : undefined })}
                                                            className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition ${compSettings?.style === s.style
                                                                ? 'border-amber-500/50 bg-amber-500/10'
                                                                : 'border-white/10 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
                                                                style={{ backgroundColor: s.color }}
                                                            >
                                                                {s.icon || ''}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-400">{s.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Link URL Input - Show only for Link buttons (style 5) */}
                                            {compSettings.style === 5 && (
                                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🔗</span>
                                                        <label className="font-bold text-blue-400 text-sm">Link Button URL</label>
                                                    </div>
                                                    <input
                                                        type="url"
                                                        value={compSettings.url || ''}
                                                        onChange={(e) => saveCompSettings({ url: e.target.value })}
                                                        placeholder="https://example.com"
                                                        className="w-full p-3 bg-white/5 border border-blue-500/30 rounded-lg outline-none focus:border-blue-400 text-white"
                                                    />
                                                </div>
                                            )}

                                            {/* Button Action Config - Hide for Link buttons */}
                                            {compSettings.style !== 5 && (
                                                <div className="pt-2 border-t border-white/10">
                                                    <ActionManager
                                                        actions={compSettings.actions || []}
                                                        onChange={(arr) => saveCompSettings({ actions: arr })}
                                                        roles={roles}
                                                        channels={channels}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* SELECT MENU SPECIFIC: Options */}
                                    {compSettings.type === 3 && (
                                        <div className="space-y-3">
                                            {/* Allow Multiple Selections Toggle */}
                                            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                                                <input
                                                    type="checkbox"
                                                    id="allow-multiple-modal"
                                                    checked={(compSettings.max_values || 1) > 1}
                                                    onChange={(e) => {
                                                        saveCompSettings({
                                                            min_values: e.target.checked ? 0 : 1,
                                                            max_values: e.target.checked ? 25 : 1
                                                        });
                                                    }}
                                                    className="w-5 h-5 rounded border-white/20 text-amber-500 focus:ring-amber-500 accent-amber-500"
                                                />
                                                <label htmlFor="allow-multiple-modal" className="text-white font-bold cursor-pointer select-none">
                                                    Allow Multiple Selections
                                                </label>
                                                <span className="text-gray-500 text-xs ml-auto">
                                                    {(compSettings.max_values || 1) > 1
                                                        ? `Up to ${compSettings.max_values} options`
                                                        : "Single selection only"}
                                                </span>
                                            </div>

                                            {/* Min/Max controls if multiple is enabled */}
                                            {(compSettings.max_values || 1) > 1 && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 mb-1">Min Selections</label>
                                                        <input
                                                            type="number"
                                                            value={compSettings.min_values || 0}
                                                            onChange={(e) => saveCompSettings({ min_values: parseInt(e.target.value) || 0 })}
                                                            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-amber-500/50 text-white"
                                                            min="0" max="25"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-400 mb-1">Max Selections</label>
                                                        <input
                                                            type="number"
                                                            value={compSettings.max_values || 1}
                                                            onChange={(e) => saveCompSettings({ max_values: parseInt(e.target.value) || 1 })}
                                                            className="w-full p-2 bg-white/5 border border-white/10 rounded-lg outline-none focus:border-amber-500/50 text-white"
                                                            min="1" max="25"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-gray-400">Menu Options</label>
                                                <button
                                                    onClick={() => {
                                                        const newOptions = [...(compSettings?.options || []), { label: 'New Option', value: `option_${Date.now()}`, description: '' }];
                                                        saveCompSettings({ options: newOptions });
                                                    }}
                                                    className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-bold hover:bg-amber-500/30 border border-amber-500/30 transition"
                                                    disabled={(compSettings.options || []).length >= 25}
                                                >
                                                    + Add Option
                                                </button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                {(compSettings.options || []).map((opt, idx) => (
                                                    <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <div className="text-xs font-bold text-gray-400 uppercase">Option {idx + 1}</div>
                                                            <button
                                                                onClick={() => {
                                                                    if (!compSettings) return;
                                                                    const newOptions = compSettings.options!.filter((_, i) => i !== idx);
                                                                    saveCompSettings({ options: newOptions });
                                                                }}
                                                                className="text-gray-500 hover:text-red-400"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>

                                                        {/* Label & Value */}
                                                        <div className="space-y-2">
                                                            <input
                                                                value={opt.label}
                                                                onChange={e => {
                                                                    if (!compSettings || !compSettings.options) return;
                                                                    const newOptions = [...compSettings.options];
                                                                    newOptions[idx].label = e.target.value;
                                                                    saveCompSettings({ options: newOptions });
                                                                }}
                                                                className="w-full p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-sm font-bold text-white"
                                                                placeholder="Label"
                                                            />
                                                            <input
                                                                value={opt.value}
                                                                onChange={e => {
                                                                    if (!compSettings || !compSettings.options) return;
                                                                    const newOptions = [...compSettings.options];
                                                                    newOptions[idx].value = e.target.value;
                                                                    saveCompSettings({ options: newOptions });
                                                                }}
                                                                className="w-full p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-sm font-mono text-gray-400"
                                                                placeholder="Value (unique ID)"
                                                            />
                                                        </div>

                                                        {/* Emoji & Description */}
                                                        <div className="flex gap-2">
                                                            <div className="w-12 shrink-0">
                                                                <EmojiPicker
                                                                    value={opt.emoji || ''}
                                                                    onChange={val => {
                                                                        if (!compSettings || !compSettings.options) return;
                                                                        const newOptions = [...compSettings.options];
                                                                        newOptions[idx].emoji = val;
                                                                        saveCompSettings({ options: newOptions });
                                                                    }}
                                                                    className="w-full"
                                                                    guildId={guildId}
                                                                />
                                                            </div>
                                                            <input
                                                                value={opt.description || ''}
                                                                onChange={e => {
                                                                    if (!compSettings || !compSettings.options) return;
                                                                    const newOptions = [...compSettings.options];
                                                                    newOptions[idx].description = e.target.value;
                                                                    saveCompSettings({ options: newOptions });
                                                                }}
                                                                className="flex-1 p-2 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500/50 outline-none text-sm text-white"
                                                                placeholder="Description (optional)"
                                                            />
                                                        </div>

                                                        {/* Option Action Config */}
                                                        <div className="mt-2 pt-2 border-t border-white/10">
                                                            <ActionManager
                                                                actions={opt.actions || []}
                                                                onChange={(newActions) => {
                                                                    if (!compSettings || !compSettings.options) return;
                                                                    const newOptions = [...compSettings.options];
                                                                    newOptions[idx] = { ...newOptions[idx], actions: newActions };
                                                                    saveCompSettings({ options: newOptions });
                                                                }}
                                                                roles={roles}
                                                                channels={channels}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                {(compSettings.options || []).length === 0 && (
                                                    <div className="text-center text-xs text-stone-400 italic">No options added.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Footer with buttons */}
                                <div className="mt-4 flex justify-between">
                                    <button onClick={() => { if (activeComponent) removeComponent(activeComponent.row, activeComponent.col); setActiveComponent(null); }} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg font-bold transition">🗑️ Delete</button>
                                    <button onClick={() => { setActiveComponent(null); setCompSettings(null); }} className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg font-bold transition">✓ Done</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import JSON Modal */}
                {showImportModal && (
                    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
                        <div className="bg-[#1a1a24] rounded-2xl shadow-2xl w-full max-w-[550px] border border-white/10 animate-scale-in overflow-hidden max-h-[95vh] flex flex-col">
                            {/* Header */}
                            <div className="bg-white/5 p-3 md:p-4 flex items-center justify-between shrink-0 border-b border-white/10">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <span className="text-xl md:text-2xl">📥</span>
                                    <h3 className="font-bold text-white text-base md:text-lg">Import JSON</h3>
                                </div>
                                <button
                                    onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(null); }}
                                    className="text-gray-400 hover:text-white text-xl transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Upload File</label>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileImport}
                                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30 file:cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1 border-t border-white/10"></div>
                                    <span className="text-xs text-gray-500 font-bold">OR</span>
                                    <div className="flex-1 border-t border-white/10"></div>
                                </div>

                                {/* Paste JSON */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">Paste JSON</label>
                                    <textarea
                                        value={importJson}
                                        onChange={(e) => { setImportJson(e.target.value); setImportError(null); }}
                                        placeholder='{"message_content": "Hello!", "embeds": [], ...}'
                                        className="w-full h-48 p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono resize-none outline-none focus:border-amber-500/50 text-white placeholder-gray-600"
                                    />
                                </div>

                                {/* Error Display */}
                                {importError && (
                                    <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                        <span>⚠️</span>
                                        <span>{importError}</span>
                                    </div>
                                )}

                                {/* Tip */}
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                                    <p className="text-xs text-amber-400">
                                        💡 <strong>Tip:</strong> Export a message first to see the correct JSON format, then modify and import it back.
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/10 p-4 flex justify-end gap-3 bg-white/5">
                                <button
                                    onClick={() => { setShowImportModal(false); setImportJson(''); setImportError(null); }}
                                    className="px-4 py-2 text-gray-400 font-bold hover:bg-white/10 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={importFromJson}
                                    disabled={!importJson.trim()}
                                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >,
        document.body
    );
}
