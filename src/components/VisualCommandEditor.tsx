"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import Toast from "./Toast";
// --- Types ---
const genId = () => Math.random().toString(36).substr(2, 9);

interface RuleCondition { id: string; type: string; operator: string; value: string; }
interface RuleAction { id: string; type: string; value: string; }
export interface Rule {
    id: string;
    name: string;
    active: boolean;
    trigger: { type: string; value: string; };
    conditions: RuleCondition[];
    actions: RuleAction[];
}

// --- Editor Sub-Component ---
function RuleEditor({
    initialRule,
    onSave,
    onCancel
}: {
    initialRule: Rule;
    onSave: (rule: Rule) => void;
    onCancel: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(initialRule.name);
    const [triggerType, setTriggerType] = useState(initialRule.trigger.type);
    const [triggerValue, setTriggerValue] = useState(initialRule.trigger.value);
    const [conditions, setConditions] = useState([...initialRule.conditions]);
    const [actions, setActions] = useState([...initialRule.actions]);

    const addCondition = () => setConditions([...conditions, { id: genId(), type: "has_role", operator: "INCLUDES", value: "" }]);
    const removeCondition = (id: string) => setConditions(conditions.filter(c => c.id !== id));
    const updateCondition = (id: string, key: string, val: string) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, [key]: val } : c));
    };

    const addAction = () => setActions([...actions, { id: genId(), type: "reply_message", value: "" }]);
    const removeAction = (id: string) => setActions(actions.filter(a => a.id !== id));
    const updateAction = (id: string, key: string, val: string) => {
        setActions(actions.map(a => a.id === id ? { ...a, [key]: val } : a));
    };

    const handleSave = () => {
        setLoading(true);
        onSave({
            ...initialRule,
            name,
            trigger: { type: triggerType, value: triggerValue },
            conditions,
            actions
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="w-10 h-10 bg-[#111214] border border-[var(--border)] hover:bg-[var(--bg-hover)] rounded-xl flex items-center justify-center transition-colors">
                        <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{initialRule.id ? 'Edit Rule' : 'Create New Rule'}</h2>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">Configure logic blocks for this automation.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-hover)] font-bold transition text-[var(--text-secondary)]">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-[4px] transition shadow-lg disabled:opacity-50 min-w-[140px] flex items-center justify-center"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : "Save Rule"}
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="space-y-6">
                <div className="glass-card bg-[var(--bg-primary)] rounded-xl p-6 border border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Rule Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#111214] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-bold text-lg font-mono transition-colors"
                    />
                </div>

                {/* TRIGGER */}
                <div className="glass-card bg-[var(--bg-primary)] rounded-xl p-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-black">1</div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">When</h3>
                        <div className="flex-1 border-t border-[var(--border)] ml-2"></div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/3">
                            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="w-full bg-[#111214] border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-medium">
                                <option value="message_exact">Message Is Exactly</option>
                                <option value="message_contains">Message Contains</option>
                                <option value="member_join">Member Joins Server</option>
                                <option value="reaction_add">Reaction Added</option>
                            </select>
                        </div>
                        {triggerType.includes('message') && (
                            <div className="flex-1 relative">
                                <input type="text" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} placeholder="Type trigger word..." className="w-full bg-[#111214] border border-[var(--border)] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-medium font-mono" />
                            </div>
                        )}
                    </div>
                </div>

                {/* CONDITIONS */}
                <div className="glass-card bg-[var(--bg-primary)] rounded-xl p-6 border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.05)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 font-black">2</div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">If</h3>
                        <div className="flex-1 border-t border-[var(--border)] ml-2"></div>
                        <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase px-2">{"(Optional)"}</span>
                    </div>
                    <div className="space-y-3">
                        {conditions.length === 0 && <div className="text-center py-4 text-[var(--text-tertiary)] text-sm italic border border-dashed border-[var(--border)] rounded-xl">No conditions, rule runs every time.</div>}
                        {conditions.map((cond) => (
                            <div key={cond.id} className="flex flex-col md:flex-row gap-3 items-center group bg-[#111214] border border-[var(--border)] p-3 rounded-xl hover:border-fuchsia-500/30 transition-colors">
                                <span className="text-gray-600 font-bold w-10 text-center text-sm hidden md:block">AND</span>
                                <select value={cond.type} onChange={(e) => updateCondition(cond.id, 'type', e.target.value)} className="w-full md:w-48 bg-[#1a1b1e] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500">
                                    <option value="has_role">User Has Role</option>
                                    <option value="in_channel">In Channel</option>
                                </select>
                                <select value={cond.operator} onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)} className="w-full md:w-32 bg-[#1a1b1e] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-fuchsia-500 font-mono">
                                    <option value="INCLUDES">Includes</option>
                                    <option value="EXCLUDES">Excludes</option>
                                </select>
                                <input type="text" value={cond.value} onChange={(e) => updateCondition(cond.id, 'value', e.target.value)} placeholder="@Role or #Channel" className="flex-1 w-full bg-[#1a1b1e] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500" />
                                <button onClick={() => removeCondition(cond.id)} className="w-10 h-10 shrink-0 md:opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-lg transition-all">✕</button>
                            </div>
                        ))}
                        <button onClick={addCondition} className="mt-4 px-4 py-2 border border-dashed border-white/20 hover:border-fuchsia-500 hover:text-fuchsia-400 text-[var(--text-secondary)] rounded-lg text-sm font-bold transition-colors w-full flex items-center justify-center gap-2">
                            <span>+</span> Add Condition
                        </button>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="glass-card bg-[var(--bg-primary)] rounded-xl p-6 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-black">3</div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">Then</h3>
                        <div className="flex-1 border-t border-[var(--border)] ml-2"></div>
                    </div>
                    <div className="space-y-4">
                        {actions.length === 0 && <div className="text-center py-8 text-red-400 text-sm bg-red-500/10 rounded-xl">At least one action is required.</div>}
                        {actions.map((act, index) => (
                            <div key={act.id} className="bg-[#111214] border border-[var(--border)] rounded-xl group hover:border-emerald-500/30 transition-colors overflow-hidden flex flex-col relative">
                                <div className="flex items-center gap-2 bg-[#18191c] p-3 border-b border-[var(--border)]">
                                    <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Action {index + 1}</span>
                                    <select value={act.type} onChange={(e) => updateAction(act.id, 'type', e.target.value)} className="ml-auto bg-transparent text-sm focus:outline-none text-white font-bold max-w-[200px]">
                                        <option value="reply_message">Reply With Text</option>
                                        <option value="send_message">Send Text To Channel</option>
                                        <option value="add_role">Add Role</option>
                                        <option value="add_balance">Add Economy Balance</option>
                                    </select>
                                    <button onClick={() => removeAction(act.id)} className="w-8 h-8 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/20 ml-2 rounded-lg flex items-center justify-center transition">✕</button>
                                </div>
                                <div className="p-4">
                                    {(act.type === 'reply_message' || act.type === 'send_message') && (
                                        <textarea rows={2} value={act.value} onChange={(e) => updateAction(act.id, 'value', e.target.value)} placeholder="Message content. Supports variables like {user}, {server}..." className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors resize-y" />
                                    )}
                                    {(act.type.includes('role') || act.type === 'add_balance') && (
                                        <input type="text" value={act.value} onChange={(e) => updateAction(act.id, 'value', e.target.value)} placeholder={act.type === 'add_balance' ? "Amount (e.g. 500)" : "@RoleName or Role ID"} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors" />
                                    )}
                                </div>
                            </div>
                        ))}
                        <button onClick={addAction} className="w-full py-4 border border-dashed border-[#5865F2]/30 hover:border-[#5865F2] hover:bg-[#5865F2]/5 text-[#5865F2] rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                            <span className="text-xl">+</span> Add Action Block
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// --- Main Component Hub ---
export default function VisualCommandEditor({ guildId }: { guildId: string }) {
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingRule, setEditingRule] = useState<Rule | null>(null);
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState<Rule[]>([]);

    useEffect(() => {
        fetchRules();
    }, [guildId]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/automations?guild_id=${guildId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setRules(data.map(r => ({
                    ...r,
                    id: r.id.toString(),
                    trigger: { type: r.trigger_type, value: r.trigger_value },
                    active: !!r.active,
                    conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : (r.conditions || []),
                    actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : (r.actions || [])
                })));
            }
        } catch (e) {
            console.error("Failed to fetch rules", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingRule({
            id: "",
            name: "New Automation Rule",
            active: false, // Default to inactive
            trigger: { type: "message_exact", value: "" },
            conditions: [],
            actions: [{ id: genId(), type: "reply_message", value: "" }]
        });
        setView("editor");
    };

    const handleEdit = (rule: Rule) => {
        setEditingRule(rule);
        setView("editor");
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/automations?id=${id}&guild_id=${guildId}`, { method: 'DELETE' });
            if (res.ok) {
                setRules(rules.filter(r => r.id !== id));
                setToast({ message: "Rule deleted.", type: "info" });
            }
        } catch (e) {
            setToast({ message: "Failed to delete rule.", type: "error" });
        }
    };

    const handleToggleActive = async (id: string) => {
        const rule = rules.find(r => r.id === id);
        if (!rule) return;

        const newActive = !rule.active;
        try {
            const res = await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: parseInt(id),
                    guild_id: guildId,
                    active: newActive
                })
            });
            if (res.ok) {
                setRules(rules.map(r => r.id === id ? { ...r, active: newActive } : r));
            }
        } catch (e) {
            setToast({ message: "Failed to toggle rule.", type: "error" });
        }
    };

    const handleSaveRule = async (savedRule: Rule) => {
        try {
            const res = await fetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: savedRule.id ? parseInt(savedRule.id) : undefined,
                    guild_id: guildId,
                    name: savedRule.name,
                    active: savedRule.active,
                    trigger_type: savedRule.trigger.type,
                    trigger_value: savedRule.trigger.value,
                    conditions: savedRule.conditions,
                    actions: savedRule.actions
                })
            });
            if (res.ok) {
                await fetchRules();
                setView("list");
                setToast({ message: "Rule saved successfully!", type: "success" });
            }
        } catch (e) {
            setToast({ message: "Failed to save rule.", type: "error" });
        }
    };

    if (loading) return <Loading message="Loading Automations..." />;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            {view === 'list' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                        </div>
                        <button
                            onClick={handleCreateNew}
                            className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[4px] transition-colors shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Rule
                        </button>
                    </div>

                    {/* List View Details */}
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden glass-card">
                        {rules.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="text-6xl mb-4 opacity-50">🤖</div>
                                <h3 className="text-xl font-bold text-white mb-2">No Automations Yet</h3>
                                <p className="text-[var(--text-secondary)] mb-6">Create your first automation rule to get started.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {rules.map(r => (
                                    <div key={r.id} className="p-5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4">
                                            {/* Custom Toggle Switch */}
                                            <button
                                                onClick={() => handleToggleActive(r.id)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${r.active ? 'bg-emerald-500' : 'bg-gray-700'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${r.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>

                                            <div>
                                                <h4 className="text-white font-bold text-lg">{r.name}</h4>
                                                <p className="text-[var(--text-secondary)] text-sm mt-0.5">
                                                    Takes <span className="text-emerald-400">{r.actions.length} action(s)</span> when <span className="text-blue-400">{r.trigger.type.replace('_', ' ')}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(r)} className="px-4 py-2 bg-[#111214] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-bold text-sm rounded-lg transition-colors">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(r.id)} className="w-10 h-10 bg-[#111214] border border-[var(--border)] hover:border-red-500/50 hover:bg-red-500/10 text-red-500 font-bold text-sm rounded-lg flex items-center justify-center transition-colors">
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'editor' && editingRule && (
                <RuleEditor
                    initialRule={editingRule}
                    onSave={handleSaveRule}
                    onCancel={() => setView('list')}
                />
            )}

            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}
