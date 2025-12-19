"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ModerationReportsProps {
    guildId: string;
}

interface Report {
    id: number;
    report_id?: string;
    case_number: number;
    reporter: {
        id: string;
        username: string;
        avatar?: string | null;
    };
    reportedUser: {
        id: string;
        username: string;
        avatar?: string | null;
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

    const getAvatarUrl = (userId: string, avatar: string | null | '0') => {
        if (!avatar || avatar === '0') {
            try {
                const index = Number((BigInt(userId) >> 22n) % 6n);
                return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
            } catch {
                return `https://cdn.discordapp.com/embed/avatars/0.png`;
            }
        }
        if (avatar.startsWith('http')) return avatar;
        return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
    };

    const getStatusBadge = (status: Report['status']) => {
        switch (status) {
            case "pending": return <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded text-[10px] font-bold uppercase border border-orange-500/20">Pending</span>;
            case "reviewed": return <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase border border-blue-500/20">Reviewed</span>;
            case "resolved": return <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase border border-emerald-500/20">Resolved</span>;
            case "dismissed": return <span className="bg-white/5 text-gray-500 px-2 py-1 rounded text-[10px] font-bold uppercase border border-white/10">Dismissed</span>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={selectedImage}
                            alt="Proof"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="mt-4 text-gray-400 text-sm font-medium">Click outside to close</div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 mb-4">
                <Link
                    href={`/dashboard/${guildId}/moderation`}
                    className="p-2.5 rounded-xl bg-[#16161f] border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="flex items-center gap-2 text-gray-400 font-bold text-lg">
                    <Link href={`/dashboard/${guildId}/moderation`} className="hover:text-white transition">
                        🛡️ Moderation
                    </Link>
                    <span>›</span>
                    <span className="text-white">Reports</span>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-[#16161f] rounded-3xl p-6 border border-white/10 space-y-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search ID, User, or Reason..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-white focus:outline-none focus:border-amber-500/50 transition"
                    />
                    <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                        {['all', 'pending', 'resolved', 'dismissed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition capitalize ${statusFilter === status
                                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-right text-gray-500 text-xs font-bold uppercase tracking-wider">
                    {loading ? 'Syncing...' : `Showing ${reports.length} of ${total} reports`}
                </div>
            </div>

            {/* Redesigned Compact Table */}
            <div className="bg-[#16161f] rounded-3xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4 grayscale opacity-50">🏳️</div>
                            <h3 className="text-xl font-bold text-white mb-2">No reports found</h3>
                            <p className="text-gray-500">Everything seems quiet for now.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider font-extrabold">
                                    <th className="px-6 py-4 w-24">Case ID</th>
                                    <th className="px-6 py-4 w-64">Involved Users</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4 w-24 text-center">Proof</th>
                                    <th className="px-6 py-4 w-32">Status</th>
                                    <th className="px-6 py-4 w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {reports.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition group">
                                        {/* Case ID */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-white font-mono text-sm">#{String(item.case_number).padStart(4, '0')}</div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-1">{item.created_at.split(',')[0]}</div>
                                        </td>

                                        {/* Involved Users (In Report -> Out Reported) */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-3">
                                                {/* Reporter */}
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-6 h-6 rounded-full bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${getAvatarUrl(item.reporter.id, item.reporter.avatar || '0')})` }}></div>
                                                        <div className="absolute -bottom-1 -right-1 bg-[#16161f] rounded-full p-[2px]">
                                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-gray-300">{item.reporter.username}</div>
                                                        <div className="text-[10px] text-gray-600">Reporter</div>
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <div className="pl-2.5 border-l border-white/10 h-2 -my-1 ml-1"></div>

                                                {/* Reported */}
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-6 h-6 rounded-full bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${getAvatarUrl(item.reportedUser.id, item.reportedUser.avatar || '0')})` }}></div>
                                                        <div className="absolute -bottom-1 -right-1 bg-[#16161f] rounded-full p-[2px]">
                                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-white">{item.reportedUser.username}</div>
                                                        <div className="text-[10px] text-red-400">Reported</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Reason */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="p-3 rounded-xl bg-black/20 border border-white/5 text-sm text-gray-300 leading-relaxed max-w-md">
                                                {item.reason}
                                            </div>
                                        </td>

                                        {/* Proof */}
                                        <td className="px-6 py-4 align-top text-center">
                                            {item.bukti_gambar ? (
                                                <button
                                                    onClick={() => setSelectedImage(item.bukti_gambar)}
                                                    className="w-10 h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:border-amber-500/50 flex items-center justify-center transition-all group/btn mx-auto"
                                                >
                                                    <span className="text-base group-hover/btn:scale-110 transition-transform">🖼️</span>
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto opacity-50">
                                                    <span className="text-gray-600 text-lg">✕</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                {getStatusBadge(item.status)}
                                                <span className="text-[10px] text-gray-500 font-medium">{item.relative_time}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 align-top text-right">
                                            {(item.status === 'pending' || item.status === 'reviewed') && (
                                                <div className="flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-resolve')}
                                                        disabled={actionLoading === item.id}
                                                        className="w-24 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 text-emerald-400 text-[11px] font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {actionLoading === item.id ? '...' : '✔ Resolve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-dismiss')}
                                                        disabled={actionLoading === item.id}
                                                        className="w-24 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-[11px] font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        ✖ Dismiss
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

            <div className="text-center text-xs text-gray-600 font-medium mt-4">
                © 2021-2025 Don Pollo • Terms • Privacy • Legal Notice
            </div>
        </div>
    );
}
