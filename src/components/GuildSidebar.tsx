"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    guildId: string;
    guildName: string;
    guildIcon: string | null;
}

const menuItems = [
    { name: "Overview", icon: "📊", href: "" },
    { name: "Moderation", icon: "🛡️", href: "/moderation" },
    { name: "Economy", icon: "💰", href: "/economy" },
    { name: "Fishing", icon: "🎣", href: "/fishing" },

    { name: "Welcome", icon: "👋", href: "/welcome" },
    { name: "Logging", icon: "📝", href: "/logging" },
    { name: "Roles", icon: "🎭", href: "/roles" },
];

export default function GuildSidebar({ guildId, guildName, guildIcon }: SidebarProps) {
    const pathname = usePathname();
    const basePath = `/dashboard/${guildId}`;
    const iconUrl = guildIcon
        ? `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    return (
        <aside className="fixed left-0 top-20 bottom-0 w-72 bg-white/95 backdrop-blur-md border-r-2 border-amber-100 shadow-xl z-40 overflow-y-auto">
            {/* Server Info */}
            <div className="p-6 border-b-2 border-amber-100 bg-gradient-to-r from-amber-50 to-white">
                <div className="flex items-center gap-4">
                    <img
                        src={iconUrl}
                        alt={guildName}
                        className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-lg text-stone-800 truncate">{guildName}</h2>
                        <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full text-xs font-bold">
                            ● Online
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="p-4 space-y-1">
                {menuItems.map((item) => {
                    const fullPath = basePath + item.href;
                    const isActive = item.href === ""
                        ? pathname === fullPath
                        : pathname.startsWith(fullPath);

                    return (
                        <Link
                            key={item.name}
                            href={fullPath}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${isActive
                                ? "bg-amber-400 text-stone-900 shadow-md"
                                : "text-stone-600 hover:bg-amber-50 hover:text-amber-700"
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.name}</span>
                            {isActive && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-stone-800 animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-amber-100 bg-white/90">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-stone-500 hover:text-amber-600 hover:bg-amber-50 font-bold transition"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Servers</span>
                </Link>
            </div>
        </aside>
    );
}
