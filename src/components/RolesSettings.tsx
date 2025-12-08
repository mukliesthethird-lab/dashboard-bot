"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";

import { ReactionRoleMessage, Channel, Role, GlobalRolesSettings } from "../types";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";

interface RolesSettingsProps {
    guildId: string;
}

// --- Helper Components ---

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-amber-500' : 'bg-stone-300'}`}
    >
        <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200`}
            style={{ left: enabled ? 'calc(100% - 1.35rem)' : '2px' }}
        />
    </button>
);



// --- Main Component ---

export default function RolesSettings({ guildId }: RolesSettingsProps) {
    // Global Settings State
    const [globalSettings, setGlobalSettings] = useState<GlobalRolesSettings>({ join_roles_enabled: false, join_roles: [], reaction_roles_enabled: false });
    const [savingGlobal, setSavingGlobal] = useState(false);

    // Data State
    const [settings, setSettings] = useState<{ messages: ReactionRoleMessage[] }>({ messages: [] });
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    // Editor State
    const [showEditor, setShowEditor] = useState(false);
    const [editingMsg, setEditingMsg] = useState<ReactionRoleMessage | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Confirmation State
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [messagesRes, channelsRes, rolesRes, settingsRes] = await Promise.all([
                    fetch(`/api/roles?action=messages&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`),
                    fetch(`/api/roles?guild_id=${guildId}`)
                ]);

                const messagesData = await messagesRes.json();
                const channelsData = await channelsRes.json();
                const rolesData = await rolesRes.json();
                const settingsData = await settingsRes.json();

                setSettings({ messages: Array.isArray(messagesData) ? messagesData : [] });
                if (Array.isArray(channelsData)) setChannels(channelsData);
                if (Array.isArray(rolesData)) setRoles(rolesData);

                if (settingsData && !settingsData.error) {
                    setGlobalSettings({
                        join_roles_enabled: !!settingsData.join_roles_enabled,
                        join_roles: Array.isArray(settingsData.join_roles) ? settingsData.join_roles : [],
                        reaction_roles_enabled: !!settingsData.reaction_roles_enabled || !!messagesData.length,
                    });
                }
            } catch (error) {
                console.error("Failed to load data", error);
            }
            setLoading(false);
        };
        loadData();
    }, [guildId]);

    // Functions
    const saveGlobalSettings = async (updates: Partial<GlobalRolesSettings>) => {
        const newSettings = { ...globalSettings, ...updates };
        setGlobalSettings(newSettings);
        setSavingGlobal(true);
        try {
            await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_settings', guild_id: guildId, ...newSettings })
            });
        } catch (e) {
            console.error(e);
        }
        setSavingGlobal(false);
    };

    const handleDeleteClick = (msg: ReactionRoleMessage) => {
        if (msg.id) setConfirmDeleteId(msg.id);
    };

    const confirmDeleteMessage = async () => {
        if (!confirmDeleteId) return;

        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_message', id: confirmDeleteId })
            });

            if (!res.ok) throw new Error("Failed to delete");

            const messagesRes = await fetch(`/api/roles?action=messages&guild_id=${guildId}`);
            const messagesData = await messagesRes.json();
            setSettings({ messages: Array.isArray(messagesData) ? messagesData : [] });
        } catch (error) {
            console.error("Error deleting message:", error);
            alert("Error deleting message");
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleSaveMessage = async (msg: ReactionRoleMessage, targetChannel: string) => {
        const isUpdate = editingIndex !== null && msg.id;
        const body = JSON.stringify({
            action: isUpdate ? 'update_message' : 'send_message',
            guild_id: guildId,
            ...msg,
            channel_id: targetChannel,
            id: msg.id
        });

        const res = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to send/update message");
        }

        // Refresh data
        const messagesRes = await fetch(`/api/roles?action=messages&guild_id=${guildId}`);
        const messagesData = await messagesRes.json();
        setSettings({ messages: Array.isArray(messagesData) ? messagesData : [] });
    };


    if (loading) return <CatLoader message="Loading reaction roles..." />;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-stone-800">Roles Configuration</h1>
                    <p className="text-stone-500 mt-1">Manage automatic role assignment and reaction roles.</p>
                </div>
            </div>

            {/* Global Settings */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Join Roles Card */}
                <div className="bg-white rounded-3xl p-6 border-2 border-stone-200 shadow-sm hover:border-amber-200 transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">👋</span>
                            <h2 className="text-xl font-bold text-stone-800">Join Roles</h2>
                        </div>
                        <Toggle
                            enabled={globalSettings.join_roles_enabled}
                            onChange={(val) => saveGlobalSettings({ join_roles_enabled: val })}
                        />
                    </div>
                    {globalSettings.join_roles_enabled && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="flex flex-wrap gap-2">
                                {globalSettings.join_roles.map(roleId => {
                                    const role = roles.find(r => r.id === roleId);
                                    if (!role) return null;
                                    return (
                                        <div key={roleId} className="px-3 py-1 bg-stone-100 rounded-lg text-sm font-bold flex items-center gap-2 border border-stone-200">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#' + role.color.toString(16).padStart(6, '0') }}></span>
                                            {role.name}
                                            <button onClick={() => saveGlobalSettings({ join_roles: globalSettings.join_roles.filter(id => id !== roleId) })} className="ml-1 hover:text-red-500">×</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <select
                                onChange={(e) => {
                                    if (e.target.value && !globalSettings.join_roles.includes(e.target.value)) {
                                        saveGlobalSettings({ join_roles: [...globalSettings.join_roles, e.target.value] });
                                    }
                                    e.target.value = '';
                                }}
                                className="w-full p-2 border border-stone-200 rounded-lg bg-stone-50 focus:border-amber-400 outline-none"
                            >
                                <option value="">+ Add Role</option>
                                {roles.filter(r => !globalSettings.join_roles.includes(r.id)).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Reaction Roles Card */}
                <div className="bg-white rounded-3xl p-6 border-2 border-stone-200 shadow-sm hover:border-amber-200 transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✨</span>
                            <h2 className="text-xl font-bold text-stone-800">Reaction Roles</h2>
                        </div>
                        <Toggle
                            enabled={globalSettings.reaction_roles_enabled}
                            onChange={(val) => saveGlobalSettings({ reaction_roles_enabled: val })}
                        />
                    </div>
                    {globalSettings.reaction_roles_enabled && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                {settings.messages.map((msg, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-200 group">
                                        <span className="font-bold text-stone-600 truncate max-w-[200px]">{msg.embeds[0]?.title || 'Untitled Message'}</span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingMsg(msg); setEditingIndex(idx); setShowEditor(true); }} className="p-1 px-3 bg-white border border-stone-200 rounded-lg hover:border-amber-400 text-sm font-bold">Edit</button>
                                            <button onClick={() => handleDeleteClick(msg)} className="p-1 px-3 text-red-400 hover:text-red-600 text-sm">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => { setEditingMsg(null); setEditingIndex(null); setShowEditor(true); }}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition shadow-lg shadow-amber-200"
                            >
                                + Create New Message
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateMessageModal
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
                initialMessage={editingMsg}
                isEditing={editingIndex !== null}
                channels={channels}
                roles={roles}
                onSave={handleSaveMessage}
            />

            <ConfirmationModal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={confirmDeleteMessage}
                title="Delete Message"
                message="Are you sure you want to delete this message? This action requires saving to remove it from the database."
                confirmText="Delete"
                isDestructive={true}
            />
        </div>
    );
}