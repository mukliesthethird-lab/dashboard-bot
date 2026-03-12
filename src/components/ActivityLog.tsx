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
            <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-[8px] p-6 shadow-sm">
                <h2 className="text-sm font-black text-[#f2f3f5] mb-4 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">📊</span> Recent Activity
                </h2>
                <CatLoader message="Loading activity..." />
            </div>
        );
    }

    return (
        <div className="bg-[#2b2d31] border border-[#1e1f22] rounded-[8px] p-6 shadow-sm">
            <h2 className="text-sm font-black text-[#f2f3f5] mb-4 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">📊</span> Recent Activity
            </h2>

            {logs.length === 0 ? (
                <div className="text-center py-10 bg-[#1e1f22]/30 rounded-[8px] border border-dashed border-[#1e1f22]">
                    <div className="text-4xl mb-3 opacity-20">📭</div>
                    <p className="font-bold text-[#b5bac1]">No activity yet</p>
                    <p className="text-[11px] text-[#4e5058] uppercase tracking-wider mt-1">Actions will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => {
                        const icon = actionIcons[log.action] || actionIcons.default;
                        return (
                            <div key={log.id} className="flex items-center gap-4 p-3 rounded-[4px] bg-[#1e1f22]/30 border border-transparent hover:border-[#5865f2]/30 hover:bg-[#1e1f22]/60 transition-all group">
                                <div className="w-10 h-10 rounded-full bg-[#313338] border border-[#1e1f22] flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[#f2f3f5] truncate text-sm">{log.action}</div>
                                    <div className="text-[#b5bac1] text-xs truncate mt-0.5">
                                        by <span className="font-bold text-[#dbdee1]">{log.username}</span>
                                        {log.details && <span className="text-[#4e5058]"> • {log.details}</span>}
                                    </div>
                                </div>
                                <div className="text-[#4e5058] text-[10px] font-bold uppercase tracking-tighter flex-shrink-0">
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
