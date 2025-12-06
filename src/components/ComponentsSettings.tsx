"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";

interface Role { id: string; name: string; color: number; }
interface Channel { id: string; name: string; type?: number; }

type ActionType = "add_role" | "remove_role" | "toggle_role" | "send_dm" | "send_channel" | "edit_message" | "delete_message" | "move_voice";

interface ActionConfig {
    type: ActionType;
    roles?: string[];
    message_content?: string;
    channel_id?: string;
    source_channel?: string;
    destination_channel?: string;
    user_count?: number;
    exclude_self?: boolean;
    role_mode?: "ignore" | "require" | "exclude";
    role_mode_roles?: string[];
}

interface ComponentData {
    label?: string;
    emoji?: string;
    actions: ActionConfig[];
    required_roles?: string[];
    blacklist_roles?: string[];
    cooldown?: number;
    style?: "primary" | "secondary" | "success" | "danger";
    placeholder?: string;
    min_values?: number;
    max_values?: number;
    options?: {
        label: string;
        emoji?: string;
        description?: string;
        value: string;
        actions: ActionConfig[];
    }[];
}

interface ComponentDef {
    id: number;
    guild_id: string;
    custom_id: string;
    type: "button" | "select_menu";
    name: string;
    data: ComponentData;
}

const ACTION_TYPES: { value: ActionType; label: string; icon: string; category: string }[] = [
    { value: "add_role", label: "Add roles", icon: "➕", category: "Roles" },
    { value: "remove_role", label: "Remove roles", icon: "➖", category: "Roles" },
    { value: "toggle_role", label: "Toggle roles", icon: "🔄", category: "Roles" },
    { value: "send_dm", label: "Send DM", icon: "💬", category: "Messages" },
    { value: "send_channel", label: "Send channel msg", icon: "📢", category: "Messages" },
    { value: "edit_message", label: "Edit message", icon: "✏️", category: "Messages" },
    { value: "delete_message", label: "Delete message", icon: "🗑️", category: "Messages" },
    { value: "move_voice", label: "Move users", icon: "🔊", category: "Voice" },
];

const BUTTON_STYLES = [
    { value: "primary", label: "Primary", color: "bg-blue-500" },
    { value: "secondary", label: "Secondary", color: "bg-stone-500" },
    { value: "success", label: "Success", color: "bg-emerald-500" },
    { value: "danger", label: "Danger", color: "bg-red-500" },
];

