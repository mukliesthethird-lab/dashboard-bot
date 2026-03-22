"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CatLoader from "./CatLoader";

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
            case "pending": return <span className="bg-[#f0b232]/10 text-[#f0b232] px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase border border-[#f0b232]/20">Pending</span>;
            case "reviewed": return <span className="bg-[#5865F2]/10 text-[#5865F2] px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase border border-[#5865F2]/20">Reviewed</span>;
            case "resolved": return <span className="bg-[#248046]/10 text-[#248046] px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase border border-[#248046]/20">Resolved</span>;
            case "dismissed": return <span className="bg-white/10/40 text-gray-400 px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase border border-[#4e5058]/50">Dismissed</span>;
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
                            className="absolute -top-12 right-0 text-gray-400 hover:text-gray-200 transition"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={selectedImage}
                            alt="Proof"
                            className="max-w-full max-h-[85vh] rounded-[8px] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="mt-4 text-[#87898c] text-sm font-medium">Click outside to close</div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 mb-4">
                <Link
                    href={`/dashboard/${guildId}/moderation`}
                    className="p-2.5 rounded-[3px] glass-card text-gray-400 hover:bg-white/5 hover:text-gray-200 transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="flex items-center gap-2 text-[#87898c] font-bold text-lg">
                    <Link href={`/dashboard/${guildId}/moderation`} className="hover:text-gray-200 transition">
                        🛡️ Moderation
                    </Link>
                    <span>›</span>
                    <span className="text-gray-200">Reports</span>
                </div>
            </div>

            {/* Controls */}
            <div className="glass-card rounded-[8px] p-6 space-y-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search ID, User, or Reason..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="flex-1 px-4 py-3 bg-black/20 text-gray-200 placeholder-[#87898c] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#5865F2] transition"
                    />
                    <div className="flex gap-2 bg-black/20 p-1 rounded-[3px]">
                        {['all', 'pending', 'resolved', 'dismissed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-[3px] font-medium text-sm transition capitalize ${statusFilter === status
                                    ? 'bg-[#5865F2] text-white'
                                    : 'text-[#87898c] hover:text-gray-200 hover:glass-card'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="text-right text-[#87898c] text-xs font-bold uppercase tracking-wider">
                    {loading ? 'Syncing...' : `Showing ${reports.length} of ${total} reports`}
                </div>
            </div>

            {/* Redesigned Compact Table */}
            <div className="glass-card rounded-[8px] overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <CatLoader message="Loading reports..." />
                    ) : reports.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4 grayscale opacity-50">🏳️</div>
                            <h3 className="text-xl font-bold text-gray-100 mb-2">No reports found</h3>
                            <p className="text-gray-400">Everything seems quiet for now.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/20 border-b border-[#111214] text-[#87898c] text-[11px] uppercase tracking-wider font-bold">
                                    <th className="px-6 py-4 w-24 border-b border-[#111214]">Case ID</th>
                                    <th className="px-6 py-4 w-64 border-b border-[#111214]">Involved Users</th>
                                    <th className="px-6 py-4 border-b border-[#111214]">Reason</th>
                                    <th className="px-6 py-4 w-24 text-center border-b border-[#111214]">Proof</th>
                                    <th className="px-6 py-4 w-32 border-b border-[#111214]">Status</th>
                                    <th className="px-6 py-4 w-32 text-right border-b border-[#111214]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e1f22]">
                                {reports.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition group">
                                        {/* Case ID */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="font-bold text-gray-200 font-mono text-sm">#{String(item.case_number).padStart(4, '0')}</div>
                                            <div className="text-[10px] text-[#87898c] font-mono mt-1">{item.created_at.split(',')[0]}</div>
                                        </td>

                                        {/* Involved Users (In Report -> Out Reported) */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-3">
                                                {/* Reporter */}
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-6 h-6 rounded-full bg-black/20 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${getAvatarUrl(item.reporter.id, item.reporter.avatar || '0')})` }}></div>
                                                        <div className="absolute -bottom-1 -right-1 glass-card rounded-full p-[2px]">
                                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-medium text-gray-200">{item.reporter.username}</div>
                                                        <div className="text-[10px] text-[#87898c]">Reporter</div>
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <div className="pl-2.5 border-l border-white/10 h-2 -my-1 ml-1"></div>

                                                {/* Reported */}
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-6 h-6 rounded-full bg-black/20 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${getAvatarUrl(item.reportedUser.id, item.reportedUser.avatar || '0')})` }}></div>
                                                        <div className="absolute -bottom-1 -right-1 glass-card rounded-full p-[2px]">
                                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-medium text-gray-200">{item.reportedUser.username}</div>
                                                        <div className="text-[10px] text-[#87898c]">Reported</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Reason */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="p-3 rounded-[3px] bg-black/20 text-sm text-gray-200 leading-relaxed max-w-md">
                                                {item.reason}
                                            </div>
                                        </td>

                                        {/* Proof */}
                                        <td className="px-6 py-4 align-top text-center">
                                            {item.bukti_gambar ? (
                                                <button
                                                    onClick={() => setSelectedImage(item.bukti_gambar)}
                                                    className="w-10 h-10 rounded-[3px] bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all group/btn mx-auto"
                                                >
                                                    <span className="text-base group-hover/btn:scale-110 transition-transform">🖼️</span>
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 rounded-[3px] bg-white/5 flex items-center justify-center mx-auto opacity-50">
                                                    <span className="text-[#87898c] text-lg">✕</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-2 items-start">
                                                {getStatusBadge(item.status)}
                                                <span className="text-[10px] text-[#87898c] font-medium">{item.relative_time}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 align-top text-right">
                                            {(item.status === 'pending' || item.status === 'reviewed') && (
                                                <div className="flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-resolve')}
                                                        disabled={actionLoading === item.id}
                                                        className="w-24 py-1.5 bg-[#248046] hover:bg-[#1a6334] text-white text-[11px] font-medium rounded-[3px] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {actionLoading === item.id ? '...' : '✔ Resolve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(item.id, 'report-dismiss')}
                                                        disabled={actionLoading === item.id}
                                                        className="w-24 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium rounded-[3px] transition disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="text-center text-xs text-[#87898c] font-medium mt-4">
                © 2021-2025 Don Pollo • Terms • Privacy • Legal Notice
            </div>
        </div>
    );
}


