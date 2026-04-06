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
    "Moderation settings updated": "🛡️",
    "Welcome settings updated": "👋",
    "Leveling settings updated": "🆙",
    "Roles settings updated": "🎭",
    "Reaction roles updated": "✨",
    "Reaction role message deleted": "🗑️",
    "Form updated": "📋",
    "Form deleted": "❌",
    "Form enabled": "✅",
    "Form disabled": "🚫",
    "Economy: Money Given": "💰",
    "Economy: User Reset": "🧹",
    "Fishing: Rod Given": "🎣",
    "Fishing: Material Given": "🔩",
    "Fishing: Buff Given": "🚬",
    "Fishing: User Reset": "🌊",
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
            <div className="glass-card rounded-[2rem] p-8 shadow-2xl border-white/5">
                <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                    <span className="text-2xl">⚡</span> Recent Activity
                </h2>
                <CatLoader message="Loading activity..." />
            </div>
        );
    }

    return (
        <div className="glass-card rounded-[2rem] p-8 shadow-2xl border-white/5 animate-fade-up">
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                <span className="text-2xl">⚡</span> Recent Activity
            </h2>

            {logs.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <div className="text-5xl mb-4 opacity-30">📭</div>
                    <p className="font-bold text-white text-lg">No activity yet</p>
                    <p className="text-gray-400 mt-2">Actions will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => {
                        const icon = actionIcons[log.action] || actionIcons.default;
                        return (
                            <div key={log.id} className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-lg truncate group-hover:text-indigo-400 transition-colors">{log.action}</div>
                                    <div className="text-gray-400 text-sm truncate mt-1">
                                        by <span className="font-bold text-gray-200">{log.username}</span>
                                        {log.details && <span className="text-gray-500"> • {log.details}</span>}
                                    </div>
                                </div>
                                <div className="text-indigo-400/80 text-xs font-bold uppercase tracking-wider flex-shrink-0 bg-indigo-500/5 px-3 py-1.5 rounded-lg border border-indigo-500/10">
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


