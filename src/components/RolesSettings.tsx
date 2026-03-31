"use client";

import { useState, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";
import { ToastContainer, useToast } from "./Toast";

import { ReactionRoleMessage, Channel, Role, GlobalRolesSettings } from "../types";
import CreateMessageModal from "./CreateMessageModal";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";
import DashboardHeader from "./DashboardHeader";
import PremiumCard from "./PremiumCard";
import { logActivity } from "@/lib/logger";

interface RolesSettingsProps {
    guildId: string;
}

// --- Helper Components ---

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? 'bg-[#248046]' : 'bg-[#80848e]'}`}
    >
        <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
);



// --- Main Component ---

export default function RolesSettings({ guildId }: RolesSettingsProps) {
    // Global Settings State
    const [globalSettings, setGlobalSettings] = useState<GlobalRolesSettings>({ join_roles_enabled: false, join_roles: [], reaction_roles_enabled: false });
    const [originalGlobalSettings, setOriginalGlobalSettings] = useState<GlobalRolesSettings | null>(null);
    const [savingGlobal, setSavingGlobal] = useState(false);
    const { toast, success, error, hideToast } = useToast();

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
                    const loaded = {
                        join_roles_enabled: !!settingsData.join_roles_enabled,
                        join_roles: Array.isArray(settingsData.join_roles) ? settingsData.join_roles : [],
                        reaction_roles_enabled: !!settingsData.reaction_roles_enabled || !!messagesData.length,
                    };
                    setGlobalSettings(loaded);
                    setOriginalGlobalSettings(loaded);
                }

            } catch (error) {
                console.error("Failed to load data", error);
            }
            setLoading(false);
        };
        loadData();
    }, [guildId]);

    // Functions
    const updateGlobalSettings = (updates: Partial<GlobalRolesSettings>) => {
        setGlobalSettings(prev => ({ ...prev, ...updates }));
    };

    const handleSaveGlobal = async () => {
        setSavingGlobal(true);
        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_settings', guild_id: guildId, ...globalSettings })
            });
            if (res.ok) {
                setOriginalGlobalSettings(globalSettings);
                success("Roles configuration saved!");
                await logActivity(guildId, "Roles settings updated", "General roles and join-roles configuration changed.");
            } else {
                error("Failed to save changes.");
            }
        } catch (e) {
            console.error(e);
            error("Network error. Please try again.");
        }
        setSavingGlobal(false);
    };

    const resetGlobalSettings = () => {
        if (originalGlobalSettings) {
            setGlobalSettings(originalGlobalSettings);
        }
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
            success("Message deleted successfully.");
            await logActivity(guildId, "Reaction role message deleted", "A reaction role message was removed from the server.");
        } catch (err) {
            console.error("Error deleting message:", err);
            error("Failed to delete message.");
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
        await logActivity(guildId, "Reaction roles updated", `Reaction role message was ${isUpdate ? "updated" : "created"}.`);
    };


    if (loading) return <CatLoader message="Loading reaction roles..." />;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up pb-20">
            {/* Header */}
            <DashboardHeader
                title="Roles Configuration"
                subtitle="Manage automatic role assignment and reaction roles."
                icon="🎭"
            />

            {/* Global Settings */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Join Roles Card */}
                <div className="glass-card rounded-[8px] p-6 relative border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl">👋</span>
                        <h3 className="font-bold text-gray-200 text-lg">Join Roles</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">Automatically assign roles to new members</p>
                    
                    <div className="flex justify-end absolute top-6 right-6">
                        <Toggle
                            enabled={globalSettings.join_roles_enabled}
                            onChange={(val) => updateGlobalSettings({ join_roles_enabled: val })}
                        />
                    </div>
                    {globalSettings.join_roles_enabled && (
                        <div className="space-y-4 animate-fade-in mt-4">
                            <div className="flex flex-wrap gap-2">
                                {globalSettings.join_roles.length === 0 && (
                                    <span className="text-[#87898c] text-sm italic">No roles configured for joining</span>
                                )}
                                {globalSettings.join_roles.map(roleId => {
                                    const role = roles.find(r => r.id === roleId);
                                    if (!role) return null;
                                    return (
                                        <div key={roleId} className="px-2 py-1 bg-black/20 rounded-[3px] text-xs font-bold flex items-center gap-2 border border-white/10 text-gray-200">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#' + role.color.toString(16).padStart(6, '0') }}></span>
                                            {role.name}
                                            <button onClick={() => updateGlobalSettings({ join_roles: globalSettings.join_roles.filter(id => id !== roleId) })} className="ml-1 hover:text-[#da373c] transition-colors">×</button>
                                        </div>
                                    );
                                })}
                            </div>
                            <select
                                onChange={(e) => {
                                    if (e.target.value && !globalSettings.join_roles.includes(e.target.value)) {
                                        updateGlobalSettings({ join_roles: [...globalSettings.join_roles, e.target.value] });
                                    }
                                    e.target.value = '';
                                }}
                                className="w-full p-2 bg-black/20 border border-transparent rounded-[3px] focus:ring-1 focus:ring-[#5865F2] outline-none text-gray-200 text-sm transition"
                            >
                                <option value="" className="bg-white/5">+ Add Role</option>
                                {roles.filter(r => !globalSettings.join_roles.includes(r.id)).map(r => (
                                    <option key={r.id} value={r.id} className="bg-white/5">{r.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Reaction Roles Card */}
                <div className="glass-card rounded-[8px] p-6 relative border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl">✨</span>
                        <h3 className="font-bold text-gray-200 text-lg">Reaction Roles</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">Self-assignable roles via messages</p>
                    
                    <div className="flex justify-end absolute top-6 right-6">
                        <Toggle
                            enabled={globalSettings.reaction_roles_enabled}
                            onChange={(val) => updateGlobalSettings({ reaction_roles_enabled: val })}
                        />
                    </div>
                    {globalSettings.reaction_roles_enabled && (
                        <div className="space-y-4 animate-fade-in mt-4">
                            <div className="space-y-2">
                                {settings.messages.length === 0 && (
                                    <p className="text-[#87898c] text-sm py-4 text-center">No reaction role messages created yet</p>
                                )}
                                {settings.messages.map((msg, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-black/20 rounded-[8px] border border-white/10 group hover:border-[#5865F2] transition-all duration-300">
                                        <span className="font-bold text-gray-200 text-sm truncate max-w-[200px]">{msg.embeds[0]?.title || 'Untitled Message'}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingMsg(msg); setEditingIndex(idx); setShowEditor(true); }} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-[3px] text-xs font-bold text-white transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteClick(msg)} className="px-1.5 text-[#da373c] hover:bg-[#da373c]/10 rounded-[3px] text-sm transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => { setEditingMsg(null); setEditingIndex(null); setShowEditor(true); }}
                                className="w-full py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold rounded-[3px] transition shadow-md active:scale-95 text-sm"
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
                guildId={guildId}
            />

            <ConfirmationModal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={confirmDeleteMessage}
                title="Delete Message"
                message="Are you sure you want to delete this message?"
                confirmText="Delete"
                isDestructive={true}
            />

            {/* Standard Global Save Bar */}
            {JSON.stringify(globalSettings) !== JSON.stringify(originalGlobalSettings) && originalGlobalSettings && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-[#030305]/95 backdrop-blur-3xl border border-white/10 px-4 py-3 rounded-xl shadow-2xl animate-fade-up flex items-center justify-between gap-6 min-w-[360px]">
                    <span className="text-gray-200 font-bold text-xs uppercase tracking-tight line-clamp-1">Careful — you have unsaved changes!</span>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={resetGlobalSettings}
                            className="text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleSaveGlobal}
                            disabled={savingGlobal}
                            className="px-5 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white font-black rounded-lg transition-all flex items-center gap-2 group text-xs uppercase tracking-tighter disabled:opacity-50"
                        >
                            {savingGlobal ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </div>
            )}

            <ToastContainer toast={toast} onClose={hideToast} />
        </div>
    );
}

