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
                <div key={rowIndex} className="bg-stone-50 rounded-2xl p-4 border-2 border-stone-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-stone-500">Row {rowIndex + 1}</span>
                        <button onClick={() => removeRow(rowIndex)} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(row.components || []).map((comp, compIndex) => (
                            <div key={comp.id} className="relative group">
                                {comp.type === "button" ? (
                                    <button
                                        onClick={() => setEditingComponent({ rowIndex, compIndex })}
                                        className={`px-4 py-2 rounded-lg font-bold text-white transition flex items-center gap-2 ${comp.style === "primary" ? "bg-blue-500 hover:bg-blue-600" :
                                            comp.style === "success" ? "bg-emerald-500 hover:bg-emerald-600" :
                                                comp.style === "danger" ? "bg-red-500 hover:bg-red-600" :
                                                    "bg-stone-500 hover:bg-stone-600"
                                            }`}
                                    >
                                        {comp.emoji && <span>{comp.emoji}</span>}
                                        {comp.label}
                                        {comp.actions.length > 0 && <span className="text-xs opacity-75">⚡{comp.actions.length}</span>}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setEditingComponent({ rowIndex, compIndex })}
                                        className="px-4 py-2 rounded-lg font-bold bg-stone-700 text-white hover:bg-stone-600 transition flex items-center gap-2"
                                    >
                                        📋 {comp.placeholder}
                                        <span className="text-xs opacity-75">▼</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => removeComponent(rowIndex, compIndex)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                                >×</button>
                            </div>
                        ))}
                        <button
                            onClick={() => setShowAddModal({ rowIndex })}
                            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg font-bold transition"
                        >+ Add</button>
                    </div>
                </div>
            ))}

            {/* Add Row Button */}
            {rows.length < 5 && (
                <button
                    onClick={addRow}
                    className="w-full py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-bold transition"
                >+ Add Action Row</button>
            )}

            {/* Add Component Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(null)}>
                    <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-stone-800 mb-4">Add Component</h3>
                        <div className="space-y-3">
                            <button onClick={() => addComponent(showAddModal.rowIndex, "button")} className="w-full p-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-bold text-left transition">
                                <div className="text-lg">🔘 Button</div>
                                <div className="text-xs opacity-70">Clickable button with actions</div>
                            </button>
                            <button onClick={() => addComponent(showAddModal.rowIndex, "select_menu")} className="w-full p-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-bold text-left transition">
                                <div className="text-lg">📋 Select Menu</div>
                                <div className="text-xs opacity-70">Dropdown with role selection</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Component Modal */}
            {editingComponent && currentComponent && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 overflow-y-auto pt-20 pb-8" onClick={() => { setEditingComponent(null); setEditingAction(null); }}>
                    <div className="bg-stone-900 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <h3 className="text-xl font-black text-white">
                                {currentComponent.type === "button" ? `🔘 Button: ${(currentComponent as ComponentButton).label}` : `📋 Select Menu`}
                            </h3>
                            <button onClick={() => { setEditingComponent(null); setEditingAction(null); }} className="w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-600 text-white font-bold">×</button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {currentComponent.type === "button" && (
                                <>
                                    {/* Button Settings */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-400 mb-1">Emoji</label>
                                            <EmojiPicker
                                                value={(currentComponent as ComponentButton).emoji}
                                                onChange={(emoji) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { emoji })}
                                                guildId={guildId}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-stone-400 mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={(currentComponent as ComponentButton).label}
                                                onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { label: e.target.value })}
                                                className="w-full px-3 py-2 bg-stone-800 text-white rounded-lg border border-stone-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Style */}
                                    <div>
                                        <label className="block text-xs font-bold text-stone-400 mb-2">Style</label>
                                        <div className="flex gap-2">
                                            {BUTTON_STYLES.map(style => (
                                                <button
                                                    key={style.value}
                                                    onClick={() => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { style: style.value as any })}
                                                    className={`px-4 py-2 rounded-lg font-bold text-white transition ${style.color} ${(currentComponent as ComponentButton).style === style.value ? "ring-2 ring-white" : "opacity-60 hover:opacity-100"}`}
                                                >{style.label}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-white">⚡ Actions</label>
                                            <span className="text-xs text-stone-400">{(currentComponent as ComponentButton).actions.length}/10</span>
                                        </div>
                                        <p className="text-xs text-stone-400 mb-3">Set actions that will be executed when the button is clicked.</p>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {(currentComponent as ComponentButton).actions.map((action, actionIndex) => (
                                                <button
                                                    key={actionIndex}
                                                    onClick={() => setEditingAction({ actionIndex })}
                                                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                                >
                                                    {ACTION_TYPES.find(a => a.value === action.type)?.icon}
                                                    {ACTION_TYPES.find(a => a.value === action.type)?.label}
                                                    <span className="text-stone-400">⚙️</span>
                                                </button>
                                            ))}
                                            <div className="relative group">
                                                <button className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-bold">+</button>
                                                <div className="absolute left-0 top-full mt-1 w-56 bg-stone-800 rounded-xl shadow-xl hidden group-hover:block z-10 border border-stone-600">
                                                    {["Roles", "Messages", "Voice"].map(category => (
                                                        <div key={category}>
                                                            <div className="px-3 py-1 text-xs font-bold text-stone-400 border-b border-stone-700">{category}</div>
                                                            {ACTION_TYPES.filter(a => a.category === category).map(actionType => (
                                                                <button
                                                                    key={actionType.value}
                                                                    onClick={() => {
                                                                        const btn = currentComponent as ComponentButton;
                                                                        updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                            actions: [...btn.actions, { type: actionType.value }]
                                                                        });
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-white hover:bg-stone-700 flex items-center gap-2"
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
                                            <div className="bg-stone-800 rounded-xl p-4 border border-stone-600">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-bold text-white">
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
                                                        className="text-red-400 hover:text-red-300 text-sm"
                                                    >🗑️ Remove</button>
                                                </div>

                                                {/* Role Actions */}
                                                {["add_role", "remove_role", "toggle_role"].includes((currentComponent as ComponentButton).actions[editingAction.actionIndex].type) && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-400 mb-2">ROLES</label>
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {((currentComponent as ComponentButton).actions[editingAction.actionIndex].roles || []).map(roleId => {
                                                                const role = roles.find(r => r.id === roleId);
                                                                return role ? (
                                                                    <span key={roleId} className="px-2 py-1 bg-stone-700 text-white rounded flex items-center gap-1 text-sm">
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
                                                                            className="ml-1 text-stone-400 hover:text-white"
                                                                        >×</button>
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                            <span className="text-stone-500 text-sm">+ No roles added</span>
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
                                                            className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                        >
                                                            <option value="">+ Add role</option>
                                                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Move Voice Action */}
                                                {(currentComponent as ComponentButton).actions[editingAction.actionIndex].type === "move_voice" && (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-400 mb-1">USER COUNT <span className="text-stone-500">ⓘ</span></label>
                                                            <input
                                                                type="number"
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].user_count || 0}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], user_count: parseInt(e.target.value) || 0 };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                                placeholder="0 = all users"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-400 mb-1">SOURCE CHANNEL <span className="text-stone-500">ⓘ</span></label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].source_channel || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], source_channel: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                            >
                                                                <option value="">Click to set a channel</option>
                                                                {voiceChannels.map(c => <option key={c.id} value={c.id}>🔊 {c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-400 mb-1">DESTINATION CHANNEL <span className="text-stone-500">ⓘ</span></label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].destination_channel || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], destination_channel: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                            >
                                                                <option value="">Click to set a channel</option>
                                                                {voiceChannels.map(c => <option key={c.id} value={c.id}>🔊 {c.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-3">
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
                                                                className="w-4 h-4"
                                                            />
                                                            <label htmlFor="exclude-self" className="text-sm text-white">EXCLUDE SELF <span className="text-stone-500">ⓘ</span></label>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-400 mb-1">ROLE MODE <span className="text-stone-500">ⓘ</span></label>
                                                            <select
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].role_mode || "ignore"}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], role_mode: e.target.value as any };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                            >
                                                                <option value="ignore">Ignore roles</option>
                                                                <option value="require">Require roles</option>
                                                                <option value="exclude">Exclude roles</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Message Actions */}
                                                {["send_dm", "send_channel"].includes((currentComponent as ComponentButton).actions[editingAction.actionIndex].type) && (
                                                    <div className="space-y-3">
                                                        {(currentComponent as ComponentButton).actions[editingAction.actionIndex].type === "send_channel" && (
                                                            <div>
                                                                <label className="block text-xs font-bold text-stone-400 mb-1">CHANNEL</label>
                                                                <select
                                                                    value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].channel_id || ""}
                                                                    onChange={(e) => {
                                                                        const btn = currentComponent as ComponentButton;
                                                                        const newActions = [...btn.actions];
                                                                        newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], channel_id: e.target.value };
                                                                        updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                    }}
                                                                    className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600"
                                                                >
                                                                    <option value="">Select channel</option>
                                                                    {textChannels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-400 mb-1">MESSAGE</label>
                                                            <textarea
                                                                value={(currentComponent as ComponentButton).actions[editingAction.actionIndex].message_content || ""}
                                                                onChange={(e) => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    const newActions = [...btn.actions];
                                                                    newActions[editingAction.actionIndex] = { ...newActions[editingAction.actionIndex], message_content: e.target.value };
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { actions: newActions });
                                                                }}
                                                                rows={3}
                                                                className="w-full px-3 py-2 bg-stone-700 text-white rounded-lg border border-stone-600 resize-none"
                                                                placeholder="Message content..."
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Requirements */}
                                    <div className="bg-stone-800 rounded-xl p-4 border border-stone-600">
                                        <label className="block text-sm font-bold text-white mb-2">🔒 Requirements</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-stone-400 mb-1">Required Roles</label>
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
                                                    className="w-full px-2 py-1 bg-stone-700 text-white rounded border border-stone-600 text-sm"
                                                >
                                                    <option value="">+ Add</option>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {((currentComponent as ComponentButton).required_roles || []).map(roleId => {
                                                        const role = roles.find(r => r.id === roleId);
                                                        return role ? (
                                                            <span key={roleId} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs flex items-center gap-1">
                                                                {role.name}
                                                                <button onClick={() => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                        required_roles: (btn.required_roles || []).filter(r => r !== roleId)
                                                                    });
                                                                }}>×</button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-stone-400 mb-1">Blacklist Roles</label>
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
                                                    className="w-full px-2 py-1 bg-stone-700 text-white rounded border border-stone-600 text-sm"
                                                >
                                                    <option value="">+ Add</option>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {((currentComponent as ComponentButton).blacklist_roles || []).map(roleId => {
                                                        const role = roles.find(r => r.id === roleId);
                                                        return role ? (
                                                            <span key={roleId} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs flex items-center gap-1">
                                                                {role.name}
                                                                <button onClick={() => {
                                                                    const btn = currentComponent as ComponentButton;
                                                                    updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                        blacklist_roles: (btn.blacklist_roles || []).filter(r => r !== roleId)
                                                                    });
                                                                }}>×</button>
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label className="block text-xs font-bold text-stone-400 mb-1">Cooldown (seconds)</label>
                                            <input
                                                type="number"
                                                value={(currentComponent as ComponentButton).cooldown || 0}
                                                onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { cooldown: parseInt(e.target.value) || 0 })}
                                                className="w-24 px-2 py-1 bg-stone-700 text-white rounded border border-stone-600 text-sm"
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
                                        <label className="block text-xs font-bold text-stone-400 mb-1">Placeholder</label>
                                        <input
                                            type="text"
                                            value={(currentComponent as ComponentSelectMenu).placeholder}
                                            onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { placeholder: e.target.value })}
                                            className="w-full px-3 py-2 bg-stone-800 text-white rounded-lg border border-stone-600"
                                        />
                                    </div>
                                    {/* Multiple Selection Toggle */}
                                    <div className="flex items-center gap-3 p-3 bg-stone-800 rounded-xl border border-stone-600">
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
                                            className="w-5 h-5 rounded border-stone-500 text-amber-500 focus:ring-amber-500 accent-amber-500"
                                        />
                                        <label htmlFor="allow-multiple" className="text-white font-bold cursor-pointer select-none">
                                            Allow Multiple Selections
                                        </label>
                                        <span className="text-stone-400 text-xs ml-auto">
                                            {((currentComponent as ComponentSelectMenu).max_values || 1) > 1
                                                ? `Users can select up to ${(currentComponent as ComponentSelectMenu).max_values} options`
                                                : "Users can only select 1 option"}
                                        </span>
                                    </div>

                                    {/* Advanced: Min/Max if multiple is enabled */}
                                    {((currentComponent as ComponentSelectMenu).max_values || 1) > 1 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-stone-400 mb-1">Min Selections</label>
                                                <input
                                                    type="number"
                                                    value={(currentComponent as ComponentSelectMenu).min_values || 0}
                                                    onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { min_values: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 bg-stone-800 text-white rounded-lg border border-stone-600"
                                                    min="0" max="25"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-stone-400 mb-1">Max Selections</label>
                                                <input
                                                    type="number"
                                                    value={(currentComponent as ComponentSelectMenu).max_values || 1}
                                                    onChange={(e) => updateComponent(editingComponent.rowIndex, editingComponent.compIndex, { max_values: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-3 py-2 bg-stone-800 text-white rounded-lg border border-stone-600"
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
                                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm font-bold"
                                            >+ Add Option</button>
                                        </div>
                                        <div className="space-y-2">
                                            {(currentComponent as ComponentSelectMenu).options.map((opt, optIndex) => (
                                                <div key={optIndex} className="bg-stone-800 rounded-lg p-3 border border-stone-600">
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
                                                            className="flex-1 px-2 py-1 bg-stone-700 text-white rounded border border-stone-600 text-sm"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const menu = currentComponent as ComponentSelectMenu;
                                                                updateComponent(editingComponent.rowIndex, editingComponent.compIndex, {
                                                                    options: menu.options.filter((_, i) => i !== optIndex)
                                                                });
                                                            }}
                                                            className="text-red-400 hover:text-red-300"
                                                        >🗑️</button>
                                                    </div>
                                                    <div className="text-xs text-stone-400">
                                                        Actions: {opt.actions.length} configured
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-5 border-t border-stone-700">
                            <button onClick={() => { setEditingComponent(null); setEditingAction(null); }} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
