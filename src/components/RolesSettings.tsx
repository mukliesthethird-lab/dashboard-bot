"use client";

import { useState, useEffect } from "react";

interface Channel {
    id: string;
    name: string;
    position: number;
}

interface Role {
    id: string;
    name: string;
    color: number;
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

interface ReactionRoleMessage {
    message_id: string | null;
    message_content: string;
    embeds: EmbedData[];
    component_rows?: any[];
}

interface RolesSettings {
    messages: ReactionRoleMessage[];
}

interface RolesSettingsProps {
    guildId: string;
}

const VARIABLES = [
    { name: '{reactionroles}', desc: 'List of reaction roles' },
    { name: '{server}', desc: 'Server name' },
    { name: '{server.members}', desc: 'Member count' },
    { name: '{date}', desc: 'Current date' }
];

// Collapsible Section Component
const CollapsibleSection = ({
    title,
    icon,
    children,
    defaultOpen = true
}: {
    title: string;
    icon?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-stone-200 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition text-left"
            >
                <div className="flex items-center gap-2">
                    <svg
                        className={`w-4 h-4 transition-transform text-stone-400 ${isOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {icon && <span className="text-lg">{icon}</span>}
                    <span className="font-bold text-sm text-stone-700">{title}</span>
                </div>
            </button>
            {isOpen && (
                <div className="p-3 pt-0 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
};

export default function RolesSettings({ guildId }: RolesSettingsProps) {
    const [settings, setSettings] = useState<RolesSettings>({ messages: [] });
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Editor state
    const [showEditor, setShowEditor] = useState(false);
    const [editingMsg, setEditingMsg] = useState<ReactionRoleMessage>(createDefaultMessage());
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [activeEmbedIndex, setActiveEmbedIndex] = useState(0);
    const [activeComponent, setActiveComponent] = useState<{ row: number, col: number } | null>(null);
    const [compSettings, setCompSettings] = useState<any>(null);
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [showComponentTypeMenu, setShowComponentTypeMenu] = useState(false);
    const [selectedComponentRow, setSelectedComponentRow] = useState<number | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [emojiPickerTarget, setEmojiPickerTarget] = useState<{ type: 'button' | 'option', optionIndex?: number } | null>(null);
    const [customEmojis, setCustomEmojis] = useState<{ id: string; name: string; animated: boolean }[]>([]);
    const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
    const [activeEmojiCategory, setActiveEmojiCategory] = useState('Smileys & People');

    function createDefaultEmbed(): EmbedData {
        return {
            author_name: '',
            author_icon_url: '',
            title: '',
            description: '',
            color: '#FFAA00',
            thumbnail_url: '',
            image_url: '',
            footer_text: '',
            footer_icon_url: '',
            fields: []
        };
    }

    function createDefaultMessage(): ReactionRoleMessage {
        return {
            message_id: null,
            message_content: '',
            embeds: [createDefaultEmbed()],
            component_rows: []
        };
    }

    useEffect(() => {
        if (activeComponent) {
            const comp = editingMsg.component_rows?.[activeComponent.row]?.[activeComponent.col];
            setCompSettings(comp || null);
        } else {
            setCompSettings(null);
        }
    }, [activeComponent, editingMsg.component_rows]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [messagesRes, channelsRes, rolesRes] = await Promise.all([
                    fetch(`/api/reaction-roles?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`)
                ]);

                const messagesData = await messagesRes.json();
                const channelsData = await channelsRes.json();
                const rolesData = await rolesRes.json();

                setSettings({ messages: messagesData.messages || [] });
                setChannels(channelsData.channels || []);
                setRoles(rolesData.roles || []);
            } catch (error) {
                console.error('Failed to load data:', error);
                setMessage({ type: 'error', text: 'Failed to load reaction roles data' });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [guildId]);

    // Fetch custom emojis
    useEffect(() => {
        const loadEmojis = async () => {
            try {
                const res = await fetch(`/api/emojis?guild_id=${guildId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCustomEmojis(data.emojis || []);
                }
            } catch (error) {
                console.error('Failed to load custom emojis:', error);
            }
        };

        loadEmojis();
    }, [guildId]);

    const handleSendMessage = async (channelId: string) => {
        setSending(true);
        setMessage(null);

        try {
            const method = editingIndex !== null ? 'PUT' : 'POST';
            const body = JSON.stringify({
                guild_id: guildId,
                channel_id: channelId,
                ...editingMsg,
                ...(editingIndex !== null && { message_id: editingMsg.message_id })
            });

            const res = await fetch('/api/reaction-roles', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body
            });

            if (!res.ok) throw new Error('Failed to send message');

            setMessage({ type: 'success', text: 'Message sent successfully!' });
            setShowEditor(false);

            // Reload messages
            const messagesRes = await fetch(`/api/reaction-roles?guild_id=${guildId}`);
            const messagesData = await messagesRes.json();
            setSettings({ messages: messagesData.messages || [] });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send message' });
        } finally {
            setSending(false);
        }
    };

    const addEmbed = () => {
        if (editingMsg.embeds.length >= 10) return;
        const newEmbed = createDefaultEmbed();
        setEditingMsg(prev => ({ ...prev, embeds: [...prev.embeds, newEmbed] }));
        setActiveEmbedIndex(editingMsg.embeds.length);
    };

    const removeEmbed = (index: number) => {
        if (editingMsg.embeds.length <= 1) return;
        setEditingMsg(prev => ({ ...prev, embeds: prev.embeds.filter((_, i) => i !== index) }));
        if (activeEmbedIndex >= editingMsg.embeds.length - 1) {
            setActiveEmbedIndex(Math.max(0, editingMsg.embeds.length - 2));
        }
    };

    const updateEmbed = (key: keyof EmbedData, value: any) => {
        setEditingMsg(prev => ({
            ...prev,
            embeds: prev.embeds.map((e, i) => i === activeEmbedIndex ? { ...e, [key]: value } : e)
        }));
    };

    const addField = () => {
        const currentEmbed = editingMsg.embeds[activeEmbedIndex];
        if (currentEmbed.fields.length >= 25) return;
        updateEmbed('fields', [...currentEmbed.fields, { name: 'Field Name', value: 'Field Value', inline: false }]);
    };

    const updateField = (fieldIndex: number, key: keyof EmbedField, value: any) => {
        const currentEmbed = editingMsg.embeds[activeEmbedIndex];
        const newFields = currentEmbed.fields.map((f, i) =>
            i === fieldIndex ? { ...f, [key]: value } : f
        );
        updateEmbed('fields', newFields);
    };

    const removeField = (fieldIndex: number) => {
        const currentEmbed = editingMsg.embeds[activeEmbedIndex];
        updateEmbed('fields', currentEmbed.fields.filter((_, i) => i !== fieldIndex));
    };

    const addComponentRow = () => {
        if ((editingMsg.component_rows || []).length >= 5) return;
        setEditingMsg(prev => ({ ...prev, component_rows: [...(prev.component_rows || []), []] }));
    };

    const addComponent = (rowIndex: number, type: 'button' | 'select_menu') => {
        const rows = [...(editingMsg.component_rows || [])];
        if (rows[rowIndex].length >= 5) return;

        const newComponent = type === 'button'
            ? { type: 2, style: 1, label: 'Button', custom_id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` }
            : { type: 3, placeholder: 'Select Menu', custom_id: `menu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, options: [], min_values: 1, max_values: 1 };

        rows[rowIndex] = [...rows[rowIndex], newComponent];
        setEditingMsg(prev => ({ ...prev, component_rows: rows }));
    };

    const removeComponent = (rowIndex: number, compIndex: number) => {
        const rows = [...(editingMsg.component_rows || [])];
        rows[rowIndex] = rows[rowIndex].filter((_: any, i: number) => i !== compIndex);
        setEditingMsg(prev => ({ ...prev, component_rows: rows }));
    };

    const removeComponentRow = (rowIndex: number) => {
        setEditingMsg(prev => ({
            ...prev,
            component_rows: (prev.component_rows || []).filter((_, i) => i !== rowIndex)
        }));
    };

    const saveCompSettings = (updates: any) => {
        if (!activeComponent) return;
        const rows = [...(editingMsg.component_rows || [])];
        rows[activeComponent.row][activeComponent.col] = { ...compSettings, ...updates };
        setEditingMsg(prev => ({ ...prev, component_rows: rows }));
    };

    const preview = (text: string) => {
        return text
            .replace(/{reactionroles}/g, editingMsg.component_rows?.flatMap(r => r.filter((c: any) => c.type === 3).flatMap((c: any) => c.options?.map((o: any) => o.label) || [])).join(', ') || 'Roles')
            .replace(/{server}/g, 'Server Name')
            .replace(/{server\.members}/g, '1,234')
            .replace(/{date}/g, new Date().toLocaleDateString());
    };

    const renderPreview = () => (
        <div className="bg-stone-100 rounded-xl p-4 border-2 border-stone-200">
            <div className="mb-2">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Preview</div>
            </div>

            {editingMsg.message_content && (
                <p className="text-stone-800 mb-2 text-sm whitespace-pre-wrap">{preview(editingMsg.message_content)}</p>
            )}

            {editingMsg.embeds.map((e, ei) => (
                <div key={ei} className="mb-2 bg-white border-l-4 rounded-r overflow-hidden shadow" style={{ borderLeftColor: e.color || '#FFAA00' }}>
                    <div className="p-3">
                        {e.author_name && (
                            <div className="flex items-center gap-2 mb-2">
                                {e.author_icon_url && <img src={preview(e.author_icon_url)} alt="" className="w-6 h-6 rounded-full" />}
                                <span className="text-stone-800 text-sm font-bold">{preview(e.author_name)}</span>
                            </div>
                        )}
                        {e.thumbnail_url && <img src={preview(e.thumbnail_url)} alt="" className="float-right ml-2 w-20 h-20 rounded object-cover" />}
                        {e.title && <div className="text-stone-900 font-bold mb-1">{preview(e.title)}</div>}
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

            {(editingMsg.component_rows || []).length > 0 && (
                <div className="mt-2 space-y-2">
                    {(editingMsg.component_rows || []).map((row: any[], ri: number) => (
                        <div key={ri} className="flex gap-2 relative z-10">
                            {row.map((comp: any, ci: number) => {
                                if (!comp) return null;
                                if (comp.type === 2) {
                                    const styleClasses = {
                                        1: "bg-[#5865F2] hover:bg-[#4752C4] text-white",
                                        2: "bg-[#4F545C] hover:bg-[#36393F] text-white",
                                        3: "bg-[#2D7D46] hover:bg-[#1F542F] text-white",
                                        4: "bg-[#ED4245] hover:bg-[#C03537] text-white",
                                        5: "bg-[#4F545C] hover:bg-[#36393F] text-white"
                                    }[comp.style as number] || "bg-[#5865F2] text-white";

                                    return (
                                        <div
                                            key={ci}
                                            className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 cursor-default ${styleClasses}`}
                                        >
                                            {comp.emoji && <span>{comp.emoji}</span>}
                                            {comp.label || 'Button'}
                                            {comp.style === 5 && <span className="text-[10px]">🔗</span>}
                                        </div>
                                    );
                                } else if (comp.type === 3) {
                                    const menuId = `menu_${ri}_${ci}`;
                                    const isExpanded = expandedMenus.has(menuId);

                                    return (
                                        <div key={ci} className="flex-1 min-w-0 relative">
                                            <button
                                                className="w-full bg-[#1E1F22] text-[#B5BAC1] px-3 py-2 rounded text-sm border border-[#1E1F22] hover:border-[#00AFF4] flex justify-between items-center cursor-pointer transition"
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
                                                <div className="absolute z-50 mt-1 w-full bg-[#2B2D31] border border-[#1E1F22] rounded shadow-lg max-h-60 overflow-y-auto">
                                                    {comp.options.map((opt: any, oi: number) => (
                                                        <div
                                                            key={oi}
                                                            className="px-3 py-2 hover:bg-[#404249] border-b border-[#1E1F22] last:border-b-0 cursor-pointer transition"
                                                            onClick={() => setExpandedMenus(new Set())}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {opt.emoji?.name && (
                                                                    <span className="text-lg">{opt.emoji.name}</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-white text-sm">{opt.label}</div>
                                                                    {opt.description && (
                                                                        <div className="text-xs text-[#B5BAC1]">{opt.description}</div>
                                                                    )}
                                                                </div>
                                                                {opt.action_type && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-[#5865F2] text-white rounded font-bold uppercase">
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
                <div className="text-6xl animate-bounce">🎭</div>
            </div>
        );
    }

    const currentEmbed = editingMsg.embeds[activeEmbedIndex] || createDefaultEmbed();

    return (
        <>
            {message && (
                <div className={`mb-6 p-4 rounded-xl font-bold ${message.type === "success" ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200" : "bg-red-100 text-red-700 border-2 border-red-200"}`}>
                    {message.text}
                </div>
            )}

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200">
                            <h2 className="text-2xl font-black text-stone-800">
                                {editingIndex !== null ? 'Edit' : 'Create'} Reaction Role Message
                            </h2>
                            <button onClick={() => setShowEditor(false)} className="text-stone-400 hover:text-stone-800 text-3xl">×</button>
                        </div>

                        {/* Main Content - 2 Column Layout */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Left Panel - Editor */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* Message Content */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-2 uppercase">Message Content</label>
                                    <textarea
                                        value={editingMsg.message_content}
                                        onChange={(e) => setEditingMsg(prev => ({ ...prev, message_content: e.target.value }))}
                                        className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl p-3 text-sm focus:border-amber-400 focus:outline-none resize-none"
                                        rows={3}
                                        placeholder="Type a message..."
                                    />
                                </div>

                                {/* Embed Tabs */}
                                {editingMsg.embeds.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {editingMsg.embeds.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveEmbedIndex(idx)}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeEmbedIndex === idx
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                    }`}
                                            >
                                                Embed {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Current Embed Editor - Collapsible */}
                                <div className="bg-white border-2 border-stone-200 rounded-xl overflow-hidden">
                                    {/* Embed Header */}
                                    <div className="flex items-center justify-between p-4 bg-stone-50 border-b-2 border-stone-200">
                                        <span className="font-black text-stone-800">Embed {activeEmbedIndex + 1}</span>
                                        {editingMsg.embeds.length > 1 && (
                                            <button
                                                onClick={() => removeEmbed(activeEmbedIndex)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>

                                    {/* Author Section */}
                                    <CollapsibleSection title="Author" icon="👤" defaultOpen={false}>
                                        <input
                                            type="text"
                                            placeholder="Author Name"
                                            value={currentEmbed.author_name}
                                            onChange={(e) => updateEmbed('author_name', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Author Icon URL"
                                            value={currentEmbed.author_icon_url}
                                            onChange={(e) => updateEmbed('author_icon_url', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                                        />
                                    </CollapsibleSection>

                                    {/* Body Section */}
                                    <CollapsibleSection title="Body" icon="📝" defaultOpen={true}>
                                        <input
                                            type="text"
                                            placeholder="Embed Title"
                                            value={currentEmbed.title}
                                            onChange={(e) => updateEmbed('title', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none mb-2"
                                        />
                                        <div className="mb-2">
                                            <label className="block text-xs font-bold text-stone-500 mb-1">Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={currentEmbed.color}
                                                    onChange={(e) => updateEmbed('color', e.target.value)}
                                                    className="h-10 w-16 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={currentEmbed.color}
                                                    onChange={(e) => updateEmbed('color', e.target.value)}
                                                    className="flex-1 bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                    placeholder="#FFAA00"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            placeholder="Description"
                                            value={currentEmbed.description}
                                            onChange={(e) => updateEmbed('description', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none resize-none"
                                            rows={4}
                                        />
                                    </CollapsibleSection>

                                    {/* Fields Section */}
                                    <CollapsibleSection title="Fields" icon="📋" defaultOpen={false}>
                                        <div className="space-y-2">
                                            {currentEmbed.fields.map((field, fi) => (
                                                <div key={fi} className="bg-stone-50 p-3 rounded-lg border-2 border-stone-200">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-stone-600">Field {fi + 1}</span>
                                                        <button
                                                            onClick={() => removeField(fi)}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >×</button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Field Name"
                                                        value={field.name}
                                                        onChange={(e) => updateField(fi, 'name', e.target.value)}
                                                        className="w-full bg-white border-2 border-stone-200 rounded p-2 text-sm mb-2 focus:border-amber-400 focus:outline-none"
                                                    />
                                                    <textarea
                                                        placeholder="Field Value"
                                                        value={field.value}
                                                        onChange={(e) => updateField(fi, 'value', e.target.value)}
                                                        className="w-full bg-white border-2 border-stone-200 rounded p-2 text-sm mb-2 focus:border-amber-400 focus:outline-none resize-none"
                                                        rows={2}
                                                    />
                                                    <label className="flex items-center gap-2 text-sm text-stone-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.inline}
                                                            onChange={(e) => updateField(fi, 'inline', e.target.checked)}
                                                            className="rounded"
                                                        />
                                                        Inline
                                                    </label>
                                                </div>
                                            ))}
                                            <button
                                                onClick={addField}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition text-sm"
                                            >
                                                + Add Field
                                            </button>
                                        </div>
                                    </CollapsibleSection>

                                    {/* Images Section */}
                                    <CollapsibleSection title="Images" icon="🖼️" defaultOpen={false}>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 mb-1">Large Image URL</label>
                                                <input
                                                    type="text"
                                                    placeholder="https://..."
                                                    value={currentEmbed.image_url}
                                                    onChange={(e) => updateEmbed('image_url', e.target.value)}
                                                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 mb-1">Thumbnail URL</label>
                                                <input
                                                    type="text"
                                                    placeholder="https://..."
                                                    value={currentEmbed.thumbnail_url}
                                                    onChange={(e) => updateEmbed('thumbnail_url', e.target.value)}
                                                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </CollapsibleSection>

                                    {/* Footer Section */}
                                    <CollapsibleSection title="Footer" icon="📌" defaultOpen={false}>
                                        <input
                                            type="text"
                                            placeholder="Footer Text"
                                            value={currentEmbed.footer_text}
                                            onChange={(e) => updateEmbed('footer_text', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none mb-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Footer Icon URL"
                                            value={currentEmbed.footer_icon_url}
                                            onChange={(e) => updateEmbed('footer_icon_url', e.target.value)}
                                            className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg p-2 text-sm focus:border-amber-400 focus:outline-none"
                                        />
                                    </CollapsibleSection>
                                </div>

                                {/* Components Section */}
                                {(editingMsg.component_rows || []).length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        <h3 className="text-sm font-bold text-stone-700 mb-2 uppercase">Components</h3>
                                        {(editingMsg.component_rows || []).map((row: any[], rowIdx: number) => (
                                            <div key={rowIdx} className="bg-white border-2 border-stone-200 rounded-xl">
                                                {/* Row Header */}
                                                <div className="flex items-center justify-between p-3 bg-amber-500 text-white rounded-t-lg">
                                                    <span className="font-bold">🎛️ Row {rowIdx + 1}</span>
                                                    <div className="flex gap-2 items-center">
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => {
                                                                    if (selectedComponentRow === rowIdx && showComponentTypeMenu) {
                                                                        setShowComponentTypeMenu(false);
                                                                        setSelectedComponentRow(null);
                                                                    } else {
                                                                        setSelectedComponentRow(rowIdx);
                                                                        setShowComponentTypeMenu(true);
                                                                    }
                                                                }}
                                                                className="text-xs px-3 py-1 bg-white text-amber-600 hover:bg-amber-50 rounded transition font-bold flex items-center gap-1"
                                                            >
                                                                + Add Component
                                                                <svg className={`w-3 h-3 transition-transform ${selectedComponentRow === rowIdx && showComponentTypeMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </button>

                                                            {/* Inline Dropdown */}
                                                            {selectedComponentRow === rowIdx && showComponentTypeMenu && (
                                                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-amber-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                                                    <button
                                                                        onClick={() => { addComponent(rowIdx, 'button'); setShowComponentTypeMenu(false); }}
                                                                        className="w-full px-3 py-2 text-left hover:bg-amber-50 text-stone-700 text-sm flex items-center gap-2 transition"
                                                                    >
                                                                        🔘 Button
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const rows = [...(editingMsg.component_rows || [])];
                                                                            if (rows[rowIdx].length < 5) {
                                                                                rows[rowIdx].push({ type: 2, style: 5, label: 'Link', url: 'https://', custom_id: `link_${Date.now()}` });
                                                                                setEditingMsg(prev => ({ ...prev, component_rows: rows }));
                                                                            }
                                                                            setShowComponentTypeMenu(false);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left hover:bg-amber-50 text-stone-700 text-sm flex items-center gap-2 transition border-t border-stone-100"
                                                                    >
                                                                        🔗 Link Button
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { addComponent(rowIdx, 'select_menu'); setShowComponentTypeMenu(false); }}
                                                                        className="w-full px-3 py-2 text-left hover:bg-amber-50 text-stone-700 text-sm flex items-center gap-2 transition border-t border-stone-100"
                                                                    >
                                                                        📜 Select Menu
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => removeComponentRow(rowIdx)}
                                                            className="text-white hover:text-red-200 transition"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Components in Row */}
                                                <div className="p-3 space-y-2 bg-amber-50">
                                                    {row.map((comp: any, compIdx: number) => {
                                                        if (!comp) return null;

                                                        const isButton = comp.type === 2;
                                                        const styleColors = {
                                                            1: 'bg-[#5865F2]',
                                                            2: 'bg-[#4F545C]',
                                                            3: 'bg-[#2D7D46]',
                                                            4: 'bg-[#ED4245]',
                                                            5: 'bg-[#4F545C]'
                                                        };

                                                        return (
                                                            <div key={compIdx} className="flex items-center gap-2 p-2 bg-white border-2 border-stone-200 rounded-lg hover:border-amber-400 transition">
                                                                {isButton && (
                                                                    <div className={`px-3 py-1 rounded text-white text-sm font-bold ${styleColors[comp.style as keyof typeof styleColors] || 'bg-[#5865F2]'}`}>
                                                                        {comp.emoji && <span className="mr-1">{comp.emoji}</span>}
                                                                        {comp.label || 'Button'}
                                                                        {comp.style === 5 && <span className="ml-1 text-xs">🔗</span>}
                                                                    </div>
                                                                )}
                                                                {!isButton && (
                                                                    <div className="flex-1 px-3 py-1 bg-stone-100 border border-stone-300 rounded text-stone-700 text-sm">
                                                                        📜 {comp.placeholder || 'Select Menu'}
                                                                    </div>
                                                                )}
                                                                <div className="ml-auto flex gap-1">
                                                                    <button
                                                                        onClick={() => setActiveComponent({ row: rowIdx, col: compIdx })}
                                                                        className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded transition font-bold"
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => removeComponent(rowIdx, compIdx)}
                                                                        className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition font-bold"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Component Edit Modal */}
                            {activeComponent && compSettings && (
                                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60" onClick={() => setActiveComponent(null)}>
                                    <div className="bg-[#313338] rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-white" onClick={(e) => e.stopPropagation()}>
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-[#2B2D31]">
                                            <h3 className="font-semibold">Edit {compSettings.type === 2 ? (compSettings.style === 5 ? 'Link Button' : 'Button') : 'Select Menu'}</h3>
                                            <button onClick={() => setActiveComponent(null)} className="text-[#B5BAC1] hover:text-white transition">×</button>
                                        </div>

                                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                                            {/* Button Settings */}
                                            {compSettings.type === 2 && (
                                                <>
                                                    {/* Button Preview */}
                                                    <div className="bg-[#2B2D31] rounded-lg p-4 flex items-center justify-center">
                                                        <div className={`px-4 py-2 rounded font-medium text-sm flex items-center gap-2 ${compSettings.style === 1 ? 'bg-[#5865F2] text-white' :
                                                            compSettings.style === 2 ? 'bg-[#4E5058] text-white' :
                                                                compSettings.style === 3 ? 'bg-[#248046] text-white' :
                                                                    compSettings.style === 4 ? 'bg-[#DA373C] text-white' :
                                                                        'bg-[#4E5058] text-[#00AFF4]'
                                                            }`}>
                                                            {compSettings.emoji && <span>{compSettings.emoji}</span>}
                                                            <span>{compSettings.label || 'Button'}</span>
                                                            {compSettings.style === 5 && <span className="text-xs">🔗</span>}
                                                        </div>
                                                    </div>

                                                    {/* Emoji & Label Row */}
                                                    <div className="grid grid-cols-[80px_1fr] gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Emoji</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEmojiPickerTarget({ type: 'button' });
                                                                    setShowEmojiPicker(true);
                                                                }}
                                                                className="w-full h-10 bg-[#1E1F22] hover:bg-[#232428] border border-[#1E1F22] hover:border-[#00AFF4] rounded flex items-center justify-center text-xl transition"
                                                            >
                                                                {compSettings.emoji || '😀'}
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Label</label>
                                                            <input
                                                                type="text"
                                                                value={compSettings.label || ''}
                                                                onChange={(e) => saveCompSettings({ label: e.target.value })}
                                                                placeholder="Button text..."
                                                                className="w-full h-10 bg-[#1E1F22] border border-[#1E1F22] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-3 text-white text-sm outline-none transition"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Style */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Style</label>
                                                        <div className="grid grid-cols-5 gap-2">
                                                            {[
                                                                { value: 1, color: '#5865F2', label: 'Blurple' },
                                                                { value: 2, color: '#4E5058', label: 'Grey' },
                                                                { value: 3, color: '#248046', label: 'Green' },
                                                                { value: 4, color: '#DA373C', label: 'Red' },
                                                                { value: 5, color: '#4E5058', label: 'Link' }
                                                            ].map(style => (
                                                                <button
                                                                    key={style.value}
                                                                    onClick={() => saveCompSettings({ style: style.value })}
                                                                    className={`h-10 rounded text-xs font-medium transition ${compSettings.style === style.value
                                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#313338]'
                                                                        : 'hover:opacity-80'
                                                                        }`}
                                                                    style={{ backgroundColor: style.color, color: style.value === 5 ? '#00AFF4' : 'white' }}
                                                                >
                                                                    {style.value === 5 ? '🔗' : style.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* URL for Link style */}
                                                    {compSettings.style === 5 && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">URL</label>
                                                            <input
                                                                type="text"
                                                                value={compSettings.url || ''}
                                                                onChange={(e) => saveCompSettings({ url: e.target.value })}
                                                                placeholder="https://example.com"
                                                                className="w-full h-10 bg-[#1E1F22] border border-[#1E1F22] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-3 text-white text-sm outline-none transition"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Action Settings for non-link buttons */}
                                                    {compSettings.style !== 5 && (
                                                        <>
                                                            <div>
                                                                <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Action</label>
                                                                <select
                                                                    value={compSettings.action_type || ''}
                                                                    onChange={(e) => saveCompSettings({ action_type: e.target.value })}
                                                                    className="w-full h-10 bg-[#1E1F22] border border-[#1E1F22] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-3 text-white text-sm outline-none transition"
                                                                >
                                                                    <option value="">No Action</option>
                                                                    <option value="add_role">➕ Add Role</option>
                                                                    <option value="remove_role">➖ Remove Role</option>
                                                                    <option value="toggle_role">🔄 Toggle Role</option>
                                                                </select>
                                                            </div>
                                                            {['add_role', 'remove_role', 'toggle_role'].includes(compSettings.action_type) && (
                                                                <div>
                                                                    <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Target Role</label>
                                                                    <select
                                                                        value={compSettings.role_id || ''}
                                                                        onChange={(e) => saveCompSettings({ role_id: e.target.value })}
                                                                        className="w-full h-10 bg-[#1E1F22] border border-[#1E1F22] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-3 text-white text-sm outline-none transition"
                                                                    >
                                                                        <option value="">Select Role...</option>
                                                                        {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {/* Select Menu Settings */}
                                            {compSettings.type === 3 && (
                                                <>
                                                    {/* Select Menu Preview */}
                                                    <div className="bg-[#2B2D31] rounded-lg p-4">
                                                        <div className="bg-[#1E1F22] rounded px-3 py-2 flex items-center justify-between text-[#B5BAC1] text-sm">
                                                            <span>{compSettings.placeholder || 'Make a selection...'}</span>
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    {/* Placeholder */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[#B5BAC1] mb-1.5">Placeholder</label>
                                                        <input
                                                            type="text"
                                                            value={compSettings.placeholder || ''}
                                                            onChange={(e) => saveCompSettings({ placeholder: e.target.value })}
                                                            placeholder="Make a selection..."
                                                            className="w-full h-10 bg-[#1E1F22] border border-[#1E1F22] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-3 text-white text-sm outline-none transition"
                                                        />
                                                    </div>


                                                    {/* Options */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-xs font-medium text-[#B5BAC1]">Options ({compSettings.options?.length || 0}/25)</label>
                                                            <button
                                                                onClick={() => {
                                                                    const newOpt = { label: 'New Option', value: `opt_${Date.now()}` };
                                                                    saveCompSettings({ options: [...(compSettings.options || []), newOpt] });
                                                                }}
                                                                className="px-2 py-1 bg-[#5865F2] hover:bg-[#4752C4] rounded text-white text-xs font-medium transition"
                                                            >
                                                                + Add
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                                            {(compSettings.options || []).map((opt: any, idx: number) => (
                                                                <div key={idx} className="bg-[#1E1F22] rounded-lg p-3 border border-[#1E1F22] hover:border-[#404249] transition">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-xs font-medium text-[#B5BAC1]">Option {idx + 1}</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newOpts = compSettings.options.filter((_: any, i: number) => i !== idx);
                                                                                saveCompSettings({ options: newOpts });
                                                                            }}
                                                                            className="text-[#F23F42] hover:text-[#DA373C] transition text-lg"
                                                                        >×</button>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="grid grid-cols-[50px_1fr] gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEmojiPickerTarget({ type: 'option', optionIndex: idx });
                                                                                    setShowEmojiPicker(true);
                                                                                }}
                                                                                className="h-9 bg-[#2B2D31] hover:bg-[#35373C] border border-[#2B2D31] hover:border-[#00AFF4] rounded flex items-center justify-center text-lg transition"
                                                                            >
                                                                                {opt.emoji?.name || '😀'}
                                                                            </button>
                                                                            <input
                                                                                placeholder="Label"
                                                                                value={opt.label}
                                                                                onChange={(e) => {
                                                                                    const newOpts = [...compSettings.options];
                                                                                    newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                                                                    saveCompSettings({ options: newOpts });
                                                                                }}
                                                                                className="h-9 bg-[#2B2D31] border border-[#2B2D31] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-2 text-white text-sm outline-none transition"
                                                                            />
                                                                        </div>
                                                                        <input
                                                                            placeholder="Description (optional)"
                                                                            value={opt.description || ''}
                                                                            onChange={(e) => {
                                                                                const newOpts = [...compSettings.options];
                                                                                newOpts[idx] = { ...newOpts[idx], description: e.target.value };
                                                                                saveCompSettings({ options: newOpts });
                                                                            }}
                                                                            className="w-full h-9 bg-[#2B2D31] border border-[#2B2D31] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-2 text-white text-sm outline-none transition"
                                                                        />

                                                                        {/* Action per option */}
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <select
                                                                                value={opt.action_type || ''}
                                                                                onChange={(e) => {
                                                                                    const newOpts = [...compSettings.options];
                                                                                    newOpts[idx] = { ...newOpts[idx], action_type: e.target.value };
                                                                                    saveCompSettings({ options: newOpts });
                                                                                }}
                                                                                className="h-9 bg-[#2B2D31] border border-[#2B2D31] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-2 text-white text-xs outline-none transition"
                                                                            >
                                                                                <option value="">No Action</option>
                                                                                <option value="add_role">➕ Add Role</option>
                                                                                <option value="remove_role">➖ Remove</option>
                                                                                <option value="toggle_role">🔄 Toggle</option>
                                                                            </select>

                                                                            {['add_role', 'remove_role', 'toggle_role'].includes(opt.action_type) ? (
                                                                                <select
                                                                                    value={opt.role_id || ''}
                                                                                    onChange={(e) => {
                                                                                        const newOpts = [...compSettings.options];
                                                                                        newOpts[idx] = { ...newOpts[idx], role_id: e.target.value };
                                                                                        saveCompSettings({ options: newOpts });
                                                                                    }}
                                                                                    className="h-9 bg-[#2B2D31] border border-[#2B2D31] hover:border-[#00AFF4] focus:border-[#00AFF4] rounded px-2 text-white text-xs outline-none transition"
                                                                                >
                                                                                    <option value="">Select Role...</option>
                                                                                    {roles.map(r => <option key={r.id} value={r.id}>@{r.name}</option>)}
                                                                                </select>
                                                                            ) : (
                                                                                <div></div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-4 py-3 bg-[#2B2D31] flex justify-end gap-2">
                                            <button
                                                onClick={() => setActiveComponent(null)}
                                                className="px-4 py-2 text-white text-sm font-medium hover:underline transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => setActiveComponent(null)}
                                                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold rounded transition"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Right Panel - Preview */}
                            <div className="w-96 bg-stone-50 border-l-2 border-stone-200 p-6 overflow-y-auto">
                                {renderPreview()}
                            </div>
                        </div>

                        {/* Footer - Add Button */}
                        <div className="p-4 border-t-2 border-stone-200 flex justify-between items-center bg-stone-50">
                            <div className="relative">
                                <button
                                    onClick={() => setShowAddDropdown(!showAddDropdown)}
                                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition flex items-center gap-2"
                                >
                                    Add
                                    <svg className={`w-4 h-4 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showAddDropdown && (
                                    <div className="absolute bottom-full mb-2 left-0 bg-white border-2 border-stone-200 rounded-xl shadow-xl overflow-hidden min-w-[200px]">
                                        <button
                                            onClick={() => { addEmbed(); setShowAddDropdown(false); }}
                                            className="w-full px-4 py-3 text-left hover:bg-stone-50 flex items-center gap-3 font-bold text-stone-700 transition"
                                        >
                                            ➕ Add Embed
                                        </button>
                                        <button
                                            onClick={() => {
                                                addComponentRow();
                                                setShowAddDropdown(false);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-stone-50 flex items-center gap-3 font-bold text-stone-700 transition border-t border-stone-200"
                                        >
                                            🎛️ Add Components
                                        </button>
                                    </div>
                                )}
                            </div>


                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-black rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const channelId = channels[0]?.id;
                                        if (channelId) handleSendMessage(channelId);
                                    }}
                                    disabled={sending}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black rounded-xl transition disabled:opacity-50"
                                >
                                    {sending ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main View - Create Button */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        setEditingMsg(createDefaultMessage());
                        setEditingIndex(null);
                        setActiveEmbedIndex(0);
                        setShowEditor(true);
                    }}
                    className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-black rounded-2xl shadow-lg transition text-lg"
                >
                    ➕ Create New Reaction Role Message
                </button>
            </div>

            {/* Existing Messages */}
            <div className="space-y-4">
                {settings.messages.map((msg, idx) => (
                    <div key={idx} className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-purple-200 shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="text-2xl">🎭</div>
                                <div>
                                    <div className="font-black text-stone-800">Reaction Role Message #{idx + 1}</div>
                                    {msg.message_id && <div className="text-stone-500 text-xs font-mono">ID: {msg.message_id}</div>}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingMsg(msg);
                                    setEditingIndex(idx);
                                    setActiveEmbedIndex(0);
                                    setShowEditor(true);
                                }}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition"
                            >
                                Edit
                            </button>
                        </div>
                        <div className="flex gap-4 text-sm text-stone-600">
                            <span>📝 {msg.embeds.length} Embed(s)</span>
                            <span>🎛️ {(msg.component_rows || []).length} Component Row(s)</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Emoji Picker Modal */}
            {showEmojiPicker && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50" onClick={() => { setShowEmojiPicker(false); setEmojiSearchQuery(''); }}>
                    <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md h-[500px] flex flex-col text-white" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-[#1E1F22]">
                            <h3 className="font-semibold text-sm">Find the perfect emoji</h3>
                            <button onClick={() => { setShowEmojiPicker(false); setEmojiSearchQuery(''); }} className="text-stone-400 hover:text-white">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-[#1E1F22]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={emojiSearchQuery}
                                    onChange={(e) => setEmojiSearchQuery(e.target.value)}
                                    placeholder="Search emojis..."
                                    className="w-full bg-[#1E1F22] border border-[#1E1F22] rounded px-3 py-2 pl-8 text-white text-sm focus:border-[#00AFF4] outline-none"
                                />
                                <svg className="w-4 h-4 absolute left-2 top-3 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        {!emojiSearchQuery && (
                            <div className="flex gap-1 px-2 py-2 bg-[#2B2D31] border-b border-[#1E1F22] overflow-x-auto">
                                {customEmojis.length > 0 && (
                                    <button
                                        onClick={() => setActiveEmojiCategory('Custom')}
                                        className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Custom' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                        title="Custom Emojis"
                                    >
                                        ✨
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveEmojiCategory('Smileys & People')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Smileys & People' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Smileys & People"
                                >
                                    😀
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Animals & Nature')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Animals & Nature' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Animals & Nature"
                                >
                                    🐶
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Food & Drink')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Food & Drink' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Food & Drink"
                                >
                                    🍕
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Activity')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Activity' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Activity"
                                >
                                    ⚽
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Travel & Places')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Travel & Places' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Travel & Places"
                                >
                                    🚗
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Objects')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Objects' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Objects"
                                >
                                    📱
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Symbols')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Symbols' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Symbols"
                                >
                                    ❤️
                                </button>
                                <button
                                    onClick={() => setActiveEmojiCategory('Flags')}
                                    className={`px-2 py-1 rounded text-lg transition ${activeEmojiCategory === 'Flags' ? 'bg-[#404249]' : 'hover:bg-[#35373C]'}`}
                                    title="Flags"
                                >
                                    🏳️
                                </button>
                            </div>
                        )}

                        {/* Emoji Grid */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {(() => {
                                const allEmojis = {
                                    'Smileys & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
                                    'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🫎', '🫏', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
                                    'Food & Drink': ['🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰', '🫚', '🫛', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🫙', '🏺'],
                                    'Activity': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
                                    'Travel & Places': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'],
                                    'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '🪪', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '🪬', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '🩻', '🩼', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
                                    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
                                    'Flags': ['🏳️', '🏴', '🏴‍☠️', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽', '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭', '🇧🇮', '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷', '🇧🇸', '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨', '🇨🇩', '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲', '🇨🇳', '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽', '🇨🇾', '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴', '🇩🇿', '🇪🇦', '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸', '🇪🇹', '🇪🇺', '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷', '🇬🇦', '🇬🇧', '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮', '🇬🇱', '🇬🇲', '🇬🇳', '🇬🇵', '🇬🇶', '🇬🇷', '🇬🇸', '🇬🇹', '🇬🇺', '🇬🇼', '🇬🇾', '🇭🇰', '🇭🇲', '🇭🇳', '🇭🇷', '🇭🇹', '🇭🇺', '🇮🇨', '🇮🇩', '🇮🇪', '🇮🇱', '🇮🇲', '🇮🇳', '🇮🇴', '🇮🇶', '🇮🇷', '🇮🇸', '🇮🇹', '🇯🇪', '🇯🇲', '🇯🇴', '🇯🇵', '🇰🇪', '🇰🇬', '🇰🇭', '🇰🇮', '🇰🇲', '🇰🇳', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇾', '🇰🇿', '🇱🇦', '🇱🇧', '🇱🇨', '🇱🇮', '🇱🇰', '🇱🇷', '🇱🇸', '🇱🇹', '🇱🇺', '🇱🇻', '🇱🇾', '🇲🇦', '🇲🇨', '🇲🇩', '🇲🇪', '🇲🇫', '🇲🇬', '🇲🇭', '🇲🇰', '🇲🇱', '🇲🇲', '🇲🇳', '🇲🇴', '🇲🇵', '🇲🇶', '🇲🇷', '🇲🇸', '🇲🇹', '🇲 🇺', '🇲🇻', '🇲🇼', '🇲🇽', '🇲🇾', '🇲🇿', '🇳🇦', '🇳🇨', '🇳🇪', '🇳🇫', '🇳🇬', '🇳🇮', '🇳🇱', '🇳🇴', '🇳🇵', '🇳🇷', '🇳🇺', '🇳🇿', '🇴🇲', '🇵🇦', '🇵🇪', '🇵🇫', '🇵🇬', '🇵🇭', '🇵🇰', '🇵🇱', '🇵🇲', '🇵🇳', '🇵🇷', '🇵🇸', '🇵🇹', '🇵🇼', '🇵🇾', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇸', '🇷🇺', '🇷🇼', '🇸🇦', '🇸🇧', '🇸🇨', '🇸🇩', '🇸🇪', '🇸🇬', '🇸🇭', '🇸🇮', '🇸🇯', '🇸🇰', '🇸🇱', '🇸🇲', '🇸🇳', '🇸🇴', '🇸🇷', '🇸🇸', '🇸🇹', '🇸🇻', '🇸🇽', '🇸🇾', '🇸🇿', '🇹🇦', '🇹🇨', '🇹🇩', '🇹🇫', '🇹🇬', '🇹🇭', '🇹🇯', '🇹🇰', '🇹🇱', '🇹🇲', '🇹🇳', '🇹🇴', '🇹🇷', '🇹🇹', '🇹🇻', '🇹🇼', '🇹🇿', '🇺🇦', '🇺🇬', '🇺🇲', '🇺🇳', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦', '🇻🇨', '🇻🇪', '🇻🇬', '🇻🇮', '🇻🇳', '🇻🇺', '🇼🇫', '🇼🇸', '🇽🇰', '🇾🇪', '🇾🇹', '🇿🇦', '🇿🇲', '🇿🇼', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿']
                                };

                                // Filter emojis based on search OR active category
                                const searchLower = emojiSearchQuery.toLowerCase();
                                const filteredCategories: Record<string, string[]> = {};

                                // Show custom emojis if searching or if Custom category is active
                                const showCustom = searchLower || activeEmojiCategory === 'Custom';
                                const filteredCustom = customEmojis.filter(e =>
                                    searchLower ? e.name.toLowerCase().includes(searchLower) : activeEmojiCategory === 'Custom'
                                );

                                if (searchLower) {
                                    // When searching, show all matching emojis
                                    Object.entries(allEmojis).forEach(([category, emojis]) => {
                                        const filtered = emojis.filter(emoji => emoji.includes(searchLower));
                                        if (filtered.length > 0) {
                                            filteredCategories[category] = filtered;
                                        }
                                    });
                                } else if (activeEmojiCategory !== 'Custom') {
                                    // Show only active category (no search)
                                    const cat = activeEmojiCategory as keyof typeof allEmojis;
                                    if (allEmojis[cat]) {
                                        filteredCategories[activeEmojiCategory] = allEmojis[cat];
                                    }
                                }

                                return (
                                    <>
                                        {/* Custom Emojis */}
                                        {filteredCustom.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-xs font-semibold text-[#B5BAC1] mb-2 uppercase tracking-wide">Custom Emojis from Server</div>
                                                <div className="grid grid-cols-9 gap-1">
                                                    {filteredCustom.map((emoji) => (
                                                        <button
                                                            key={emoji.id}
                                                            onClick={() => {
                                                                if (emojiPickerTarget?.type === 'button') {
                                                                    saveCompSettings({ emoji: `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` });
                                                                } else if (emojiPickerTarget?.type === 'option' && emojiPickerTarget.optionIndex !== undefined) {
                                                                    const newOpts = [...compSettings.options];
                                                                    newOpts[emojiPickerTarget.optionIndex] = {
                                                                        ...newOpts[emojiPickerTarget.optionIndex],
                                                                        emoji: { name: emoji.name, id: emoji.id }
                                                                    };
                                                                    saveCompSettings({ options: newOpts });
                                                                }
                                                                setShowEmojiPicker(false);
                                                                setEmojiSearchQuery('');
                                                            }}
                                                            className="aspect-square p-1 hover:bg-[#404249] rounded transition flex items-center justify-center"
                                                            title={`:${emoji.name}:`}
                                                        >
                                                            <img
                                                                src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`}
                                                                alt={emoji.name}
                                                                className="w-8 h-8"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Standard Emojis */}
                                        {Object.entries(filteredCategories).map(([category, emojis]) => (
                                            <div key={category} className="mb-4">
                                                <div className="text-xs font-semibold text-[#B5BAC1] mb-2 uppercase tracking-wide">{category}</div>
                                                <div className="grid grid-cols-9 gap-1">
                                                    {emojis.map((emoji, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (emojiPickerTarget?.type === 'button') {
                                                                    saveCompSettings({ emoji });
                                                                } else if (emojiPickerTarget?.type === 'option' && emojiPickerTarget.optionIndex !== undefined) {
                                                                    const newOpts = [...compSettings.options];
                                                                    newOpts[emojiPickerTarget.optionIndex] = {
                                                                        ...newOpts[emojiPickerTarget.optionIndex],
                                                                        emoji: { name: emoji }
                                                                    };
                                                                    saveCompSettings({ options: newOpts });
                                                                }
                                                                setShowEmojiPicker(false);
                                                                setEmojiSearchQuery('');
                                                            }}
                                                            className="aspect-square p-1 hover:bg-[#404249] rounded transition flex items-center justify-center text-2xl"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {(Object.keys(filteredCategories).length === 0 && filteredCustom.length === 0) && (
                                            <div className="text-center py-8 text-[#B5BAC1]">
                                                <div className="text-4xl mb-2">😢</div>
                                                <div className="text-sm">No emojis found</div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
