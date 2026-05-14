"use client";

import Loading from "@/components/Loading";

import { useState, useEffect } from "react";
import { Form, Channel, Role } from "@/types";
import ToastContainer, { useToast } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";
import FormEditor from "./FormEditor";
import FormSubmissions from "./FormSubmissions";
import FormPanelEditor from "./FormPanelEditor";
import EmptyState from "./EmptyState";
import { logActivity } from "@/lib/logger";

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
    const [viewingSubmissions, setViewingSubmissions] = useState<Form | null>(null);
    const [sendingPanel, setSendingPanel] = useState<Form | null>(null);

    const { toast, hideToast, success, error } = useToast();

    // Fetch forms, channels, and roles
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [formsRes, channelsRes, rolesRes] = await Promise.all([
                    fetch(`/api/forms?guild_id=${guildId}`),
                    fetch(`/api/welcome?action=channels&guild_id=${guildId}`),
                    fetch(`/api/welcome?action=roles&guild_id=${guildId}`)
                ]);

                if (formsRes.ok) {
                    const formsData = await formsRes.json();
                    setForms(Array.isArray(formsData) ? formsData : []);
                }
                if (channelsRes.ok) {
                    const channelsData = await channelsRes.json();
                    setChannels(Array.isArray(channelsData) ? channelsData : []);
                }
                if (rolesRes.ok) {
                    const rolesData = await rolesRes.json();
                    setRoles(Array.isArray(rolesData) ? rolesData : []);
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
                await logActivity(guildId, "Form updated", `Form "${form.name}" was ${form.id ? "updated" : "created"}.`);

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
                await logActivity(guildId, "Form deleted", `Form "${form.name}" was removed.`);
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
        const newStatus = !form.is_enabled;
        const updatedForm = { ...form, is_enabled: newStatus };

        // Optimistic UI update
        setForms(forms.map(f => f.id === form.id ? updatedForm : f));

        try {
            const response = await fetch("/api/forms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedForm)
            });

            if (response.ok) {
                const actionText = newStatus ? "enabled" : "disabled";
                success(`${form.name} is now ${newStatus ? "Active" : "Disabled"}!`);
                await logActivity(guildId, `Form ${actionText}`, `Form "${form.name}" status changed to ${actionText}.`);
            } else {
                // Revert state if failed
                setForms(forms.map(f => f.id === form.id ? form : f));
                error("Failed to update form status");
            }
        } catch (err) {
            console.error("Error toggling form state:", err);
            // Revert state
            setForms(forms.map(f => f.id === form.id ? form : f));
            error("Failed to update form status");
        }
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
        return <Loading message="Loading forms..." />;
    }

    return (
        <div className="space-y-6">
            <ToastContainer toast={toast} onClose={hideToast} />

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <p className="text-[var(--text-secondary)]">
                    </p>
                </div>
                <button
                    onClick={handleCreateForm}
                    className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-[4px] transition-colors"
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
                            className="group glass-card rounded-[8px] overflow-hidden transition-all duration-200 hover:shadow-lg"
                        >
                            {/* Card Header */}
                            <div className="p-4 border-b border-[var(--border)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-base truncate transition-colors">
                                            {form.name}
                                        </h3>
                                        <p className="text-[var(--text-primary)] text-xs truncate mt-1">
                                            {form.title}
                                        </p>
                                    </div>
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${form.is_enabled ? "bg-[#23a559]" : "bg-[#80848e]"}`} />
                                </div>

                                {/* Submission Type Badge */}
                                <div className="mt-3 flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-[4px] uppercase ${getSubmissionTypeBadge(form.submission_type)}`}>
                                        {form.submission_type === "application" ? "📝 Application" :
                                            form.submission_type === "ticket" ? "🎫 Ticket" : "📤 Default"}
                                    </span>
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-[4px]">
                                        {form.pages.length} PAGE{form.pages.length !== 1 ? "S" : ""}
                                    </span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="px-4 py-3 bg-[var(--bg-tertiary)]">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-[var(--text-secondary)] font-medium">Submissions</span>
                                    <span className="font-bold text-white">{form.submission_count || 0}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-secondary)] font-medium">Last Response</span>
                                    <span className="text-[var(--text-primary)]">{formatDate(form.last_submission)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-3 border-t border-[var(--border)] flex items-center gap-2">
                                <button
                                    onClick={() => handleEditForm(form)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-hover)] hover:bg-white/20 text-white text-sm font-medium rounded-[3px] transition-colors"
                                    title="Edit Form"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                                <button
                                    onClick={() => setViewingSubmissions(form)}
                                    className="px-3 flex items-center justify-center py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-[3px] transition-colors"
                                    title="View Submissions"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </button>
                                <button
                                    onClick={() => setSendingPanel(form)}
                                    className="px-3 flex items-center justify-center py-1.5 bg-[var(--bg-hover)] hover:bg-white/20 text-white rounded-[3px] transition-colors"
                                    title="Send Panel to Channel"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(form)}
                                    className="px-3 flex items-center justify-center py-1.5 bg-[#da373c] hover:bg-[#a12828] text-white rounded-[3px] transition-colors"
                                    title="Delete"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>

                                <div className="w-px h-6 bg-[var(--bg-hover)] mx-0.5"></div>

                                <button
                                    onClick={() => handleToggleEnabled(form)}
                                    className={`relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.is_enabled ? "bg-[#23a559]" : "bg-[#80848e]"}`}
                                    title={form.is_enabled ? "Turn Off" : "Turn On"}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_enabled ? "translate-x-[16px]" : "translate-x-0"}`}
                                    />
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

            {/* Submissions Viewer */}
            {viewingSubmissions && (
                <div className="fixed inset-0 bg-[#05050a]/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-8 pt-24 sm:pt-24 animate-fade-in">
                    <div className="w-full max-w-7xl max-h-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-[8px] shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            <FormSubmissions
                                guildId={guildId}
                                formId={viewingSubmissions.id!}
                                formName={viewingSubmissions.name}
                                submissionType={viewingSubmissions.submission_type}
                                onBack={() => setViewingSubmissions(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Panel Editor Modal */}
            {sendingPanel && (
                <FormPanelEditor
                    form={sendingPanel}
                    channels={channels}
                    guildId={guildId}
                    onClose={() => setSendingPanel(null)}
                    onSave={() => {
                        // Refresh forms list after sending panel
                        fetch(`/api/forms?guild_id=${guildId}`)
                            .then(res => res.json())
                            .then(data => setForms(data));
                    }}
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


