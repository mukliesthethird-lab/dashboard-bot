"use client";

import { useState, useEffect, useCallback } from "react";
import EmptyState from "./EmptyState";
import { useToast, ToastContainer } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";

interface FormSubmissionsProps {
    guildId: string;
    formId: number;
    formName: string;
    submissionType: 'default' | 'application' | 'ticket';
    onBack: () => void;
}

interface Submission {
    id: number;
    form_id: number;
    user_id: string;
    username: string;
    responses: Record<string, string>;
    status: 'pending' | 'approved' | 'denied' | 'submitted';
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at: string;
}

export default function FormSubmissions({
    guildId,
    formId,
    formName,
    submissionType,
    onBack
}: FormSubmissionsProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isMassEdit, setIsMassEdit] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    // Detail modal state
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Deny reason modal state
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [denyReason, setDenyReason] = useState("");
    const [pendingDenyId, setPendingDenyId] = useState<number | null>(null);

    // Confirm modal state
    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
    }>({ isOpen: false, title: "", message: "", action: () => { } });

    const { toast, hideToast, success, error } = useToast();

    const fetchSubmissions = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                formId: formId.toString(),
                guildId: guildId,
            });

            if (statusFilter !== "all") {
                params.set("status", statusFilter);
            }
            if (search || searchTerm) {
                params.set("search", search || searchTerm);
            }

            const res = await fetch(`/api/forms/submissions?${params}`);
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data.submissions || []);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error('Failed to fetch submissions:', err);
            error("Failed to load submissions");
        } finally {
            setLoading(false);
        }
    }, [formId, guildId, statusFilter, searchTerm, error]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            fetchSubmissions(value);
        }, 500);
        setSearchTimeout(timeout);
    };

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === submissions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(submissions.map(s => s.id)));
        }
    };

    const handleStatusUpdate = async (submissionId: number, status: 'approved' | 'denied', reason?: string) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/forms/submissions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId,
                    status,
                    reason,
                    guildId
                })
            });

            if (res.ok) {
                success(`Submission ${status}`);
                fetchSubmissions();
            } else {
                error("Failed to update submission");
            }
        } catch (err) {
            error("Failed to update submission");
        } finally {
            setActionLoading(false);
            setShowDenyModal(false);
            setDenyReason("");
            setPendingDenyId(null);
        }
    };

    const handleBulkAction = async (action: 'approve' | 'deny' | 'delete') => {
        if (selectedIds.size === 0) return;
        setActionLoading(true);

        try {
            const res = await fetch('/api/forms/submissions', {
                method: action === 'delete' ? 'DELETE' : 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionIds: Array.from(selectedIds),
                    status: action === 'delete' ? undefined : action === 'approve' ? 'approved' : 'denied',
                    guildId
                })
            });

            if (res.ok) {
                success(`${selectedIds.size} submissions ${action}d`);
                setSelectedIds(new Set());
                fetchSubmissions();
            } else {
                error(`Failed to ${action} submissions`);
            }
        } catch (err) {
            error(`Failed to ${action} submissions`);
        } finally {
            setActionLoading(false);
            setConfirmAction({ ...confirmAction, isOpen: false });
        }
    };

    const exportToCSV = () => {
        if (submissions.length === 0) return;

        // Get all unique response keys
        const allKeys = new Set<string>();
        submissions.forEach(s => Object.keys(s.responses).forEach(k => allKeys.add(k)));
        const responseKeys = Array.from(allKeys);

        // Build CSV
        const headers = ['ID', 'User', 'User ID', 'Status', 'Submitted At', ...responseKeys];
        const rows = submissions.map(s => [
            s.id.toString(),
            s.username,
            s.user_id,
            s.status,
            new Date(s.submitted_at).toLocaleString(),
            ...responseKeys.map(k => `"${(s.responses[k] || '').replace(/"/g, '""')}"`)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${formName.replace(/\s+/g, '_')}_submissions.csv`;
        link.click();
        URL.revokeObjectURL(url);
        success("Exported to CSV");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">⏳ Pending</span>;
            case 'approved':
                return <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">✅ Approved</span>;
            case 'denied':
                return <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">❌ Denied</span>;
            case 'submitted':
                return <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">📋 Submitted</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold">{status}</span>;
        }
    };

    const getAvatarUrl = (userId: string) => {
        try {
            const index = Number((BigInt(userId) >> 22n) % 6n);
            return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
        } catch {
            return `https://cdn.discordapp.com/embed/avatars/0.png`;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            full: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            relative: getRelativeTime(date)
        };
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <ToastContainer toast={toast} onClose={hideToast} />

            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={onBack}
                    className="p-2.5 rounded-xl bg-[#16161f] border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div className="flex items-center gap-2 text-gray-400 font-bold text-lg">
                    <span className="hover:text-white transition cursor-pointer" onClick={onBack}>
                        📝 Forms
                    </span>
                    <span>›</span>
                    <span className="text-white">{formName}</span>
                    <span>›</span>
                    <span className="text-amber-400">Submissions</span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#16161f] rounded-3xl p-6 border border-white/10 space-y-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by username or response..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-white focus:outline-none focus:border-amber-500/50 transition"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-amber-500/50"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                        <option value="submitted">Submitted</option>
                    </select>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsMassEdit(!isMassEdit)}
                        className={`px-4 py-2 rounded-xl border font-bold transition flex items-center gap-2 text-sm ${isMassEdit ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                        <span className="text-lg">📚</span> Bulk Actions
                    </button>

                    <button
                        onClick={exportToCSV}
                        disabled={submissions.length === 0}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 font-bold transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-lg">📥</span> Export CSV
                    </button>

                    <div className="ml-auto text-gray-500 text-sm font-medium self-center">
                        {loading ? 'Loading...' : `Found ${total} submissions.`}
                    </div>
                </div>

                {/* Bulk Actions Panel */}
                {isMassEdit && (
                    <div className="pt-4 border-t border-white/10 animate-slide-down">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="text-gray-300 font-bold whitespace-nowrap">
                                Selected {selectedIds.size} submissions
                            </div>

                            <button
                                onClick={selectAll}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition text-sm font-bold whitespace-nowrap border border-white/10"
                            >
                                {selectedIds.size === submissions.length ? 'Deselect all' : 'Select all'}
                            </button>

                            <div className="h-6 w-px bg-white/10 hidden md:block"></div>

                            {submissionType === 'application' && (
                                <>
                                    <button
                                        onClick={() => setConfirmAction({
                                            isOpen: true,
                                            title: "Approve Submissions",
                                            message: `Are you sure you want to approve ${selectedIds.size} submission(s)?`,
                                            action: () => handleBulkAction('approve')
                                        })}
                                        disabled={selectedIds.size === 0 || actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                                    >
                                        ✅ Approve
                                    </button>
                                    <button
                                        onClick={() => setConfirmAction({
                                            isOpen: true,
                                            title: "Deny Submissions",
                                            message: `Are you sure you want to deny ${selectedIds.size} submission(s)?`,
                                            action: () => handleBulkAction('deny')
                                        })}
                                        disabled={selectedIds.size === 0 || actionLoading}
                                        className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                                    >
                                        ❌ Deny
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => setConfirmAction({
                                    isOpen: true,
                                    title: "Delete Submissions",
                                    message: `Are you sure you want to permanently delete ${selectedIds.size} submission(s)? This action cannot be undone.`,
                                    action: () => handleBulkAction('delete')
                                })}
                                disabled={selectedIds.size === 0 || actionLoading}
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 disabled:opacity-50 transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Submissions Table */}
            <div className="bg-[#16161f] rounded-3xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : submissions.length === 0 ? (
                        <EmptyState
                            icon="📋"
                            title="No Submissions Yet"
                            description="This form hasn't received any submissions yet. Once users start filling out the form, their responses will appear here."
                        />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-extrabold">
                                    {isMassEdit && (
                                        <th className="px-6 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                checked={selectedIds.size === submissions.length && submissions.length > 0}
                                                onChange={selectAll}
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Submitted</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {submissions.map((item) => {
                                    const dateInfo = formatDate(item.submitted_at);
                                    return (
                                        <tr key={item.id} className="hover:bg-white/5 transition group">
                                            {isMassEdit && (
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                        checked={selectedIds.has(item.id)}
                                                        onChange={() => toggleSelection(item.id)}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-bold text-white font-mono">#{item.id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full bg-[#202029] bg-cover bg-center shrink-0 border border-white/10"
                                                        style={{ backgroundImage: `url(${getAvatarUrl(item.user_id)})` }}
                                                    ></div>
                                                    <div>
                                                        <div className="font-bold text-gray-200 text-sm">{item.username}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{item.user_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-gray-300">{dateInfo.full}</div>
                                                <div className="text-xs text-gray-500">{dateInfo.relative}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSubmission(item);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                                                        title="View Details"
                                                    >
                                                        👁️
                                                    </button>

                                                    {submissionType === 'application' && item.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleStatusUpdate(item.id, 'approved')}
                                                                disabled={actionLoading}
                                                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                ✅
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPendingDenyId(item.id);
                                                                    setShowDenyModal(true);
                                                                }}
                                                                disabled={actionLoading}
                                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition disabled:opacity-50"
                                                                title="Deny"
                                                            >
                                                                ❌
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedSubmission && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-[#16161f] border border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white">📋 Submission #{selectedSubmission.id}</h2>
                                <p className="text-gray-400 mt-1">Submitted by {selectedSubmission.username}</p>
                            </div>
                            {getStatusBadge(selectedSubmission.status)}
                        </div>

                        <div className="space-y-4 mb-6">
                            {Object.entries(selectedSubmission.responses).map(([question, answer]) => (
                                <div key={question} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <div className="text-sm font-bold text-amber-400 mb-2">{question}</div>
                                    <div className="text-gray-200 whitespace-pre-wrap">{answer || <span className="text-gray-500 italic">No response</span>}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <div className="text-sm text-gray-500">
                                User ID: <span className="font-mono text-gray-400">{selectedSubmission.user_id}</span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl transition"
                                >
                                    Close
                                </button>

                                {submissionType === 'application' && selectedSubmission.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleStatusUpdate(selectedSubmission.id, 'approved');
                                                setShowDetailModal(false);
                                            }}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition disabled:opacity-50"
                                        >
                                            ✅ Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPendingDenyId(selectedSubmission.id);
                                                setShowDenyModal(true);
                                                setShowDetailModal(false);
                                            }}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50"
                                        >
                                            ❌ Deny
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deny Reason Modal */}
            {showDenyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDenyModal(false)}>
                    <div className="bg-[#16161f] border border-white/10 rounded-3xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-white mb-2">❌ Deny Submission</h2>
                        <p className="text-gray-400 mb-6">Provide a reason for denying this submission (optional).</p>

                        <textarea
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            placeholder="Reason for denial..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-red-500/50 text-white mb-6 resize-none"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDenyModal(false);
                                    setDenyReason("");
                                    setPendingDenyId(null);
                                }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (pendingDenyId) {
                                        handleStatusUpdate(pendingDenyId, 'denied', denyReason);
                                    }
                                }}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition"
                            >
                                {actionLoading ? 'Denying...' : 'Deny Submission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                onConfirm={confirmAction.action}
                title={confirmAction.title}
                message={confirmAction.message}
                confirmText="Confirm"
                isDestructive={confirmAction.title.includes('Delete') || confirmAction.title.includes('Deny')}
            />
        </div>
    );
}
