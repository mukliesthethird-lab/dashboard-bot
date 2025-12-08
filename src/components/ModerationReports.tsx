"use client";

import { useState } from "react";
import Link from "next/link";

interface ModerationReportsProps {
    guildId: string;
}

interface Report {
    id: string;
    reporter: {
        id: string;
        username: string;
        avatar: string;
    };
    reportedUser: {
        id: string;
        username: string;
        avatar: string;
    };
    reason: string;
    status: "pending" | "resolved" | "dismissed";
    created_at: string;
    relative_time: string;
}

const MOCK_REPORTS: Report[] = [
    {
        id: "rpt_1",
        reporter: { id: "123456789", username: "GoodCitizen", avatar: "1" },
        reportedUser: { id: "987654321", username: "BadActor", avatar: "5" },
        reason: "Spamming in general chat",
        status: "pending",
        created_at: "10/30/2025",
        relative_time: "2 hours ago"
    },
    {
        id: "rpt_2",
        reporter: { id: "111222333", username: "ModHelper", avatar: "2" },
        reportedUser: { id: "444555666", username: "Troll123", avatar: "3" },
        reason: "Inappropriate profile picture",
        status: "resolved",
        created_at: "10/29/2025",
        relative_time: "1 day ago"
    },
    {
        id: "rpt_3",
        reporter: { id: "777888999", username: "Newbie", avatar: "0" },
        reportedUser: { id: "555666777", username: "Scammer", avatar: "4" },
        reason: "DM advertising",
        status: "dismissed",
        created_at: "10/28/2025",
        relative_time: "2 days ago"
    }
];

export default function ModerationReports({ guildId }: ModerationReportsProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const getStatusBadge = (status: Report['status']) => {
        switch (status) {
            case "pending": return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-lg text-xs font-bold uppercase">Pending</span>;
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-3 bg-stone-50 border-2 border-amber-100 rounded-xl font-medium text-stone-700 focus:outline-none focus:border-amber-400 transition"
                />
                <div className="flex flex-wrap gap-3">
                    <div className="ml-auto text-stone-400 text-sm font-medium self-center">
                        Found {MOCK_REPORTS.length} reports.
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-amber-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-amber-50/50 border-b border-amber-100 text-stone-500 text-xs uppercase tracking-wider font-extrabold">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Reporter</th>
                                <th className="px-6 py-4">Reported User</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                            {MOCK_REPORTS.map((item) => (
                                <tr key={item.id} className="hover:bg-amber-50/30 transition group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-bold text-stone-700 font-mono text-sm">#{item.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-stone-200 bg-cover" style={{ backgroundImage: `url(https://cdn.discordapp.com/embed/avatars/${item.reporter.avatar}.png)` }}></div>
                                            <div>
                                                <div className="font-bold text-stone-800 text-sm">{item.reporter.username}</div>
                                                <div className="text-xs text-stone-400 font-mono">{item.reporter.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-stone-200 bg-cover" style={{ backgroundImage: `url(https://cdn.discordapp.com/embed/avatars/${item.reportedUser.avatar}.png)` }}></div>
                                            <div>
                                                <div className="font-bold text-stone-800 text-sm">{item.reportedUser.username}</div>
                                                <div className="text-xs text-stone-400 font-mono">{item.reportedUser.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-stone-600 font-medium text-sm max-w-[200px] truncate">
                                        {item.reason}
                                    </td>
                                    <td className="px-6 py-4 text-stone-600 text-sm font-medium">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-stone-700">{item.created_at}</div>
                                        <div className="text-xs text-stone-400">{item.relative_time}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-center text-xs text-stone-400 font-medium mt-4">
                © 2021-2025 Don Pollo • Terms • Privacy • Legal Notice
            </div>
        </div>
    );
}
