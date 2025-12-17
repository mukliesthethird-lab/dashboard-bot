"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ModerationReportsProps {
    guildId: string;
}

interface Report {
    id: number;
    case_number: number;
    reporter: {
        id: string;
        username: string;
    };
    reportedUser: {
        id: string;
        username: string;
    };
    tanggal: string;
    reason: string;
    bukti_gambar: string | null;
    status: "pending" | "reviewed" | "resolved" | "dismissed";
    created_at: string;
    relative_time: string;
}

export default function ModerationReports({ guildId }: ModerationReportsProps) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const fetchReports = useCallback(async (search?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                action: 'reports',
                guild_id: guildId,
                status: statusFilter,
                search: search ?? searchTerm
            });

            const res = await fetch(`/api/moderation?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    }, [guildId, statusFilter, searchTerm]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            fetchReports(value);
        }, 500);
        setSearchTimeout(timeout);
    };

    const handleAction = async (reportId: number, action: 'report-resolve' | 'report-dismiss') => {
        setActionLoading(reportId);
        try {
            const res = await fetch('/api/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    guild_id: guildId,
                    report_ids: [reportId]
                })
            });

            if (res.ok) {
                fetchReports();
            }
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: Report['status']) => {
        switch (status) {
            case "pending": return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold uppercase">Pending</span>;
            case "reviewed": return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold uppercase">Reviewed</span>;
            case "resolved": return <span className="bg-green-100 text-green-600 px-2 py-1 rounded-lg text-xs font-bold uppercase">Resolved</span>;
            case "dismissed": return <span className="bg-stone-100 text-stone-500 px-2 py-1 rounded-lg text-xs font-bold uppercase">Dismissed</span>;
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
                    <span className="text-stone-800">Reports</span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-amber-100 shadow-md space-y-4 mb-4">
                <input
                    type="text"
                    placeholder="Report ID / User / Reason"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-5 py-3 bg-stone-50 border-2 border-amber-100 rounded-xl font-medium text-stone-700 focus:outline-none focus:border-amber-400 transition"
                />
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Status Filter */}
                    <div className="flex gap-2">
                        {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-sm transition capitalize ${statusFilter === status
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto text-stone-400 text-sm font-medium">
                        {loading ? 'Loading...' : `Found ${total} reports.`}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-amber-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🚩</div>
                            <h3 className="text-xl font-bold text-stone-700 mb-2">No reports found</h3>
                            <p className="text-stone-500">There are no user reports matching your criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-amber-50/50 border-b border-amber-100 text-stone-500 text-xs uppercase tracking-wider font-extrabold">
                                    <th className="px-6 py-4">Kasus</th>
                                    <th className="px-6 py-4">Pelapor</th>
                                    <th className="px-6 py-4">Dilaporkan</th>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Alasan</th>
                                    <th className="px-6 py-4">Bukti</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Dibuat</th>
                                    <th className="px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                                {reports.map((item) => (
                                    <tr key={item.id} className="hover:bg-amber-50/30 transition group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-stone-700 font-mono text-sm">#{String(item.case_number).padStart(4, '0')}</div>
                                            <div className="text-xs text-stone-400">ID: {item.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">
                                                    {item.reporter.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-stone-800 text-sm">{item.reporter.username}</div>
                                                    <div className="text-xs text-stone-400 font-mono">{item.reporter.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                                                    {item.reportedUser.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-stone-800 text-sm">{item.reportedUser.username}</div>
                                                    <div className="text-xs text-stone-400 font-mono">{item.reportedUser.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 font-medium text-sm">
                                            {item.tanggal || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 font-medium text-sm max-w-[200px] truncate" title={item.reason}>
                                            {item.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.bukti_gambar ? (
                                                <a
                                                    href={item.bukti_gambar}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-amber-600 hover:text-amber-700 text-xs font-bold underline"
                                                >
                                                    🖼️ Lihat
                                                </a>
                                            ) : (
                                                <span className="text-stone-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 text-sm font-medium">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-stone-700">{item.created_at}</div>
                                            <div className="text-xs text-stone-400">{item.relative_time}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(item.status === 'pending' || item.status === 'reviewed') && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-resolve')}
                                                        disabled={actionLoading === item.id}
                                                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                                                    >
                                                        {actionLoading === item.id ? '...' : 'Resolve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-dismiss')}
                                                        disabled={actionLoading === item.id}
                                                        className="px-3 py-1.5 bg-stone-400 hover:bg-stone-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}
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
        </div>
    );
}
