"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import EmptyState from "./EmptyState";

interface ModerationCasesProps {
    guildId: string;
}

interface Case {
    id: string;
    type: "ban" | "kick" | "mute" | "warn";
    user: {
        id: string;
        username: string;
        avatar: string;
    };
    reason: string;
    author: {
        id: string;
        username: string;
        avatar: string;
    };
    duration: string;
    status: "open" | "closed";
    created_at: string;
    relative_time: string;
}

export default function ModerationCases({ guildId }: ModerationCasesProps) {
    const [cases, setCases] = useState<Case[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMassEdit, setIsMassEdit] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    // Filter States
    const [filters, setFilters] = useState({
        bans: true,
        kicks: true,
        mutes: true,
        warns: true,
        open: true,
        closed: true,
        showMass: true,
        onlyMass: false,
        timeRange: "All time"
    });

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editReason, setEditReason] = useState("");
    const [editDuration, setEditDuration] = useState("");

    const fetchCases = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const types = [];
            if (filters.bans) types.push('ban');
            if (filters.kicks) types.push('kick');
            if (filters.mutes) types.push('mute');
            if (filters.warns) types.push('warn');

            const status = filters.open && filters.closed ? 'all' : filters.open ? 'open' : 'closed';

            const params = new URLSearchParams({
                action: 'cases',
                guild_id: guildId,
                type: types.join(','),
                status: status,
                search: search ?? searchTerm
            });

            const res = await fetch(`/api/moderation?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCases(data.cases || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch cases:', error);
        } finally {
            setLoading(false);
        }
    }, [guildId, filters, searchTerm]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            fetchCases(value);
        }, 500);
        setSearchTimeout(timeout);
    };

    const getIcon = (type: Case['type']) => {
        switch (type) {
            case "ban": return <span className="text-red-500 text-lg">🔨</span>;
            case "kick": return <span className="text-orange-500 text-lg">🥾</span>;
            case "mute": return <span className="text-blue-500 text-lg">🔇</span>;
            case "warn": return <span className="text-yellow-500 text-lg">⚠️</span>;
            default: return null;
        }
    };

    const getStatusColor = (type: Case['type']) => {
        switch (type) {
            case "ban": return "bg-red-500";
            case "kick": return "bg-orange-500";
            case "mute": return "bg-blue-500";
            case "warn": return "bg-yellow-500";
            default: return "bg-stone-400";
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === cases.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(cases.map(c => c.id)));
        }
    };

    const handleMassAction = async (action: 'case-edit' | 'case-close' | 'case-delete') => {
        if (selectedIds.size === 0) return;
        setActionLoading(true);

        try {
            const body: any = {
                action,
                guild_id: guildId,
                case_ids: Array.from(selectedIds)
            };

            if (action === 'case-edit') {
                if (editReason) body.reason = editReason;
                if (editDuration) body.duration = editDuration;
            }

            const res = await fetch('/api/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setSelectedIds(new Set());
                setShowEditModal(false);
                setEditReason("");
                setEditDuration("");
                fetchCases();
            }
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-4 mb-4">
                <Link
                    href={`/dashboard/${guildId}/moderation`}
                    className="p-2.5 rounded-xl bg-white/90 border-2 border-amber-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600 transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="flex items-center gap-2 text-stone-500 font-bold text-lg">
                    <Link href={`/dashboard/${guildId}/moderation`} className="hover:text-amber-600 transition">
                        🛡️ Moderation
                    </Link>
                    <span>›</span>
                    <span className="text-stone-800">Cases</span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-amber-100 shadow-md space-y-4 mb-4">
                <input
                    type="text"
                    placeholder="Case ID / User ID / Reason"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-5 py-3 bg-stone-50 border-2 border-amber-100 rounded-xl font-medium text-stone-700 focus:outline-none focus:border-amber-400 transition"
                />

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                        className={`px-4 py-2 rounded-xl border font-bold transition flex items-center gap-2 text-sm ${isFiltersOpen ? 'bg-stone-100 border-stone-300 text-stone-800' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                        <span className="text-lg">⚙️</span> Filters
                        <svg className={`w-4 h-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setIsMassEdit(!isMassEdit)}
                        className={`px-4 py-2 rounded-xl border font-bold transition flex items-center gap-2 text-sm ${isMassEdit ? 'bg-stone-100 border-stone-300 text-stone-800' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                        <span className="text-lg">📚</span> Mass edit
                        <svg className={`w-4 h-4 transition-transform ${isMassEdit ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div className="ml-auto text-stone-400 text-sm font-medium self-center">
                        {loading ? 'Loading...' : `Found ${total} cases.`}
                    </div>
                </div>

                {/* Filters Expandable Section */}
                {isFiltersOpen && (
                    <div className="pt-4 border-t border-stone-100 animate-slide-down space-y-4">
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            {/* Case Types */}
                            <div className="flex items-center gap-3">
                                {['bans', 'kicks', 'mutes', 'warns'].map((type) => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-stone-300 text-blue-500 focus:ring-blue-500 rounded-md"
                                            checked={(filters as any)[type]}
                                            onChange={(e) => setFilters({ ...filters, [type]: e.target.checked })}
                                        />
                                        <span className="text-stone-700 font-bold capitalize text-sm">{type}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="w-px h-5 bg-stone-300 hidden md:block"></div>

                            {/* Status */}
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-blue-500 focus:ring-blue-500 rounded-md"
                                        checked={filters.open}
                                        onChange={(e) => setFilters({ ...filters, open: e.target.checked })}
                                    />
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span className="text-stone-700 font-bold text-sm">Open</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-blue-500 focus:ring-blue-500 rounded-md"
                                        checked={filters.closed}
                                        onChange={(e) => setFilters({ ...filters, closed: e.target.checked })}
                                    />
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-stone-700 font-bold text-sm">Closed</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mass Edit Expandable Panel */}
                {isMassEdit && (
                    <div className="pt-4 border-t border-stone-100 animate-slide-down">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="text-stone-500 font-bold whitespace-nowrap">
                                Selected {selectedIds.size} cases
                            </div>

                            <button
                                onClick={selectAll}
                                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition text-sm font-bold whitespace-nowrap"
                            >
                                Select all cases
                            </button>

                            <div className="h-6 w-px bg-stone-300 hidden md:block"></div>

                            <button
                                onClick={() => setShowEditModal(true)}
                                disabled={selectedIds.size === 0 || actionLoading}
                                className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => handleMassAction('case-close')}
                                disabled={selectedIds.size === 0 || actionLoading}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                {actionLoading ? '...' : '✅ Close'}
                            </button>
                            <button
                                onClick={() => handleMassAction('case-delete')}
                                disabled={selectedIds.size === 0 || actionLoading}
                                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-amber-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : cases.length === 0 ? (
                        <EmptyState
                            variant="moderation"
                            title="No Cases Found"
                            description="There are no moderation cases matching your criteria. Your server is squeaky clean!"
                        />
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-amber-50/50 border-b border-amber-100 text-stone-500 text-xs uppercase tracking-wider font-extrabold">
                                    {isMassEdit && (
                                        <th className="px-6 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                checked={selectedIds.size === cases.length && cases.length > 0}
                                                onChange={selectAll}
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4">Duration</th>
                                    <th className="px-6 py-4">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                                {cases.map((item) => (
                                    <tr key={item.id} className="hover:bg-amber-50/30 transition group">
                                        {isMassEdit && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${item.status === 'closed' ? 'bg-green-500' : getStatusColor(item.type)}`}></div>
                                                <div className="flex items-center gap-1.5">
                                                    {getIcon(item.type)}
                                                    <span className="font-bold text-stone-700 font-mono">{item.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-stone-200 bg-cover" style={{ backgroundImage: `url(https://cdn.discordapp.com/embed/avatars/${item.user.avatar}.png)` }}></div>
                                                <div>
                                                    <div className="font-bold text-stone-800 text-sm">{item.user.username}</div>
                                                    <div className="text-xs text-stone-400 font-mono">{item.user.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 font-medium text-sm max-w-[200px] truncate">
                                            {item.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-stone-200 bg-cover" style={{ backgroundImage: `url(https://cdn.discordapp.com/embed/avatars/${item.author.avatar}.png)` }}></div>
                                                <div>
                                                    <div className="font-bold text-stone-800 text-sm">{item.author.username}</div>
                                                    <div className="text-xs text-stone-400 font-mono">{item.author.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 text-sm font-medium">
                                            {item.duration}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-stone-700">{item.created_at}</div>
                                            <div className="text-xs text-stone-400">{item.relative_time}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="text-center text-xs text-stone-400 font-medium mt-4">
                © 2021-2025 Don Pollo • Terms • Privacy • Legal Notice
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-black text-stone-800 mb-4">✏️ Edit Cases</h2>
                        <p className="text-stone-500 mb-6">Edit {selectedIds.size} selected case(s).</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-2">New Reason (optional)</label>
                                <input
                                    type="text"
                                    value={editReason}
                                    onChange={e => setEditReason(e.target.value)}
                                    placeholder="Leave empty to keep current"
                                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-stone-600 mb-2">New Duration (optional)</label>
                                <select
                                    value={editDuration}
                                    onChange={e => setEditDuration(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-amber-400"
                                >
                                    <option value="">Keep current</option>
                                    <option value="10 minutes">10 minutes</option>
                                    <option value="1 hour">1 hour</option>
                                    <option value="1 day">1 day</option>
                                    <option value="7 days">7 days</option>
                                    <option value="30 days">30 days</option>
                                    <option value="Permanent">Permanent</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleMassAction('case-edit')}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition"
                            >
                                {actionLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
