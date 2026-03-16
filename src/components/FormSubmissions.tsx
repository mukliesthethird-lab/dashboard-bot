"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import EmptyState from "./EmptyState";
import { useToast, ToastContainer } from "./Toast";
import ConfirmationModal from "./ConfirmationModal";
import CatLoader from "./CatLoader";

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
    user_avatar?: string;
    responses: Record<string, string>;
    status: 'pending' | 'approved' | 'denied' | 'submitted';
    reviewed_by?: string;
    reviewed_at?: string;
    submitted_at: string;
    form_submission_number?: number;
}

export default function FormSubmissions({
    guildId,
    formId,
    formName,
    submissionType,
    onBack
}: FormSubmissionsProps) {
    const { data: session } = useSession();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isMassEdit, setIsMassEdit] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [avatarCache, setAvatarCache] = useState<Record<string, string>>({});

    // Detail modal state
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Deny reason modal state
    const [showDenyModal, setShowDenyModal] = useState(false);
    const [denyReason, setDenyReason] = useState("");
    const [pendingDenyId, setPendingDenyId] = useState<number | null>(null);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyMessage, setReplyMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState<Submission | null>(null);

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
    }, [formId, guildId, statusFilter, searchTerm]);

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
                    id: submissionId,
                    status,
                    reason,
                    guild_id: guildId,
                    reviewed_by: session?.user?.name || "Admin"
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
                    ids: Array.from(selectedIds),
                    status: action === 'delete' ? undefined : (action === 'approve' ? 'approved' : 'denied'),
                    guild_id: guildId,
                    reviewed_by: session?.user?.name || "Admin"
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

    const handleSendReply = async () => {
        if (!replyingTo || !replyMessage.trim()) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/forms/submissions/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submission_id: replyingTo.id,
                    guild_id: guildId,
                    message: replyMessage
                })
            });

            if (res.ok) {
                success("Reply sent to user DM!");
                setShowReplyModal(false);
                setReplyMessage("");
                setReplyingTo(null);
            } else {
                const data = await res.json();
                const errorMessage = data.details?.message || data.error || "Failed to send reply";
                error(errorMessage + (data.details?.code ? ` (Code: ${data.details.code})` : ""));
            }
        } catch (err) {
            error("Failed to send reply");
        } finally {
            setActionLoading(false);
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

    const getEmbedColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'border-[#fee75c]'; // Discord yellow
            case 'approved':
                return 'border-[#57F287]'; // Discord green
            case 'denied':
                return 'border-[#ED4245]'; // Discord red
            case 'submitted':
            default:
                return 'border-[#5865F2]'; // Discord blurple
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-0.5 rounded-md bg-[#fee75c]/10 text-[#fee75c] text-xs font-bold uppercase border border-[#fee75c]/20">Pending</span>;
            case 'approved':
                return <span className="px-2 py-0.5 rounded-md bg-[#57F287]/10 text-[#57F287] text-xs font-bold uppercase border border-[#57F287]/20">Approved</span>;
            case 'denied':
                return <span className="px-2 py-0.5 rounded-md bg-[#ED4245]/10 text-[#ED4245] text-xs font-bold uppercase border border-[#ED4245]/20">Denied</span>;
            case 'submitted':
                return <span className="px-2 py-0.5 rounded-md bg-[#5865F2]/10 text-[#5865F2] text-xs font-bold uppercase border border-[#5865F2]/20">Submitted</span>;
            default:
                return <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-400 text-xs font-bold uppercase border border-gray-500/20">{status}</span>;
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

    // Auto-fetch missing avatars
    useEffect(() => {
        const usersToFetch = submissions
            .filter(s => !s.user_avatar && !avatarCache[s.user_id])
            .map(s => s.user_id);
        
        if (usersToFetch.length === 0) return;

        // Fetch each missing avatar (only once per unique user)
        const uniqueUsers = Array.from(new Set(usersToFetch));
        
        uniqueUsers.forEach(async (id) => {
            try {
                const res = await fetch(`/api/discord/avatar/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.avatarUrl) {
                        setAvatarCache(prev => ({ ...prev, [id]: data.avatarUrl }));
                    }
                }
            } catch (err) {
                console.error(`Failed to fetch avatar for ${id}:`, err);
            }
        });
    }, [submissions, avatarCache]);


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
                    className="p-2.5 rounded-[4px] bg-[#2b2d31] border border-[#1e1f22] text-gray-400 hover:bg-[#1e1f22] hover:text-white transition"
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
            <div className="bg-[#2b2d31] rounded-[8px] p-6 border border-[#1e1f22] space-y-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by username or response..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 px-5 py-3 bg-[#1e1f22] border-none rounded-[4px] font-medium text-white focus:outline-none focus:ring-0 transition text-sm"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-[#1e1f22] border-none rounded-[4px] text-white font-medium focus:outline-none focus:ring-0 transition text-sm min-w-[200px]"
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
                        className={`px-4 py-2 rounded-[4px] font-medium transition flex items-center gap-2 text-sm ${isMassEdit ? 'bg-[#5865F2] text-white hover:bg-[#4752c4]' : 'bg-[#4f545c] text-white hover:bg-[#5d6269]'}`}
                    >
                        📚 Bulk Actions
                    </button>

                    <button
                        onClick={exportToCSV}
                        disabled={submissions.length === 0}
                        className="px-4 py-2 rounded-[4px] bg-[#4f545c] text-white hover:bg-[#5d6269] font-medium transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        📥 Export CSV
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

            {/* Submissions Embed Cards */}
            <div className="w-full mt-4">
                 {loading ? (
                    <div className="bg-[#2b2d31] rounded-[8px] border border-[#1e1f22] p-8">
                        <CatLoader message="Loading submissions..." />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="bg-[#2b2d31] rounded-[8px] border border-[#1e1f22] p-8">
                        <EmptyState
                            icon="📋"
                            title="No Submissions Yet"
                            description="This form hasn't received any submissions yet. Once users start filling out the form, their responses will appear here."
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                        {submissions.map((item) => {
                            const dateInfo = formatDate(item.submitted_at);
                            return (
                                <div key={item.id} className="relative flex flex-col w-full animate-fade-in group">
                                     {/* Mass Edit Checkbox */}
                                     {isMassEdit && (
                                        <div className="absolute -left-6 top-6 z-10 w-6 h-6 flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-white/20 bg-[#2b2d31] text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500 shadow-xl"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                            />
                                        </div>
                                    )}

                                    {/* Discord Embed Card container */}
                                    <div className={`flex flex-col bg-[#2b2d31] rounded-[4px] border-l-4 ${getEmbedColor(item.status)} overflow-hidden ${isMassEdit && selectedIds.has(item.id) ? 'ring-2 ring-amber-500/50' : ''}`}>
                                        
                                        {/* Embed Body */}
                                        <div className="p-4 flex flex-col gap-3">
                                            {/* Header Section */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm">Forms</span>
                                                    <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] leading-none flex items-center gap-1">
                                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                                            <path fillRule="evenodd" clipRule="evenodd" d="M19.9626 5.37899L18.6656 4.08599L10.2836 12.463L6.33862 8.525L5.04262 9.818L10.2836 15.053L19.9626 5.37899Z" />
                                                        </svg>
                                                        APP
                                                    </span>
                                                    <span className="text-gray-400 text-[12px] ml-1">{dateInfo.relative}</span>
                                                </div>
                                                {getStatusBadge(item.status)}
                                            </div>

                                            {/* Title / Author Info */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <img 
                                                    src={item.user_avatar || avatarCache[item.user_id] || getAvatarUrl(item.user_id)} 
                                                    alt={item.username}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-white text-[15px] leading-tight hover:underline cursor-pointer">{item.username}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">({item.user_id})</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Responses body */}
                                            <div className="flex flex-col mt-2 space-y-3">
                                                {Object.entries(item.responses).map(([question, answer]) => (
                                                    <div key={question} className="flex flex-col gap-1">
                                                        <h3 className="font-bold text-white text-[14px] leading-tight flex items-start gap-1">
                                                            <span>{question}</span>
                                                        </h3>
                                                        <div className="text-[#dbdee1] text-[14px] whitespace-pre-wrap break-words leading-relaxed pl-1 border-l-2 border-[#4E5058] rounded-sm py-0.5 bg-[#1E1F22]/30 px-2">
                                                            {answer ? answer : <span className="italic text-gray-500">No response</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Footer Info */}
                                            <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <span>Submission #{item.form_submission_number || item.id}</span>
                                                    <span>•</span>
                                                    <span className="font-mono">{item.user_id}</span>
                                                    {item.reviewed_by && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Reviewed by {item.reviewed_by}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons (Discord styled) */}
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                         <button
                                            onClick={() => {
                                                setReplyingTo(item);
                                                setShowReplyModal(true);
                                            }}
                                            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium rounded-[4px] transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.39.84 4.59 2.25 6.31l-1.01 3.03a1 1 0 001.27 1.27l3.03-1.01C9.41 23.16 11.61 24 12 24c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.85 0-3.58-.64-4.95-1.72a1 1 0 00-.73-.27l-1.92.64.64-1.92a1 1 0 00-.27-.73C3.64 15.58 3 13.85 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z"/></svg>
                                            Reply
                                        </button>

                                         <button
                                            onClick={() => {
                                                setSelectedSubmission(item);
                                                setShowDetailModal(true);
                                            }}
                                            className="px-4 py-2 bg-[#4e5058] hover:bg-[#686d73] text-white text-sm font-medium rounded-[4px] transition-colors"
                                        >
                                            View Details
                                        </button>

                                        {submissionType === 'application' && item.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(item.id, 'approved')}
                                                    disabled={actionLoading}
                                                    className="px-4 py-2 bg-[#248046] hover:bg-[#1a5f33] text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPendingDenyId(item.id);
                                                        setShowDenyModal(true);
                                                    }}
                                                    disabled={actionLoading}
                                                    className="px-4 py-2 bg-[#da373c] hover:bg-[#a12828] text-white text-sm font-medium rounded-[4px] transition-colors disabled:opacity-50"
                                                >
                                                    Deny
                                                </button>
                                            </>
                                        )}
                                        
                                        {/* Optional Delete Button per item for quicker management */}
                                        <button
                                            onClick={() => setConfirmAction({
                                                isOpen: true,
                                                title: `Delete Submission #${item.form_submission_number || item.id}`,
                                                message: `Are you sure you want to permanently delete submission from ${item.username}?`,
                                                action: () => {
                                                    setSelectedIds(new Set([item.id]));
                                                    handleBulkAction('delete');
                                                }
                                            })}
                                            disabled={actionLoading}
                                            className="ml-auto p-2 bg-transparent hover:bg-red-500/10 text-red-400 rounded-[4px] transition-colors disabled:opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                            title="Delete Submission"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    
            {/* Reply Modal */}
            {showReplyModal && replyingTo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReplyModal(false)}>
                    <div className="bg-[#313338] border border-white/10 rounded-[8px] p-6 w-full max-w-lg shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#5865F2]/10 rounded-full">
                                <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.39.84 4.59 2.25 6.31l-1.01 3.03a1 1 0 001.27 1.27l3.03-1.01C9.41 23.16 11.61 24 12 24c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.85 0-3.58-.64-4.95-1.72a1 1 0 00-.73-.27l-1.92.64.64-1.92a1 1 0 00-.27-.73C3.64 15.58 3 13.85 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z"/></svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Reply to {replyingTo.username}</h2>
                                <p className="text-gray-400 text-sm">This message will be sent to the user's DM via the bot.</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Your Message</label>
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder={`Hi ${replyingTo.username}, thank you for your submission...`}
                                rows={5}
                                className="w-full px-4 py-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[4px] text-white transition-all outline-none resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowReplyModal(false);
                                    setReplyMessage("");
                                    setReplyingTo(null);
                                }}
                                className="px-4 py-2 text-white font-medium hover:underline transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendReply}
                                disabled={actionLoading || !replyMessage.trim()}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-medium rounded-[4px] transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                )}
                                Send Reply
                            </button>
                        </div>
                    </div>
                </div>
            )}
</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedSubmission && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-[#2b2d31] shadow-2xl rounded-[4px] border-l-4 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" style={{ borderLeftColor: getEmbedColor(selectedSubmission.status).replace('border-[', '').replace(']', '') }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="p-6 pb-4 border-b border-[#1E1F22]/50 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-white text-sm">Forms</span>
                                    <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] leading-none flex items-center gap-1">APP</span>
                                </div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Submission #{selectedSubmission.id}
                                    {getStatusBadge(selectedSubmission.status)}
                                </h2>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-white transition p-1">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <img src={selectedSubmission.user_avatar || getAvatarUrl(selectedSubmission.user_id)} alt="Avatar" className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="text-white font-bold text-lg leading-tight hover:underline cursor-pointer">{selectedSubmission.username}</div>
                                    <div className="text-gray-400 font-mono text-xs">{selectedSubmission.user_id}</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {Object.entries(selectedSubmission.responses).map(([question, answer]) => (
                                    <div key={question} className="flex flex-col gap-1.5">
                                        <h3 className="font-bold text-white text-[15px]">{question}</h3>
                                        <div className="text-[#dbdee1] text-[15px] whitespace-pre-wrap break-words leading-relaxed pl-2 border-l-2 border-[#4E5058] rounded-sm py-1 bg-[#1E1F22]/30 px-3">
                                            {answer || <span className="text-gray-500 italic">No response provided</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer / Actions */}
                        <div className="p-4 bg-[#2b2d31] border-t border-[#1E1F22]/50 flex items-center justify-between mt-auto">
                            <div className="text-[11px] font-medium text-gray-400">
                                <span className="font-bold text-gray-300">{formatDate(selectedSubmission.submitted_at).full}</span>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 hover:underline text-white font-medium text-sm transition">
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
                                            className="px-4 py-2 bg-[#248046] hover:bg-[#1a5f33] text-white font-medium text-sm rounded-[4px] transition disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPendingDenyId(selectedSubmission.id);
                                                setShowDenyModal(true);
                                                setShowDetailModal(false);
                                            }}
                                            disabled={actionLoading}
                                            className="px-4 py-2 bg-[#da373c] hover:bg-[#a12828] text-white font-medium text-sm rounded-[4px] transition disabled:opacity-50"
                                        >
                                            Deny
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


            {/* Reply Modal */}
            {showReplyModal && replyingTo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReplyModal(false)}>
                    <div className="bg-[#313338] border border-white/10 rounded-[8px] p-6 w-full max-w-lg shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-[#5865F2]/10 rounded-full">
                                <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.39.84 4.59 2.25 6.31l-1.01 3.03a1 1 0 001.27 1.27l3.03-1.01C9.41 23.16 11.61 24 12 24c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.85 0-3.58-.64-4.95-1.72a1 1 0 00-.73-.27l-1.92.64.64-1.92a1 1 0 00-.27-.73C3.64 15.58 3 13.85 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z"/></svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Reply to {replyingTo.username}</h2>
                                <p className="text-gray-400 text-sm">This message will be sent to the user's DM via the bot.</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Your Message</label>
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder={`Hi ${replyingTo.username}, thank you for your submission...`}
                                rows={5}
                                className="w-full px-4 py-3 bg-[#1e1f22] border border-transparent focus:border-[#5865F2] rounded-[4px] text-white transition-all outline-none resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowReplyModal(false);
                                    setReplyMessage("");
                                    setReplyingTo(null);
                                }}
                                className="px-4 py-2 text-white font-medium hover:underline transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendReply}
                                disabled={actionLoading || !replyMessage.trim()}
                                className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-medium rounded-[4px] transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                )}
                                Send Reply
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