export default function ComponentsSettings({ guildId }: { guildId: string }) {
    const [components, setComponents] = useState<ComponentDef[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [showEditor, setShowEditor] = useState<{ type: "button" | "select_menu" } | null>(null);
    const [formData, setFormData] = useState<Partial<ComponentDef>>({});
    const [saving, setSaving] = useState(false);

    // For nested editing: Action of a component OR Action of an option
    const [editingAction, setEditingAction] = useState<{
        optionIndex: number | null; // null = button actions
        actionIndex: number
    } | null>(null);

    // For Select Menu Option Editing
    // We edit options inline, but manage their actions via the same system

    useEffect(() => {
        fetchAll();
    }, [guildId]);

    const fetchAll = async () => {
        try {
            const [c, r, ch] = await Promise.all([
                fetch(`/api/components?guild_id=${guildId}`).then(res => res.json()),
                fetch(`/api/roles?action=roles&guild_id=${guildId}`).then(res => res.json()),
                fetch(`/api/roles?action=channels&guild_id=${guildId}`).then(res => res.json())
            ]);
            setComponents(Array.isArray(c) ? c : []);
            setRoles(Array.isArray(r) ? r : []);
            setChannels(Array.isArray(ch) ? ch : []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Default to empty arrays on error to prevent crashes
            setComponents([]);
            setRoles([]);
            setChannels([]);
        }
    };

    const handleCreate = (type: "button" | "select_menu") => {
        setEditingId(null);
        setFormData({
            guild_id: guildId,
            type,
            name: "",
            custom_id: "",
            data: type === "button" ? {
                label: "New Button", style: "primary", actions: [], required_roles: [], blacklist_roles: [], cooldown: 0
            } : {
                placeholder: "Select option", min_values: 1, max_values: 1, options: [], actions: [] // actions unused for menu root usually
            }
        });
        setShowEditor({ type });
    };

    const handleEdit = (comp: ComponentDef) => {
        setEditingId(comp.id);
        const data = typeof comp.data === 'string' ? JSON.parse(comp.data) : comp.data;
        setFormData({ ...comp, data });
        setShowEditor({ type: comp.type });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this component?")) return;
        await fetch(`/api/components?id=${id}&guild_id=${guildId}`, { method: "DELETE" });
        fetchAll();
    };

    const handleSave = async () => {
        if (!formData.name || !formData.custom_id) return alert("Missing fields");
        setSaving(true);
        const method = editingId ? "PUT" : "POST";
        await fetch("/api/components", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, id: editingId })
        });
        setSaving(false);
        setShowEditor(null);
        fetchAll();
    };

    const updateData = (updates: Partial<ComponentData>) => {
        setFormData(p => ({ ...p, data: { ...p.data!, ...updates } }));
    };

    // Action Helpers
    const getActions = (optionIndex: number | null) => {
        if (optionIndex === null) return formData.data?.actions || [];
        return formData.data?.options?.[optionIndex]?.actions || [];
    };

    const updateActions = (optionIndex: number | null, newActions: ActionConfig[]) => {
        if (optionIndex === null) {
            updateData({ actions: newActions });
        } else {
            const newOptions = [...(formData.data?.options || [])];
            if (newOptions[optionIndex]) {
                newOptions[optionIndex] = { ...newOptions[optionIndex], actions: newActions };
                updateData({ options: newOptions });
            }
        }
    };

    const textChannels = channels.filter(c => !c.type || c.type === 0);
    const voiceChannels = channels.filter(c => c.type === 2);

    return (
        <div className="space-y-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-100 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl grayscale">🧩</div>
                <h1 className="text-4xl font-black text-stone-800 mb-2">Components Manager</h1>
                <p className="text-stone-500">Create reusable interactive components for your messages.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Buttons List */}
                <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 flex flex-col h-[600px] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-stone-800">Custom Buttons</h2>
                        <button onClick={() => handleCreate("button")} className="bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded-xl text-white font-bold transition shadow-md shadow-amber-200">Create</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-stone-300">
                        {components.filter(c => c.type === "button").map(c => (
                            <div key={c.id} className="bg-stone-50 p-4 rounded-xl border-2 border-stone-100 hover:border-amber-300 transition flex justify-between items-center group">
                                <div>
                                    <div className="font-bold text-stone-800">{c.name}</div>
                                    <div className="font-mono text-xs text-stone-500 bg-stone-200 px-1 rounded inline-block">{c.custom_id}</div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => handleEdit(c)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 rounded-lg font-bold">✏️</button>
                                    <button onClick={() => handleDelete(c.id)} className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg font-bold">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Select Menus List */}
                <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 flex flex-col h-[600px] shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-stone-800">Custom Select Menus</h2>
                        <button onClick={() => handleCreate("select_menu")} className="bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded-xl text-white font-bold transition shadow-md shadow-amber-200">Create</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-stone-300">
                        {components.filter(c => c.type === "select_menu").map(c => (
                            <div key={c.id} className="bg-stone-50 p-4 rounded-xl border-2 border-stone-100 hover:border-amber-300 transition flex justify-between items-center group">
                                <div>
                                    <div className="font-bold text-stone-800">{c.name}</div>
                                    <div className="font-mono text-xs text-stone-500 bg-stone-200 px-1 rounded inline-block">{c.custom_id}</div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => handleEdit(c)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 rounded-lg font-bold">✏️</button>
                                    <button onClick={() => handleDelete(c.id)} className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg font-bold">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* EDITOR MODAL */}
            {showEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowEditor(null)}>
                    <div className="bg-white w-full max-w-5xl max-h-[80vh] rounded-3xl border-2 border-amber-200 flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-stone-200">
                            <h2 className="text-2xl font-black text-stone-800 flex items-center gap-3">
                                {showEditor.type === "button" ? "🔘 Button Editor" : "📋 Select Menu Editor"}
                                <span className="text-sm font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">{formData.custom_id || 'base_id'}</span>
                            </h2>
                            <button onClick={() => setShowEditor(null)} className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold transition">×</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-stone-50/50">
                            {/* Basic Identity */}
                            <div className="grid grid-cols-2 gap-6 p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">NAME (DASHBOARD ONLY)</label>
                                    <input type="text" value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-400 font-bold" placeholder="e.g. Verify Button" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">CUSTOM ID (UNIQUE)</label>
                                    <input type="text" value={formData.custom_id || ''} onChange={e => setFormData(p => ({ ...p, custom_id: e.target.value }))} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-mono focus:outline-none focus:border-amber-400" placeholder="verify_btn" />
                                </div>
                            </div>

                            {/* Button Specifics */}
                            {showEditor.type === "button" && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-stone-800 mb-4">Button Appearance</h3>
                                        <div className="flex flex-wrap items-end gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">EMOJI</label>
                                                <EmojiPicker value={formData.data?.emoji || ''} onChange={e => updateData({ emoji: e })} />
                                            </div>
                                            <div className="flex-1 min-w-[200px]">
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">LABEL</label>
                                                <input type="text" value={formData.data?.label || ''} onChange={e => updateData({ label: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">STYLE</label>
                                                <div className="flex gap-2">
                                                    {BUTTON_STYLES.map(s => (
                                                        <button key={s.value} onClick={() => updateData({ style: s.value as any })} className={`w-12 h-12 rounded-xl ${s.color} transition ${formData.data?.style === s.value ? 'ring-4 ring-amber-200 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}></button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Manager (Button) - Passing null as optionIndex */}
                                    <ActionManager
                                        actions={getActions(null)}
                                        onUpdate={(acts: ActionConfig[]) => updateActions(null, acts)}
                                        roles={roles}
                                        channels={textChannels}
                                        voiceChannels={voiceChannels}
                                        editingAction={editingAction?.optionIndex === null ? editingAction : null} // Only pass if optionIndex matches
                                        setEditingAction={(idx: number) => setEditingAction({ optionIndex: null, actionIndex: idx })}
                                        closeEditor={() => setEditingAction(null)}
                                    />

                                    {/* Requirements */}
                                    <div className="p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-stone-800 mb-4">Usage Requirements</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <label className="lex-shrink-0 text-sm text-stone-500 font-bold">Cooldown (seconds)</label>
                                                <input type="number" value={formData.data?.cooldown || 0} onChange={e => updateData({ cooldown: parseInt(e.target.value) })} className="w-24 bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-amber-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Select Menu Specifics */}
                            {showEditor.type === "select_menu" && (
                                <div className="space-y-6">
                                    <div className="p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-stone-800 mb-4">Menu Configuration</h3>
                                        <div className="grid grid-cols-3 gap-4 mb-4">
                                            <div className="col-span-3">
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">PLACEHOLDER</label>
                                                <input type="text" value={formData.data?.placeholder || ''} onChange={e => updateData({ placeholder: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">MIN VALUES</label>
                                                <input type="number" value={formData.data?.min_values || 1} onChange={e => updateData({ min_values: parseInt(e.target.value) })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-400" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-stone-500 mb-1 block">MAX VALUES</label>
                                                <input type="number" value={formData.data?.max_values || 1} onChange={e => updateData({ max_values: parseInt(e.target.value) })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:border-amber-400" />
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-stone-800">Menu Options</h4>
                                                <button onClick={() => {
                                                    const opts = formData.data?.options || [];
                                                    updateData({ options: [...opts, { label: "New Option", value: `opt_${Date.now()}`, actions: [] }] });
                                                }} className="text-emerald-500 hover:text-emerald-600 font-bold text-sm bg-emerald-100 px-3 py-1.5 rounded-lg transition">+ Add Option</button>
                                            </div>

                                            <div className="space-y-3">
                                                {(formData.data?.options || []).map((opt, idx) => (
                                                    <div key={idx} className="bg-stone-50 border-2 border-stone-200 rounded-xl p-4">
                                                        <div className="flex gap-3 mb-3">
                                                            <div className="w-1/3">
                                                                <input type="text" value={opt.label} onChange={e => {
                                                                    const newOpts = [...(formData.data?.options || [])];
                                                                    newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                                                    updateData({ options: newOpts });
                                                                }} placeholder="Label" className="w-full bg-white border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-amber-400" />
                                                            </div>
                                                            <div className="w-1/3">
                                                                <input type="text" value={opt.value} onChange={e => {
                                                                    const newOpts = [...(formData.data?.options || [])];
                                                                    newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                                                                    updateData({ options: newOpts });
                                                                }} placeholder="Value" className="w-full bg-white border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm font-mono focus:outline-none focus:border-amber-400" />
                                                            </div>
                                                            <div className="w-1/3 flex items-center gap-2">
                                                                <EmojiPicker value={opt.emoji || ''} onChange={e => {
                                                                    const newOpts = [...(formData.data?.options || [])];
                                                                    newOpts[idx] = { ...newOpts[idx], emoji: e };
                                                                    updateData({ options: newOpts });
                                                                }} />
                                                                <button onClick={() => {
                                                                    const newOpts = (formData.data?.options || []).filter((_, i) => i !== idx);
                                                                    updateData({ options: newOpts });
                                                                }} className="ml-auto text-red-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg">🗑️</button>
                                                            </div>
                                                        </div>

                                                        {/* Nested Action Manager for Option */}
                                                        <ActionManager
                                                            actions={getActions(idx)}
                                                            onUpdate={(acts: ActionConfig[]) => updateActions(idx, acts)}
                                                            roles={roles}
                                                            channels={textChannels}
                                                            voiceChannels={voiceChannels}
                                                            editingAction={editingAction?.optionIndex === idx ? editingAction : null}
                                                            setEditingAction={(actIdx: number) => setEditingAction({ optionIndex: idx, actionIndex: actIdx })}
                                                            closeEditor={() => setEditingAction(null)}
                                                            mini
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-stone-200 flex justify-end gap-3 bg-white rounded-b-3xl">
                            <button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 px-8 py-3 rounded-xl text-white font-black transition disabled:opacity-50 shadow-lg shadow-emerald-200">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for Action Management to avoid duplication
function ActionManager({ actions, onUpdate, roles, channels, voiceChannels, editingAction, setEditingAction, closeEditor, mini }: any) {
    const [showDropdown, setShowDropdown] = useState(false);

    const addAction = (type: ActionType) => {
        onUpdate([...actions, { type }]);
        setShowDropdown(false);
    };

    const removeAction = (index: number) => {
        onUpdate(actions.filter((_: any, i: number) => i !== index));
        closeEditor();
    };

    const updateCurrentAction = (updates: Partial<ActionConfig>) => {
        if (!editingAction) return;
        const newActions = [...actions];
        newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], ...updates };
        onUpdate(newActions);
    };

    const currentAction = editingAction ? actions[editingAction.actionIndex] : null;

    return (
        <div className={`rounded-xl border-2 border-stone-200 bg-stone-50 ${mini ? 'p-3' : 'p-6'}`}>
            <div className="flex justify-between items-center mb-4">
                <h4 className={`font-bold text-stone-700 ${mini ? 'text-sm' : 'text-lg'}`}>⚡ Actions ({actions.length})</h4>
                <div className="relative">
                    <button onClick={() => setShowDropdown(!showDropdown)} className="bg-stone-200 hover:bg-stone-300 px-3 py-1 rounded-lg text-stone-700 text-xs font-bold transition flex items-center gap-1">
                        + Add Action {showDropdown ? '▲' : '▼'}
                    </button>
                    {showDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-stone-100 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="fixed inset-0 z-[-1]" onClick={() => setShowDropdown(false)}></div>
                            {ACTION_TYPES.map(t => (
                                <button key={t.value} onClick={() => addAction(t.value)} className="w-full text-left px-4 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-sm flex items-center gap-2 font-medium transition-colors">
                                    <span>{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {actions.map((act: any, i: number) => (
                    <button key={i} onClick={() => setEditingAction(i)} className="bg-white hover:bg-stone-100 px-3 py-1.5 rounded-lg text-stone-700 text-sm font-bold flex items-center gap-2 border-2 border-stone-200 transition shadow-sm">
                        {ACTION_TYPES.find(t => t.value === act.type)?.icon}
                        {ACTION_TYPES.find(t => t.value === act.type)?.label}
                        <span className="opacity-50 text-xs">⚙️</span>
                    </button>
                ))}
            </div>

            {/* ACTION EDITOR DETAIL */}
            {currentAction && (
                <div className="bg-white rounded-xl p-4 border-2 border-stone-200 mt-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-stone-100">
                        <div className="font-bold text-stone-800 flex items-center gap-2">
                            <span className="text-xl">{ACTION_TYPES.find(t => t.value === currentAction.type)?.icon}</span>
                            {ACTION_TYPES.find(t => t.value === currentAction.type)?.label}
                        </div>
                        <button onClick={() => removeAction(editingAction.actionIndex)} className="text-red-400 text-xs font-bold hover:text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition">Delete Action</button>
                    </div>

                    {/* Dynamic Fields based on Action Type */}
                    <div className="space-y-4">
                        {["add_role", "remove_role", "toggle_role"].includes(currentAction.type) && (
                            <div>
                                <label className="text-xs font-bold text-stone-500 mb-2 block">SELECT ROLES</label>
                                <select onChange={e => e.target.value && updateCurrentAction({ roles: [...(currentAction.roles || []), e.target.value] })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm mb-2 focus:outline-none focus:border-amber-400 font-medium">
                                    <option value="">+ Add Role</option>
                                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <div className="flex flex-wrap gap-2">
                                    {(currentAction.roles || []).map((rid: string) => {
                                        const r = roles.find((role: any) => role.id === rid);
                                        return r ? <span key={rid} className="px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-600 flex items-center gap-1 font-bold shadow-sm">
                                            <span className="w-2 h-2 rounded-full" style={{ background: `#${r.color.toString(16)}` }}></span>
                                            {r.name}
                                            <button onClick={() => updateCurrentAction({ roles: currentAction.roles.filter((x: string) => x !== rid) })} className="hover:text-red-500 text-stone-400">×</button>
                                        </span> : null
                                    })}
                                </div>
                            </div>
                        )}

                        {["send_dm", "send_channel"].includes(currentAction.type) && (
                            <>
                                {currentAction.type === "send_channel" && (
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 mb-1 block">CHANNEL</label>
                                        <select value={currentAction.channel_id || ''} onChange={e => updateCurrentAction({ channel_id: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-amber-400">
                                            <option value="">Select Channel</option>
                                            {channels.map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">MESSAGE CONTENT</label>
                                    <textarea value={currentAction.message_content || ''} onChange={e => updateCurrentAction({ message_content: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm min-h-[80px] focus:outline-none focus:border-amber-400" placeholder="Hello there!"></textarea>
                                </div>
                            </>
                        )}

                        {currentAction.type === "move_voice" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">FROM CHANNEL</label>
                                    <select value={currentAction.source_channel || ''} onChange={e => updateCurrentAction({ source_channel: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-amber-400">
                                        <option value="">Any / Specific</option>
                                        {voiceChannels.map((c: any) => <option key={c.id} value={c.id}>🔊 {c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">TO CHANNEL</label>
                                    <select value={currentAction.destination_channel || ''} onChange={e => updateCurrentAction({ destination_channel: e.target.value })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-amber-400">
                                        <option value="">Select Channel</option>
                                        {voiceChannels.map((c: any) => <option key={c.id} value={c.id}>🔊 {c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 mb-1 block">USER COUNT (0=ALL)</label>
                                    <input type="number" value={currentAction.user_count || 0} onChange={e => updateCurrentAction({ user_count: parseInt(e.target.value) })} className="w-full bg-stone-50 border-2 border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-amber-400" />
                                </div>
                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer font-bold">
                                        <input type="checkbox" checked={currentAction.exclude_self || false} onChange={e => updateCurrentAction({ exclude_self: e.target.checked })} className="w-4 h-4 text-emerald-500 rounded border-stone-300 focus:ring-emerald-500" />
                                        Exclude Self
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 text-center">
                        <button onClick={closeEditor} className="text-emerald-500 text-sm font-bold hover:underline">Done Editing Action</button>
                    </div>
                </div>
            )}
        </div>
    );
}
