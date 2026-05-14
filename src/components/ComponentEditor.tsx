"use client";

import { useState, useRef, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";

interface Role { id: string; name: string; color: number; }
interface Channel { id: string; name: string; type?: number; }

// Action types
type ActionType =
    | "add_role"
    | "remove_role"
    | "toggle_role"
    | "send_dm"
    | "send_channel"
    | "edit_message"
    | "delete_message"
    | "move_voice";

interface ActionConfig {
    type: ActionType;
    roles?: string[];
    message_content?: string;
    channel_id?: string;
    // Move voice options
    source_channel?: string;
    destination_channel?: string;
    user_count?: number;
    exclude_self?: boolean;
    role_mode?: "ignore" | "require" | "exclude";
    role_mode_roles?: string[];
}

interface ComponentButton {
    id: string;
    type: "button";
    label: string;
    emoji: string;
    style: "primary" | "secondary" | "success" | "danger";
    actions: ActionConfig[];
    required_roles?: string[];
    blacklist_roles?: string[];
    cooldown?: number;
}

interface ComponentSelectMenu {
    id: string;
    type: "select_menu";
    placeholder: string;
    min_values?: number;
    max_values?: number;
    options: {
        label: string;
        emoji?: string;
        description?: string;
        value: string;
        actions: ActionConfig[];
    }[];
}

type ComponentItem = ComponentButton | ComponentSelectMenu;

interface ComponentRow {
    components: ComponentItem[];
}

interface ComponentEditorProps {
    rows: ComponentRow[];
    onChange: (rows: ComponentRow[]) => void;
    roles: Role[];
    channels: Channel[];
    guildId?: string;
}

const ACTION_TYPES: { value: ActionType; label: string; icon: string; category: string }[] = [
    { value: "add_role", label: "Add roles", icon: "➕", category: "Roles" },
    { value: "remove_role", label: "Remove roles", icon: "➖", category: "Roles" },
    { value: "toggle_role", label: "Toggle roles", icon: "🔄", category: "Roles" },
    { value: "send_dm", label: "Send DM", icon: "💬", category: "Messages" },
    { value: "send_channel", label: "Send channel message", icon: "📢", category: "Messages" },
    { value: "edit_message", label: "Edit message", icon: "✏️", category: "Messages" },
    { value: "delete_message", label: "Delete message", icon: "🗑️", category: "Messages" },
    { value: "move_voice", label: "Move users in voice", icon: "🔊", category: "Voice" },
];

const BUTTON_STYLES: { value: string; label: string; color: string }[] = [
    { value: "primary", label: "Primary", color: "bg-blue-500" },
    { value: "secondary", label: "Secondary", color: "bg-stone-500" },
    { value: "success", label: "Success", color: "bg-emerald-500" },
    { value: "danger", label: "Danger", color: "bg-red-500" },
];

export default function ComponentEditor({ rows, onChange, roles, channels, guildId }: ComponentEditorProps) {
    const [editingComponent, setEditingComponent] = useState<{ rowIndex: number; compIndex: number } | null>(null);
    const [editingAction, setEditingAction] = useState<{ actionIndex: number } | null>(null);
    const [showAddModal, setShowAddModal] = useState<{ rowIndex: number } | null>(null);

    const addRow = () => {
        if (rows.length < 5) {
            onChange([...rows, { components: [] }]);
        }
    };

    const removeRow = (rowIndex: number) => {
        onChange(rows.filter((_, i) => i !== rowIndex));
    };

    const addComponent = (rowIndex: number, type: "button" | "select_menu") => {
        const newRows = [...rows];
        if (type === "button") {
            newRows[rowIndex].components.push({
                id: `btn_${Date.now()}`,
                type: "button",
                label: "Button",
                emoji: "",
                style: "primary",
                actions: [],
            });
        } else {
            newRows[rowIndex].components.push({
                id: `sel_${Date.now()}`,
                type: "select_menu",
                placeholder: "Select an option...",
                min_values: 1,
                max_values: 1,
                options: [],
            });
        }
        onChange(newRows);
        setShowAddModal(null);
    };

    const removeComponent = (rowIndex: number, compIndex: number) => {
        const newRows = [...rows];
        newRows[rowIndex].components = newRows[rowIndex].components.filter((_, i) => i !== compIndex);
        if (newRows[rowIndex].components.length === 0) {
            onChange(newRows.filter((_, i) => i !== rowIndex));
        } else {
            onChange(newRows);
        }
    };

    const updateComponent = (rowIndex: number, compIndex: number, updates: Partial<ComponentItem>) => {
        const newRows = [...rows];
        newRows[rowIndex].components[compIndex] = { ...newRows[rowIndex].components[compIndex], ...updates } as ComponentItem;
        onChange(newRows);
    };

    const getComponent = () => {
        if (!editingComponent) return null;
        return rows[editingComponent.rowIndex]?.components[editingComponent.compIndex];
    };

    const currentComponent = getComponent();

    const voiceChannels = channels.filter(c => c.type === 2);
    const textChannels = channels.filter(c => c.type === 0 || c.type === undefined);

    return (
        <div className="space-y-4">
            {/* Rows */}
            {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="glass-card rounded-[8px] p-4 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2">
                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Row {rowIndex + 1}</span>
                        <button onClick={() => removeRow(rowIndex)} className="text-[#da373c] hover:bg-[#da373c]/10 p-1 rounded transition-colors text-sm">🗑️</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(row.components || []).map((comp, compIndex) => (
                            <div key={comp.id} className="relative group">
                                {comp.type === "button" ? (
                                    <button
                                        onClick={() => setEditingComponent({ rowIndex, compIndex })}
                                        className={`px-4 py-1.5 rounded-[3px] font-bold text-white transition flex items-center gap-2 text-sm ${comp.style === "primary" ? "bg-[#5865F2] hover:bg-[#4752c4]" :
                                            comp.style === "success" ? "bg-[#248046] hover:bg-[#1a6334]" :
                                                comp.style === "danger" ? "bg-[#da373c] hover:bg-[#a12828]" :
                                                    "bg-[var(--bg-hover)] hover:bg-white/20"
                                            }`}
                                    >
                                        {comp.emoji && <span>{comp.emoji}</span>}
                                        {comp.label}
                                        {comp.actions.length > 0 && <span className="text-[10px] bg-[var(--bg-tertiary)] px-1 rounded ml-1 opacity-75">⚡{comp.actions.length}</span>}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setEditingComponent({ rowIndex, compIndex })}
                                        className="px-4 py-1.5 rounded-[3px] font-bold bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-transparent hover:border-[#5865F2] transition flex items-center gap-2 text-sm"
                                    >
                                        📋 {comp.placeholder}
                                        <span className="text-[10px] opacity-75">▼</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => removeComponent(rowIndex, compIndex)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#da373c] text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition shadow-lg flex items-center justify-center"
                                >×</button>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowAddModal({ rowIndex })}
                            className="px-4 py-1.5 bg-[var(--bg-hover)] hover:bg-white/20 text-white rounded-[3px] font-bold transition text-sm"
                        >+ Add</button>
                    </div>
                </div>
            ))}

            {/* Add Row Button */}
            {rows.length < 5 && (
                <button
                    onClick={addRow}
                    className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)]/90 backdrop-blur-3xl text-[var(--text-primary)] border border-[var(--border)] hover:border-[#5865F2] rounded-[3px] font-bold transition-all text-sm"
                >+ Add Action Row</button>
            )}

            {/* Add Component Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(null)}>
                    <div className="glass-card rounded-[8px] p-6 w-80 shadow-2xl border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Add Component</h3>
                        <div className="space-y-3">
                            <button onClick={() => addComponent(showAddModal.rowIndex, "button")} className="w-full p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-[8px] font-bold text-left transition border border-transparent hover:border-[#5865F2] group">
                                <div className="text-lg flex items-center gap-2">🔘 <span className="group-hover:text-[#5865F2] transition-colors">Button</span></div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1 font-normal">Clickable button with actions</div>
                            </button>
                            <button onClick={() => addComponent(showAddModal.rowIndex, "select_menu")} className="w-full p-4 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-[8px] font-bold text-left transition border border-transparent hover:border-[#5865F2] group">
                                <div className="text-lg flex items-center gap-2">📋 <span className="group-hover:text-[#5865F2] transition-colors">Select Menu</span></div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1 font-normal">Dropdown with role selection</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Component Modal */}
            {editingComponent && currentComponent && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto pt-20 pb-8" onClick={() => { setEditingComponent(null); setEditingAction(null); }}>
                    <div className="glass-card rounded-[8px] w-full max-w-2xl mx-4 shadow-2xl border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                            <h3 className="text-xl font-bold text-white">
                                {currentComponent.type === "button" ? `🔘 Button: ${(currentComponent as ComponentButton).label}` : `📋 Select Menu`}
                            </h3>
                            <button onClick={() => { setEditingComponent(null); setEditingAction(null); }} className="w-8 h-8 rounded-full text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors font-bold">×</button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {currentComponent.type === "button" && (
                                <>
                                    {/* Button Settings */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Emoji</label>
                                            <EmojiPicker
                                                value={(currentComponent as ComponentButton).emoji}
                                                onChange={(emoji) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { emoji })}
                                                guildId={guildId}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={(currentComponent as ComponentButton).label}
                                                onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { label: e.target.value })}
                                                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Style */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Style</label>
                                        <div className="flex gap-2">
                                            {BUTTON_STYLES.map(style => (
                                                <button
                                                    key={style.value}
                                                    onClick={() => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { style: style.value as any })}
                                                    className={`px-4 py-1.5 rounded-[3px] font-bold text-white transition text-xs ${style.value === "primary" ? "bg-[#5865F2] hover:bg-[#4752c4]" :
                                                        style.value === "success" ? "bg-[#248046] hover:bg-[#1a6334]" :
                                                            style.value === "danger" ? "bg-[#da373c] hover:bg-[#a12828]" :
                                                                "bg-[var(--bg-hover)] hover:bg-white/20"
                                                        } ${(currentComponent as ComponentButton).style === style.value ? "ring-2 ring-white ring-offset-2 ring-offset-[#2b2d31]" : "opacity-60 hover:opacity-100"}`}
                                                >{style.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-white">⚡ Actions</label>
                                            <span className="text-xs text-[var(--text-secondary)]">{(currentComponent as ComponentButton).actions.length}/10</span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mb-3">Set actions that will be executed when the button is clicked.</p>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(currentComponent as ComponentButton).actions.map((action, actionIndex) => (
                                                <button
                                                    key={actionIndex}
                                                    onClick={() => setEditingAction({ actionIndex })}
                                                    className="px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-[3px] text-xs font-bold flex items-center gap-2 border border-transparent hover:border-[#5865F2] transition-all"
                                                >
                                                    {ACTION_TYPES.find(a => a.value === action.type)?.icon}
                                                    {ACTION_TYPES.find(a => a.value === action.type)?.label}
                                                    <span className="text-[var(--text-secondary)]">⚙️</span>
                                                </button>
                                            ))}
                                            <div className="relative group">
                                                <button className="px-3 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white rounded-[3px] text-xs font-bold transition-colors">+</button>
                                                <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--bg-secondary)]/90 backdrop-blur-3xl rounded-[8px] shadow-2xl hidden group-hover:block z-20 border border-[var(--border)] overflow-hidden">
                                                    {["Roles", "Messages", "Voice"].map(category => (
                                                        <div key={category}>
                                                            <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] border-b border-[var(--border)] uppercase tracking-wider bg-[var(--bg-tertiary)]">{category}</div>
                                                            {ACTION_TYPES.filter(a => a.category === category).map(actionType => (
                                                                <button
                                                                    key={actionType.value}
                                                                    onClick={() => {
                                                                        const btn = currentComponent as ComponentButton;
                                                                        updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                            actions: [...btn.actions, { type: actionType.value }]
                                                                        });
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[#5865F2] hover:text-white flex items-center gap-2 text-sm transition-colors"
                                                                >
                                                                    <span>{actionType.icon}</span>
                                                                    <span>{actionType.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Editor */}
                                        {editingAction && (currentComponent as ComponentButton).actions[editingAction.actionIndex] && (
                                            <div className="bg-[var(--bg-tertiary)] rounded-[8px] p-4 border border-[var(--border)]">
                                                <div className="flex items-center justify-between mb-3 border-b border-[#2b2d31] pb-2">
                                                    <span className="font-bold text-white text-sm">
                                                        {ACTION_TYPES.find(a => a.value === (currentComponent as ComponentButton).actions[editingAction.actionIndex].type)?.icon}{" "}
                                                        {ACTION_TYPES.find(a => a.value === (currentComponent as ComponentButton).actions[editingAction.actionIndex].type)?.label}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const btn = currentComponent as ComponentButton;
                                                            updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                actions: btn.actions.filter((_, i) => i !== editingAction.actionIndex)
                                                            });
                                                            setEditingAction(null);
                                                        }}
                                                        className="text-[#da373c] hover:bg-[#da373c]/10 px-2 py-1 rounded transition-colors text-xs font-bold"
                                                    >REMOVE</button>
                                                </div>

                                                {/* Role Actions */}
                                                {["add_role", "remove_role", "toggle_role"].includes((currentComponent as ComponentButton).actions[editingAction.actionIndex].type) && (
                                                    <div className="space-y-3">
                                                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">ROLES</label>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {((currentComponent as ComponentButton).actions[editingAction.actionIndex].roles || []).map(roleId => {
                                                                const role = roles.find(r => r.id === roleId);
                                                                return role ? (
                                                                    <span key={roleId} className="px-2 py-1 glass-card text-[var(--text-primary)] rounded-[3px] flex items-center gap-2 text-xs font-bold border border-[var(--border)]">
                                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `#${role.color.toString(16).padStart(6, '0')}` }}></span>
                                                                        {role.name}
                                                                        <button
                                                                            onClick={() => {
                                                                                const btn = currentComponent as ComponentButton;
                                                                                const newActions = [...btn.actions];
                                                                                newActions[editingAction.actionIndex] = {
                                                                                    ...newActions[editingAction.actionIndex],
                                                                                    roles: (newActions[editingAction.actionIndex].roles || []).filter(r => r !== roleId)
                                                                                };
                                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                            }}
                                                                            className="ml-1 text-[var(--text-secondary)] hover:text-[#da373c] transition-colors"
                                                                        >×</button>
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                            {((currentComponent as ComponentButton).actions[editingAction.actionIndex].roles || []).length === 0 && (
                                                                <span className="text-[#87898c] text-xs italic">+ No roles added</span>
                                                            )}
                                                        </div>
                                                        <select
                                                            value=""
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    const currentRoles = newActions[editingAction.actionIndex].roles || [];
                                                                    if (!currentRoles.includes(e.target.value)) {
                                                                        newActions[editingAction.actionIndex] = {
                                                                            ...newActions[editingAction.actionIndex],
                                                                            roles: [...currentRoles, e.target.value]
                                                                        };
                                                                        updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                        >
                                                            <option value="" className="bg-[var(--bg-hover)]">+ Add role</option>
                                                            {roles.map(r => <option key={r.id} value={r.id} className="bg-[var(--bg-hover)]">{r.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Move Voice Action */}
                                                {(currentComponent as ComponentButton).actions[editingAction.actionIndex].type === "move_voice" && (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">USER COUNT</label>
                                                            <input
                                                                type="number"
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].user_count || 0}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], user_count: parseInt(e.target.value) || 0 };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                                placeholder="0 = all users"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">SOURCE CHANNEL</label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].source_channel || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], source_channel: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                            >
                                                                <option value="" className="bg-[var(--bg-hover)]">Click to set a channel</option>
                                                                {voiceChannels.map(c => <option key={c.id} value={c.id} className="bg-[var(--bg-hover)]">🔊 {c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">DESTINATION CHANNEL</label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].destination_channel || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], destination_channel: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                            >
                                                                <option value="" className="bg-[var(--bg-hover)]">Click to set a channel</option>
                                                                {voiceChannels.map(c => <option key={c.id} value={c.id} className="bg-[var(--bg-hover)]">🔊 {c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-3 glass-card p-3 rounded-[3px]">
                                                            <input
                                                                type="checkbox"
                                                                id="exclude-self"
                                                                checked={(currentComponent as ComponentButton).actions[editingAction.actionIndex].exclude_self || false}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], exclude_self: e.target.checked };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-4 h-4 rounded border-[#4e5058] text-[#5865F2] focus:ring-[#5865F2] accent-[#5865F2]"
                                                            />
                                                            <label htmlFor="exclude-self" className="text-sm text-[var(--text-primary)] font-bold cursor-pointer">EXCLUDE SELF</label>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">ROLE MODE</label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].role_mode || "ignore"}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], role_mode: e.target.value as any };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                            >
                                                                <option value="ignore" className="bg-[var(--bg-hover)]">Ignore roles</option>
                                                                <option value="require" className="bg-[var(--bg-hover)]">Require roles</option>
                                                                <option value="exclude" className="bg-[var(--bg-hover)]">Exclude roles</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Message Actions */}
                                                {["send_dm", "send_channel"].includes((currentComponent as ComponentButton).actions[editingAction.actionIndex].type) && (
                                                    <div className="space-y-3">
                                                        {(currentComponent as ComponentButton).actions[editingAction.actionIndex].type === "send_channel" && (
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">CHANNEL</label>
                                                                <select
                                                                    value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].channel_id || ""}
                                                                    onChange={(e) => {
                                                                        const btn = currentComponent as ComponentButton;
                                                                        const newActions = [...btn.actions];
                                                                        newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], channel_id: e.target.value };
                                                                        updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                    }}
                                                                    className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                                >
                                                                    <option value="" className="bg-[var(--bg-hover)]">Select channel</option>
                                                                    {textChannels.map(c => <option key={c.id} value={c.id} className="bg-[var(--bg-hover)]"># {c.name}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">MESSAGE</label>
                                                            <textarea
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].message_content || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], message_content: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                rows={3}
                                                                className="w-full px-3 py-2 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm resize-none custom-scrollbar"
                                                                placeholder="Message content..."
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Requirements */}
                                    <div className="bg-[var(--bg-tertiary)] rounded-[8px] p-4 border border-[var(--border)]">
                                        <label className="block text-sm font-bold text-white mb-2">🔒 Requirements</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Required Roles</label>
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const btn = currentComponent as ComponentButton;
                                                            const current = btn.required_roles || [];
                                                            if (!current.includes(e.target.value)) {
                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                    required_roles: [...current, e.target.value]
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-xs"
                                                >
                                                    <option value="" className="bg-[var(--bg-hover)]">+ Add</option>
                                                    {roles.map(r => <option key={r.id} value={r.id} className="bg-[var(--bg-hover)]">{r.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {((currentComponent as ComponentButton).required_roles || []).map(roleId => {
                                                        const role = roles.find(r => r.id === roleId);
                                                        return role ? (
                                                            <span key={roleId} className="px-1.5 py-0.5 bg-[#248046] text-white rounded-[3px] text-[10px] font-bold flex items-center gap-1 group-hover:bg-[#1a6334]">
                                                                {role.name}
                                                                <button onClick={() => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                        required_roles: (btn.required_roles || []).filter(r => r !== roleId)
                                                                    });
                                                                }} className="hover:text-red-200">×</button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Blacklist Roles</label>
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const btn = currentComponent as ComponentButton;
                                                            const current = btn.blacklist_roles || [];
                                                            if (!current.includes(e.target.value)) {
                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                    blacklist_roles: [...current, e.target.value]
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    className="w-full px-2 py-1 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-xs"
                                                >
                                                    <option value="" className="bg-[var(--bg-hover)]">+ Add</option>
                                                    {roles.map(r => <option key={r.id} value={r.id} className="bg-[var(--bg-hover)]">{r.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {((currentComponent as ComponentButton).blacklist_roles || []).map(roleId => {
                                                        const role = roles.find(r => r.id === roleId);
                                                        return role ? (
                                                            <span key={roleId} className="px-1.5 py-0.5 bg-[#da373c] text-white rounded-[3px] text-[10px] font-bold flex items-center gap-1">
                                                                {role.name}
                                                                <button onClick={() => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                        blacklist_roles: (btn.blacklist_roles || []).filter(r => r !== roleId)
                                                                    });
                                                                }} className="hover:text-red-200">×</button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Cooldown (seconds)</label>
                                            <input
                                                type="number"
                                                value={(currentComponent as ComponentButton).cooldown || 0}
                                                onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { cooldown: parseInt(e.target.value) || 0 })}
                                                className="w-24 px-2 py-1 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-xs"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Select Menu Editor */}
                            {currentComponent.type === "select_menu" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Placeholder</label>
                                        <input
                                            type="text"
                                            value={(currentComponent as ComponentSelectMenu).placeholder}
                                            onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { placeholder: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition"
                                        />
                                    </div>
                                    {/* Multiple Selection Toggle */}
                                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-[3px] border border-[var(--border)]">
                                        <input
                                            type="checkbox"
                                            id="allow-multiple"
                                            checked={((currentComponent as ComponentSelectMenu).max_values || 1) > 1}
                                            onChange={(e) => {
                                                const newMaxValues = e.target.checked ? 25 : 1;
                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                    min_values: e.target.checked ? 0 : 1,
                                                    max_values: newMaxValues
                                                });
                                            }}
                                            className="w-5 h-5 rounded border-[#4e5058] text-[#5865F2] focus:ring-[#5865F2] accent-[#5865F2]"
                                        />
                                        <label htmlFor="allow-multiple" className="text-[var(--text-primary)] font-bold cursor-pointer select-none text-sm">
                                            Allow Multiple Selections
                                        </label>
                                        <span className="text-[var(--text-secondary)] text-[10px] ml-auto">
                                            {((currentComponent as ComponentSelectMenu).max_values || 1) > 1
                                                ? `Up to ${(currentComponent as ComponentSelectMenu).max_values} options`
                                                : "Single option only"}
                                        </span>
                                    </div>

                                    {/* Advanced: Min/Max if multiple is enabled */}
                                    {((currentComponent as ComponentSelectMenu).max_values || 1) > 1 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Min Selections</label>
                                                <input
                                                    type="number"
                                                    value={(currentComponent as ComponentSelectMenu).min_values || 0}
                                                    onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { min_values: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                    min="0" max="25"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Max Selections</label>
                                                <input
                                                    type="number"
                                                    value={(currentComponent as ComponentSelectMenu).max_values || 1}
                                                    onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { max_values: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                    min="1" max="25"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-white">Options</label>
                                            <button
                                                onClick={() => {
                                                    const menu = currentComponent as ComponentSelectMenu;
                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                        options: [...menu.options, { label: "New Option", value: `opt_${Date.now()}`, actions: [] }]
                                                    });
                                                }}
                                                className="px-3 py-1 bg-[#248046] hover:bg-[#1a6334] text-white rounded-[3px] text-xs font-bold transition-colors"
                                            >+ Add Option</button>
                                        </div>
                                        <div className="space-y-2">
                                            {(currentComponent as ComponentSelectMenu).options.map((opt, optIndex) => (
                                                <div key={optIndex} className="bg-[var(--bg-tertiary)] rounded-[3px] p-3 border border-[var(--border)] hover:border-[#5865F2] transition-colors">
                                                    <div className="flex gap-2 mb-2">
                                                        <input
                                                            type="text"
                                                            value={opt.label}
                                                            onChange={(e) => {
                                                                const menu = currentComponent as ComponentSelectMenu;
                                                                const newOptions = [...menu.options];
                                                                newOptions[optIndex] = { ...newOptions[optIndex], label: e.target.value };
                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { options: newOptions });
                                                            }}
                                                            placeholder="Label"
                                                            className="flex-1 px-2 py-1 glass-card text-[var(--text-primary)] rounded-[3px] border border-transparent focus:border-[#5865F2] outline-none transition text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const menu = currentComponent as ComponentSelectMenu;
                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                    options: menu.options.filter((_, i) => i !== optIndex)
                                                                });
                                                            }}
                                                            className="text-[#da373c] hover:bg-[#da373c]/10 p-1 rounded transition-colors"
                                                        >🗑️</button>
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                                                        Actions: {opt.actions.length} / 10
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-4 border-t border-[var(--border)] bg-[var(--bg-tertiary)]">
                            <button onClick={() => { setEditingComponent(null); setEditingAction(null); }} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold rounded-[3px] transition-colors text-sm shadow-md">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


