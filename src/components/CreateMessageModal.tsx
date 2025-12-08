"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "./EmojiPicker";
import {
    ReactionRoleMessage,
    Channel,
    Role,
    EmbedData,
    Component,
    SelectOption,
    BotAction
} from "../types";

// --- Helper Components ---

const AccordionItem = ({ title, children, isOpen, onToggle, extraActions }: { title: React.ReactNode, children: React.ReactNode, isOpen: boolean, onToggle: () => void, extraActions?: React.ReactNode }) => (
    <div className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-sm transition-all duration-200">
        <div
            className="flex items-center justify-between p-4 bg-stone-50 cursor-pointer hover:bg-stone-100 transition select-none"
            onClick={onToggle}
        >
            <div className="flex items-center gap-3 font-bold text-stone-700">
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                {title}
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {extraActions}
            </div>
        </div>
        {isOpen && (
            <div className="p-4 border-t border-stone-200 animate-slide-down">
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
        <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Embed Header */}
            <div className="flex items-center justify-between p-3 bg-stone-100 border-b border-stone-200">
                <div className="font-bold text-sm text-stone-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: embed.color || '#FFD700' }}></span>
                    Embed #{index + 1}
                </div>
                <button onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded text-xs font-bold transition">
                    🗑️ Delete Embed
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b border-stone-200 overflow-x-auto no-scrollbar">
                {(['body', 'author', 'fields', 'footer', 'images'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wide transition border-b-2 flex-shrink-0 ${activeTab === tab ? 'text-amber-600 border-amber-500 bg-amber-50/50' : 'text-stone-500 border-transparent hover:text-stone-700 hover:bg-stone-50'}`}
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
                            <label className="text-xs font-bold text-stone-500 uppercase">Title</label>
                            <input
                                value={embed.title}
                                onChange={e => onChange({ title: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none transition"
                                placeholder="Embed Title"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Description</label>
                            <textarea
                                value={embed.description}
                                onChange={e => onChange({ description: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none h-24 resize-y transition"
                                placeholder="Embed Description"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-stone-500 uppercase">Title URL</label>
                                <input
                                    value={embed.url || ''}
                                    onChange={e => onChange({ url: e.target.value })}
                                    className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none transition"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs font-bold text-stone-500 uppercase">Color</label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={embed.color || '#FFD700'}
                                        onChange={e => onChange({ color: e.target.value })}
                                        className="h-10 w-12 rounded cursor-pointer border-0 p-0"
                                    />
                                    <input
                                        value={embed.color || '#FFD700'}
                                        onChange={e => onChange({ color: e.target.value })}
                                        className="flex-1 p-2 border border-stone-200 rounded-lg uppercase text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'author' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Author Name</label>
                            <input
                                value={embed.author_name}
                                onChange={e => onChange({ author_name: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="Author Name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Author URL</label>
                            <input
                                value={embed.author_url || ''}
                                onChange={e => onChange({ author_url: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Author Icon URL</label>
                            <input
                                value={embed.author_icon_url}
                                onChange={e => onChange({ author_icon_url: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {activeTab === 'fields' && (
                    <div className="space-y-3">
                        {embed.fields.map((field, idx) => (
                            <div key={idx} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                <span className="text-xs font-bold text-stone-300 mt-2">#{idx + 1}</span>
                                <div className="flex-1 space-y-2">
                                    <input
                                        value={field.name}
                                        onChange={e => {
                                            const newFields = [...embed.fields];
                                            newFields[idx].name = e.target.value;
                                            onChange({ fields: newFields });
                                        }}
                                        className="w-full p-1.5 text-sm border border-stone-200 rounded focus:border-amber-400 outline-none font-bold"
                                        placeholder="Field Name"
                                    />
                                    <textarea
                                        value={field.value}
                                        onChange={e => {
                                            const newFields = [...embed.fields];
                                            newFields[idx].value = e.target.value;
                                            onChange({ fields: newFields });
                                        }}
                                        className="w-full p-1.5 text-sm border border-stone-200 rounded focus:border-amber-400 outline-none resize-none h-16"
                                        placeholder="Field Value"
                                    />
                                    <label className="flex items-center gap-2 text-xs text-stone-500 font-bold cursor-pointer select-none">
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
                                    className="text-stone-300 hover:text-red-500 px-2"
                                    title="Remove Field"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => onChange({ fields: [...embed.fields, { name: '', value: '', inline: false }] })}
                            className="w-full py-2 border-2 border-dashed border-stone-300 text-stone-400 font-bold rounded-lg hover:border-amber-400 hover:text-amber-500 transition"
                        >
                            + Add Field
                        </button>
                    </div>
                )}

                {activeTab === 'footer' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Footer Text</label>
                            <input
                                value={embed.footer_text}
                                onChange={e => onChange({ footer_text: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="Footer Text"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Footer Icon URL</label>
                            <input
                                value={embed.footer_icon_url}
                                onChange={e => onChange({ footer_icon_url: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                    </>
                )}

                {activeTab === 'images' && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Image URL (Large)</label>
                            <input
                                value={embed.image_url}
                                onChange={e => onChange({ image_url: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 uppercase">Thumbnail URL (Small)</label>
                            <input
                                value={embed.thumbnail_url}
                                onChange={e => onChange({ thumbnail_url: e.target.value })}
                                className="w-full mt-1 p-2 border border-stone-200 rounded-lg focus:border-amber-400 outline-none"
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
        <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onDelete} className="text-stone-400 hover:text-red-500 font-bold p-1">×</button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Action #{index + 1}</label>
                    <select
                        value={action.type || ''}
                        onChange={(e) => onChange({ type: e.target.value })}
                        className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400 font-medium text-sm"
                    >
                        <option value="">Select Action Type...</option>
                        <option value="add_role">Add Role</option>
                        <option value="remove_role">Remove Role</option>
                        <option value="toggle_role">Toggle Role</option>
                        <option value="send_message">Send Message (Reply)</option>
                        <option value="send_message_channel">Send Message to Channel</option>
                        <option value="dm_user">DM User</option>
                        <option value="move_voice">Move User to Voice Channel</option>
                    </select>
                </div>

                {/* Role Selector for Role Actions */}
                {['add_role', 'remove_role', 'toggle_role', 'set_role'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Target Role</label>
                        <select
                            value={action.role_id || ''}
                            onChange={(e) => onChange({ role_id: e.target.value })}
                            className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400 text-sm"
                        >
                            <option value="">Select Role...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Message Content for Message Actions */}
                {['send_message', 'send_message_channel', 'dm_user'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Message Content</label>
                        <textarea
                            value={action.message_content || ''}
                            onChange={(e) => onChange({ message_content: e.target.value })}
                            className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400 text-sm h-20 resize-y"
                            placeholder="Type your message here..."
                        />
                    </div>
                )}

                {/* Channel Selector for Channel Actions */}
                {['send_message_channel', 'move_voice'].includes(action.type || '') && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-stone-500 mb-1 uppercase">Target Channel</label>
                        <select
                            value={action.target_channel_id || ''}
                            onChange={(e) => onChange({ target_channel_id: e.target.value })}
                            className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400 text-sm"
                        >
                            <option value="">Select Channel...</option>
                            {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Custom Success/Failure Messages */}
                {action.type && action.type !== '' && (
                    <div className="space-y-3 pt-2 border-t border-stone-200">
                        <div>
                            <label className="block text-xs font-bold text-stone-400 mb-1 uppercase">Success Message (Optional)</label>
                            <input
                                value={action.success_message || ''}
                                onChange={(e) => onChange({ success_message: e.target.value })}
                                className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-green-400 text-sm placeholder-stone-300"
                                placeholder="e.g. Role added successfully!"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-400 mb-1 uppercase">Failure Message (Optional)</label>
                            <input
                                value={action.failure_message || ''}
                                onChange={(e) => onChange({ failure_message: e.target.value })}
                                className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-red-400 text-sm placeholder-stone-300"
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
                <label className="text-sm font-bold text-stone-600">Actions ({actions.length})</label>
                <button
                    onClick={addAction}
                    disabled={actions.length >= 5}
                    className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="text-center p-4 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-sm">
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
    const [editingMsg, setEditingMsg] = useState<ReactionRoleMessage>(createDefaultMessage());
    const [targetChannel, setTargetChannel] = useState<string>("");

    // UI State for Editor
    const [openSections, setOpenSections] = useState<string[]>(['content', 'embeds', 'components']);
    const [sending, setSending] = useState(false);

    // Component Editor State
    const [activeComponent, setActiveComponent] = useState<{ row: number, col: number } | null>(null);
    const [compSettings, setCompSettings] = useState<Component | null>(null);

    // Notification State
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialMessage) {
                setEditingMsg(initialMessage);
            } else {
                setEditingMsg(createDefaultMessage());
            }
            setTargetChannel(initialMessage?.channel_id || "");
            setOpenSections(['content', 'embeds', 'components']);
            setActiveComponent(null);
            setCompSettings(null);
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
    const preview = (text: string) => text
        .replace(/{user}/g, '@User')
        .replace(/{user\.name}/g, 'User')
        .replace(/{server}/g, 'Server Name')
        .replace(/{role}/g, 'Role Name');

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
                                <div key={i} className="bg-[#2B2D31] rounded max-w-[520px] grid" style={{ borderLeft: `4px solid ${e.color || '#202225'}` }}>
                                    <div className="p-4 space-y-2">
                                        {(e.author_name) && (
                                            <div className="flex items-center gap-2 text-sm font-bold text-white">
                                                {e.author_icon_url && <PreviewImage src={e.author_icon_url} className="w-6 h-6 rounded-full object-cover" />}
                                                <span>{preview(e.author_name)}</span>
                                            </div>
                                        )}
                                        {e.title && <div className="font-bold text-white hover:underline cursor-pointer">{preview(e.title)}</div>}
                                        {e.description && <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap">{preview(e.description)}</div>}

                                        {e.fields && e.fields.length > 0 && (
                                            <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                                                {e.fields.map((field, idx) => (
                                                    <div key={idx} className={field.inline ? 'inline-block' : 'col-span-full'}>
                                                        <div className="font-bold text-sm text-[#DBDEE1] mb-1">{field.name}</div>
                                                        <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap">{field.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {e.image_url && <PreviewImage src={e.image_url} className="rounded max-w-full mt-2 max-h-[300px] object-cover" />}

                                        {(e.footer_text || e.footer_icon_url) && (
                                            <div className="flex items-center gap-2 text-xs text-[#949BA4] pt-1">
                                                {e.footer_icon_url && <PreviewImage src={e.footer_icon_url} className="w-5 h-5 rounded-full object-cover" />}
                                                <span>{preview(e.footer_text)}</span>
                                            </div>
                                        )}
                                    </div>
                                    {e.thumbnail_url && (
                                        <div className="absolute top-4 right-4 w-20 h-20">
                                            <PreviewImage src={e.thumbnail_url} className="w-full h-full rounded object-cover" />
                                        </div>
                                    )}
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-scale-in">

                {/* Top Bar */}
                <div className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="text-2xl text-stone-400 hover:text-stone-600">✕</button>
                        <h2 className="text-xl font-black text-stone-800">
                            {isEditing ? 'Edit Message' : 'Create Message'}
                        </h2>
                    </div>
                    <div className="flex gap-4 items-center">
                        {!disableChannelSelect && (
                            <select
                                value={targetChannel}
                                onChange={(e) => setTargetChannel(e.target.value)}
                                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg font-bold text-stone-600 outline-none focus:border-amber-400"
                            >
                                <option value="">Select Channel...</option>
                                {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                            </select>
                        )}
                        <button
                            onClick={handleSendMessage}
                            disabled={sending}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50"
                        >
                            {sending ? 'Sending...' : saveLabel}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT COLUMN: Editor inputs */}
                    <div className="w-1/2 overflow-y-auto p-8 space-y-6">

                        {/* 1. Message Content */}
                        <AccordionItem
                            title="Message Content"
                            isOpen={openSections.includes('content')}
                            onToggle={() => toggleSection('content')}
                        >
                            <textarea
                                className="w-full h-32 p-3 bg-stone-50 border border-stone-200 rounded-xl focus:border-amber-400 outline-none resize-none"
                                placeholder="Message content (above embeds)..."
                                value={editingMsg.message_content}
                                onChange={e => setEditingMsg({ ...editingMsg, message_content: e.target.value })}
                            />
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
                                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold hover:bg-amber-200 transition"
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
                                {editingMsg.embeds.length === 0 && <div className="text-center text-stone-400 italic py-4">No embeds added.</div>}
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
                                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 transition"
                                >
                                    + Row
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                {(editingMsg.component_rows || []).map((row, ri) => (
                                    <div key={ri} className="p-4 bg-stone-50 rounded-xl border border-stone-200 relative">
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <span className="text-xs font-bold text-stone-400 uppercase">Row {ri + 1}</span>
                                            <button onClick={() => { const rows = [...editingMsg.component_rows!]; rows.splice(ri, 1); setEditingMsg({ ...editingMsg, component_rows: rows }) }} className="text-stone-400 hover:text-red-500 font-bold">×</button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center mt-4">
                                            {row.map((comp, ci) => (
                                                <button
                                                    key={ci}
                                                    onClick={() => { setActiveComponent({ row: ri, col: ci }); setCompSettings(comp); }}
                                                    className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition flex items-center gap-2 bg-white border-stone-200 hover:border-amber-400 ${comp.type === 3 ? 'w-full justify-between' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {comp.emoji && renderEmoji(comp.emoji)}
                                                        {comp.label || comp.placeholder}
                                                    </div>
                                                    {comp.type === 3 && <span className="text-xs text-stone-400">▼</span>}
                                                </button>
                                            ))}

                                            {/* Add Buttons Logic */}
                                            <div className="flex items-center gap-2">
                                                {(row.length === 0 || (row.length < 5 && !row.some(c => c.type === 3))) && (
                                                    <button
                                                        onClick={() => addComponentData(ri, 'button')}
                                                        className="px-3 py-1.5 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-amber-400 hover:text-amber-600 text-xs font-bold transition"
                                                    >
                                                        + Button
                                                    </button>
                                                )}
                                                {(row.length === 0) && (
                                                    <button
                                                        onClick={() => addComponentData(ri, 'select_menu')}
                                                        className="px-3 py-1.5 rounded-lg border-2 border-dashed border-stone-300 text-stone-500 hover:border-indigo-400 hover:text-indigo-600 text-xs font-bold transition"
                                                    >
                                                        + Select Menu
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(editingMsg.component_rows || []).length === 0 && <div className="text-center text-stone-400 italic py-2">No components. Add a row to start.</div>}
                            </div>
                        </AccordionItem>

                    </div>

                    {/* RIGHT COLUMN: Live Preview */}
                    <div className="w-1/2 bg-[#2f3136] p-8 overflow-y-auto flex flex-col items-center">
                        <h3 className="text-xs font-black text-[#72767d] uppercase tracking-widest mb-6 select-none">Live Preview</h3>
                        <div className="w-full max-w-[550px] scale-95 origin-top">
                            {renderPreview()}
                        </div>
                    </div>
                </div>

                {/* Component Edit Modal Overlay */}
                {activeComponent && compSettings && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl w-[600px] border border-stone-200 animate-scale-in max-h-[85vh] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4 text-stone-800">
                                Edit {compSettings.type === 2 ? 'Button' : 'Select Menu'}
                            </h3>
                            <div className="space-y-4">
                                {/* Label / Placeholder */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-400 mb-1">
                                        {compSettings.type === 2 ? 'Label' : 'Placeholder'}
                                    </label>
                                    <input
                                        value={compSettings.label || compSettings.placeholder || ''}
                                        onChange={(e) => compSettings && saveCompSettings(compSettings.type === 2 ? { label: e.target.value } : { placeholder: e.target.value })}
                                        className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400"
                                    />
                                </div>



                                {/* BUTTON SPECIFIC: Emoji & Style */}
                                {compSettings.type === 2 && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-400 mb-1">Emoji</label>
                                            <EmojiPicker value={compSettings.emoji || ''} onChange={(val) => saveCompSettings({ emoji: val })} className="w-full" guildId={guildId} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-400 mb-1">Style</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => saveCompSettings({ style: s })}
                                                        className={`w-8 h-8 rounded-full border-2 ${compSettings && compSettings.style === s ? 'border-amber-500' : 'border-transparent'} transition transform hover:scale-110`}
                                                        style={{ backgroundColor: s === 1 ? '#5865F2' : s === 2 ? '#4F545C' : s === 3 ? '#2D7D46' : s === 4 ? '#ED4245' : '#4F545C' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Button Action Config */}
                                        <div className="pt-2 border-t border-stone-100">
                                            <ActionManager
                                                actions={compSettings.actions || []}
                                                onChange={(arr) => saveCompSettings({ actions: arr })}
                                                roles={roles}
                                                channels={channels}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* SELECT MENU SPECIFIC: Options */}
                                {compSettings.type === 3 && (
                                    <div className="space-y-3">
                                        {/* Allow Multiple Selections Toggle */}
                                        <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg">
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
                                                className="w-5 h-5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
                                            />
                                            <label htmlFor="allow-multiple-modal" className="text-stone-700 font-bold cursor-pointer select-none">
                                                Allow Multiple Selections
                                            </label>
                                            <span className="text-stone-400 text-xs ml-auto">
                                                {(compSettings.max_values || 1) > 1
                                                    ? `Up to ${compSettings.max_values} options`
                                                    : "Single selection only"}
                                            </span>
                                        </div>

                                        {/* Min/Max controls if multiple is enabled */}
                                        {(compSettings.max_values || 1) > 1 && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-400 mb-1">Min Selections</label>
                                                    <input
                                                        type="number"
                                                        value={compSettings.min_values || 0}
                                                        onChange={(e) => saveCompSettings({ min_values: parseInt(e.target.value) || 0 })}
                                                        className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400"
                                                        min="0" max="25"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-400 mb-1">Max Selections</label>
                                                    <input
                                                        type="number"
                                                        value={compSettings.max_values || 1}
                                                        onChange={(e) => saveCompSettings({ max_values: parseInt(e.target.value) || 1 })}
                                                        className="w-full p-2 border border-stone-200 rounded-lg outline-none focus:border-amber-400"
                                                        min="1" max="25"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-stone-400">Menu Options</label>
                                            <button
                                                onClick={() => {
                                                    const newOptions = [...(compSettings?.options || []), { label: 'New Option', value: `option_${Date.now()}`, description: '' }];
                                                    saveCompSettings({ options: newOptions });
                                                }}
                                                className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold hover:bg-amber-200 transition"
                                                disabled={(compSettings.options || []).length >= 25}
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                            {(compSettings.options || []).map((opt, idx) => (
                                                <div key={idx} className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="text-xs font-bold text-stone-400 uppercase">Option {idx + 1}</div>
                                                        <button
                                                            onClick={() => {
                                                                if (!compSettings) return;
                                                                const newOptions = compSettings.options!.filter((_, i) => i !== idx);
                                                                saveCompSettings({ options: newOptions });
                                                            }}
                                                            className="text-stone-300 hover:text-red-500"
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
                                                            className="w-full p-2 border border-stone-200 rounded focus:border-amber-400 outline-none text-sm font-bold"
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
                                                            className="w-full p-2 border border-stone-200 rounded focus:border-amber-400 outline-none text-sm font-mono text-stone-500"
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
                                                            className="flex-1 p-2 border border-stone-200 rounded focus:border-amber-400 outline-none text-sm"
                                                            placeholder="Description (optional)"
                                                        />
                                                    </div>

                                                    {/* Option Action Config */}
                                                    <div className="mt-2 pt-2 border-t border-stone-200">
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
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => { if (activeComponent) removeComponent(activeComponent.row, activeComponent.col); setActiveComponent(null); }} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg font-bold">Delete</button>
                                <button onClick={() => { setActiveComponent(null); setCompSettings(null); }} className="px-4 py-2 bg-stone-800 text-white rounded-lg font-bold">Done</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >,
        document.body
    );
}
