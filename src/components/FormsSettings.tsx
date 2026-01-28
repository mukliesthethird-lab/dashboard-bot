"use client";

import { useState, useEffect } from "react";
import { Form, Channel, Role } from "@/types";
import ToastContainer, { useToast } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";
import FormEditor from "./FormEditor";
import { SkeletonCard } from "./SkeletonLoader";
import EmptyState from "./EmptyState";

interface FormsSettingsProps {
    guildId: string;
}

export default function FormsSettings({ guildId }: FormsSettingsProps) {
    const [forms, setForms] = useState<(Form & { submission_count?: number; last_submission?: string })[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingForm, setEditingForm] = useState<Form | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Form | null>(null);

    const { toast, hideToast, success, error } = useToast();

    // Fetch forms, channels, and roles
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [formsRes, channelsRes, rolesRes] = await Promise.all([
                    fetch(`/api/forms?guild_id=${guildId}`),
                    fetch(`/api/channels?guild_id=${guildId}`),
                    fetch(`/api/roles?guild_id=${guildId}`)
                ]);

                if (formsRes.ok) {
                    const formsData = await formsRes.json();
                    setForms(formsData);
                }
                if (channelsRes.ok) {
                    const channelsData = await channelsRes.json();
                    setChannels(channelsData);
                }
                if (rolesRes.ok) {
                    const rolesData = await rolesRes.json();
                    setRoles(rolesData);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                error("Failed to load forms");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [guildId]);

    // Create a new form
    const handleCreateForm = () => {
        const newForm: Form = {
            guild_id: guildId,
            name: "New Form",
            title: "New Form",
            description: "",
            is_enabled: true,
            submission_type: "default",
            submission_channel_id: undefined,
            ping_roles: [],
            add_roles_on_submit: [],
            remove_roles_on_submit: [],
            cooldown_seconds: 0,
            max_submissions_per_user: 0,
            pages: [{
                id: `page_${Date.now()}`,
                title: "Page 1",
                components: []
            }]
        };
        setEditingForm(newForm);
        setShowEditor(true);
    };

    // Edit existing form
    const handleEditForm = (form: Form) => {
        setEditingForm({ ...form });
        setShowEditor(true);
    };

    // Save form (create or update)
    const handleSaveForm = async (form: Form) => {
        setSaving(true);
        try {
            const response = await fetch("/api/forms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const result = await response.json();

            if (response.ok) {
                success(result.message || "Form saved successfully!");

                // Refresh forms list
                const formsRes = await fetch(`/api/forms?guild_id=${guildId}`);
                if (formsRes.ok) {
                    setForms(await formsRes.json());
                }

                setShowEditor(false);
                setEditingForm(null);
            } else {
                error(result.error || "Failed to save form");
            }
        } catch (err) {
            console.error("Error saving form:", err);
            error("Failed to save form");
        } finally {
            setSaving(false);
        }
    };

    // Delete form
    const handleDeleteForm = async (form: Form) => {
        if (!form.id) return;

        try {
            const response = await fetch(`/api/forms?id=${form.id}&guild_id=${guildId}`, {
                method: "DELETE"
            });

            const result = await response.json();

            if (response.ok) {
                success(result.message || "Form deleted!");
                setForms(forms.filter(f => f.id !== form.id));
            } else {
                error(result.error || "Failed to delete form");
            }
        } catch (err) {
            console.error("Error deleting form:", err);
            error("Failed to delete form");
        } finally {
            setDeleteConfirm(null);
        }
    };

    // Toggle form enabled status
    const handleToggleEnabled = async (form: Form) => {
        const updatedForm = { ...form, is_enabled: !form.is_enabled };
        await handleSaveForm(updatedForm);
    };

    // Format date for display
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return "Never";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Get submission type badge color
    const getSubmissionTypeBadge = (type: string) => {
        switch (type) {
            case "application":
                return "bg-purple-500/20 text-purple-400 border-purple-500/30";
            case "ticket":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default:
                return "bg-green-500/20 text-green-400 border-green-500/30";
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ToastContainer toast={toast} onClose={hideToast} />

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <p className="text-gray-400">
                        Create forms with buttons and modals for applications, feedback, reports, and more.
                    </p>
                </div>
                <button
                    onClick={handleCreateForm}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Form
                </button>
            </div>

            {/* Forms List */}
            {forms.length === 0 ? (
                <EmptyState
                    icon="📋"
                    title="No Forms Yet"
                    description="Create your first form to start collecting responses from your community."
                    actionText="Create Form"
                    onAction={handleCreateForm}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {forms.map((form) => (
                        <div
                            key={form.id}
                            className="group bg-[#12121a] border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10"
                        >
                            {/* Card Header */}
                            <div className="p-5 border-b border-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg truncate group-hover:text-amber-400 transition-colors">
                                            {form.name}
                                        </h3>
                                        <p className="text-gray-500 text-sm truncate mt-1">
                                            {form.title}
                                        </p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${form.is_enabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-gray-600"}`} />
                                </div>

                                {/* Submission Type Badge */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${getSubmissionTypeBadge(form.submission_type)}`}>
                                        {form.submission_type === "application" ? "📝 Application" :
                                            form.submission_type === "ticket" ? "🎫 Ticket" : "📤 Default"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {form.pages.length} page{form.pages.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="p-5 bg-[#0a0a0f]/50">
                                <div className="flex items-center justify-between text-sm mb-3">
                                    <span className="text-gray-400">Submissions</span>
                                    <span className="font-bold text-white">{form.submission_count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">Last Response</span>
                                    <span className="text-gray-300 text-xs">{formatDate(form.last_submission)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-white/5 flex items-center gap-2">
                                <button
                                    onClick={() => handleEditForm(form)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleToggleEnabled(form)}
                                    className={`px-3 py-2 rounded-xl font-semibold transition-all ${form.is_enabled
                                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                        : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                                        }`}
                                    title={form.is_enabled ? "Disable" : "Enable"}
                                >
                                    {form.is_enabled ? "🟢" : "⚫"}
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(form)}
                                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-all"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Editor Modal */}
            {showEditor && editingForm && (
                <FormEditor
                    form={editingForm}
                    channels={channels}
                    roles={roles}
                    guildId={guildId}
                    onSave={handleSaveForm}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingForm(null);
                    }}
                    saving={saving}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteConfirm}
                title="Delete Form"
                message={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also delete all submissions.`}
                confirmText="Delete"
                isDestructive={true}
                onConfirm={() => deleteConfirm && handleDeleteForm(deleteConfirm)}
                onClose={() => setDeleteConfirm(null)}
            />
        </div>
    );
}
