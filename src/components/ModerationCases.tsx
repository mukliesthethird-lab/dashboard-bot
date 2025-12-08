"use client";

import { useState } from "react";
import Link from "next/link";

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
    created_at: string;
    relative_time: string;
}

const MOCK_CASES: Case[] = [
    {
        id: "fgvQR3U",
        type: "warn",
        user: { id: "1396452979949588", username: "Padoru", avatar: "0" },
        reason: "/",
        author: { id: "364361813845868544", username: "ataap", avatar: "0" },
        duration: "Permanent",
        created_at: "10/29/2025",
        relative_time: "a month ago"
    },
    {
        id: "SuxcPMc",
        type: "warn",
        user: { id: "411916947773587456", username: "UserTwo", avatar: "1" },
        reason: "berisik",
        author: { id: "719511161757761656", username: "Odokawwa", avatar: "2" },
        duration: "Permanent",
        created_at: "7/19/2025",
        relative_time: "5 months ago"
    },
    {
        id: "WnqnVJ8",
        type: "mute",
        user: { id: "1257064052203458712", username: "TrollUser", avatar: "3" },
        reason: "bad words",
        author: { id: "719511161757761656", username: "Odokawwa", avatar: "2" },
        duration: "Permanent",
        created_at: "7/18/2025",
        relative_time: "5 months ago"
    },
    {
        id: "oGECqKs",
        type: "ban",
        user: { id: "283596309863202817", username: "RacistGuy", avatar: "4" },
        reason: "Racism are intolerated in this server",
        author: { id: "364361813845868544", username: "ataap", avatar: "0" },
        duration: "Permanent",
        created_at: "4/22/2025",
        relative_time: "8 months ago"
    },
    {
        id: "tsJwuBr",
        type: "kick",
        user: { id: "1319576610638135359", username: "Spammer", avatar: "5" },
        reason: "ganti bot",
        author: { id: "383954742566584340", username: "Admin", avatar: "6" },
        duration: "Permanent",
        created_at: "12/22/2024",
        relative_time: "a year ago"
    },
    {
        id: "2BfnjSS",
        type: "warn",
        user: { id: "159985870458322944", username: "antikritik", avatar: "1" },
        reason: "antikritik",
        author: { id: "719511161757761656", username: "Odokawwa", avatar: "2" },
        duration: "Permanent",
        created_at: "2/14/2024",
        relative_time: "2 years ago"
    },
    {
        id: "14v9se5",
        type: "warn",
        user: { id: "1132089310645059584", username: "UserNew", avatar: "3" },
        reason: "/",
        author: { id: "663049629209985036", username: "ModOne", avatar: "4" },
        duration: "Permanent",
        created_at: "12/9/2023",
        relative_time: "2 years ago"
    }
];

export default function ModerationCases({ guildId }: ModerationCasesProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isMassEdit, setIsMassEdit] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    const getIcon = (type: Case['type']) => {
        switch (type) {
            case "ban": return <span className="text-red-500 text-lg">🔨</span>; // Hammer
            case "kick": return <span className="text-orange-500 text-lg">🥾</span>; // Boot
            case "mute": return <span className="text-blue-500 text-lg">🔇</span>; // Mute
            case "warn": return <span className="text-yellow-500 text-lg">⚠️</span>; // Warning
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
        if (selectedIds.size === MOCK_CASES.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(MOCK_CASES.map(c => c.id)));
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
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                        Found {MOCK_CASES.length} cases in 0.028 seconds.
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

                            <div className="w-px h-5 bg-stone-300 hidden md:block"></div>

                            {/* Mass settings */}
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-blue-500 focus:ring-blue-500 rounded-md"
                                        checked={filters.showMass}
                                        onChange={(e) => setFilters({ ...filters, showMass: e.target.checked })}
                                    />
                                    <span className="text-stone-700 font-bold text-sm">Show mass cases</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-stone-300 text-stone-500 focus:ring-stone-500 rounded-md bg-stone-100"
                                        checked={filters.onlyMass}
                                        onChange={(e) => setFilters({ ...filters, onlyMass: e.target.checked })}
                                    />
                                    <span className="text-stone-500 font-bold text-sm">Show only mass cases</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-stone-500 font-bold text-sm">Created:</span>
                            <div className="relative">
                                <select
                                    value={filters.timeRange}
                                    onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                                    className="appearance-none bg-stone-100 border border-stone-200 text-stone-700 text-sm font-bold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
                                >
                                    <option>All time</option>
                                    <option>Last 24 hours</option>
                                    <option>Last 7 days</option>
                                    <option>Last 30 days</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-stone-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
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

                            <button className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => { setIsMassEdit(false); setSelectedIds(new Set()); }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap"
                            >
                                ✅ Close
                            </button>
                            <button className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border-2 border-amber-100 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-amber-50/50 border-b border-amber-100 text-stone-500 text-xs uppercase tracking-wider font-extrabold">
                                {isMassEdit && (
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                                            checked={selectedIds.size === MOCK_CASES.length && MOCK_CASES.length > 0}
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
                            {MOCK_CASES.map((item) => (
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
                                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(item.type)}`}></div>
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
                </div>
            </div>

            <div className="text-center text-xs text-stone-400 font-medium mt-4">
                © 2021-2025 Don Pollo • Terms • Privacy • Legal Notice
            </div>
        </div>
    );
}
