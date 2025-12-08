"use client";

import { useEffect, useState } from "react";
import CatLoader from "./CatLoader";

interface LogEntry {
    id: number;
    user_id: string;
    username: string;
    action: string;
    details: string | null;
    created_at: string;
}

interface ActivityLogProps {
    guildId: string;
}

const actionIcons: Record<string, string> = {
    "Dashboard accessed": "👁️",
    "Settings updated": "⚙️",
    "Moderation enabled": "🛡️",
    "Welcome configured": "👋",
    "Logging enabled": "📝",
    "Auto roles setup": "🎭",
    default: "📌"
};

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function ActivityLog({ guildId }: ActivityLogProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/logs?guild_id=${guildId}&limit=5`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLogs(data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [guildId]);

    if (loading) {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-amber-100 shadow-md">
                <h2 className="text-xl font-black text-stone-800 mb-4">📊 Recent Activity</h2>
                <CatLoader message="Loading activity..." />
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 border-2 border-amber-100 shadow-md">
            <h2 className="text-xl font-black text-stone-800 mb-4">📊 Recent Activity</h2>

            {logs.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="font-bold">No activity yet</p>
                    <p className="text-sm">Actions will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => {
                        const icon = actionIcons[log.action] || actionIcons.default;
                        return (
                            <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-stone-50 border border-stone-100 hover:bg-amber-50 transition">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-stone-800 truncate">{log.action}</div>
                                    <div className="text-stone-500 text-sm truncate">
                                        by <span className="font-medium">{log.username}</span>
                                        {log.details && ` • ${log.details}`}
                                    </div>
                                </div>
                                <div className="text-stone-400 text-sm flex-shrink-0">
                                    {getTimeAgo(log.created_at)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
