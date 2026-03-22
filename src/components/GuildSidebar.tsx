"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

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
    { name: "Notification", icon: "🔔", href: "/notifications" },
    { name: "Forms", icon: "📋", href: "/forms" },
];

export default function GuildSidebar({ guildId, guildName, guildIcon }: SidebarProps) {
    const pathname = usePathname();
    const basePath = `/dashboard/${guildId}`;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const iconUrl = guildIcon
        ? `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [mobileOpen]);

    if (!mounted) {
        return <div className="hidden lg:block w-72 bg-[#05050a]/50 border-r border-white/5" />;
    }

    return (
        <div>
            {/* Mobile Header Bar */}
            <div className="lg:hidden fixed top-20 left-0 right-0 z-50 bg-[#05050a]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={iconUrl}
                        alt={guildName}
                        className="w-10 h-10 rounded-xl border-2 border-white/20"
                    />
                    <div className="min-w-0">
                        <h2 className="font-bold text-white truncate max-w-[150px] text-sm">{guildName}</h2>
                        <span className="text-emerald-400 text-xs font-bold">● Online</span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                    {mobileOpen ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40 pt-[104px]"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar - Desktop: always visible, Mobile: slide in */}
            <aside className={`
                fixed z-[100] transition-all duration-500 ease-in-out
                top-20 bottom-0 left-0 w-72 bg-[#05050a]/95 backdrop-blur-xl border-r border-white/5
                lg:top-4 lg:bottom-4 lg:left-4 lg:w-[280px] lg:rounded-[2rem] lg:bg-[#05050a]/70 lg:backdrop-blur-3xl lg:border lg:border-white/10 lg:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                overflow-hidden flex flex-col
            `}>
                {/* Server Info - Hidden on mobile (shown in header bar instead) */}
                <div className="p-6 border-b border-white/10 hidden lg:block">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img
                                src={iconUrl}
                                alt={guildName}
                                className="w-14 h-14 rounded-2xl border-2 border-white/10 shadow-lg group-hover:border-indigo-500/50 transition-colors duration-500"
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#05050a] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-black text-lg text-white truncate">{guildName}</h2>
                            <span className="text-emerald-400 text-xs font-bold">
                                ● Online
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="p-4 space-y-1 pt-4 lg:pt-4 flex-1 overflow-y-auto custom-scrollbar pb-24">
                    {menuItems.map((item) => {
                        const fullPath = basePath + item.href;
                        const isActive = item.href === ""
                            ? pathname === fullPath
                            : pathname.startsWith(fullPath);

                        return (
                            <Link
                                key={item.name}
                                href={fullPath}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${isActive
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-white/50" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-[#05050a]/80 backdrop-blur-sm">
                    <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold transition"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Servers</span>
                    </Link>
                </div>
            </aside>
        </div>
    );
}


