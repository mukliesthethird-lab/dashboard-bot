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
    { name: "Overview", icon: "\u{1F4CA}", href: "" },
    { name: "Moderation", icon: "\u{1F6E1}\uFE0F", href: "/moderation" },
    { name: "Automod+", icon: "\u2696\uFE0F", href: "/automod" },
    { name: "Anti-Raid", icon: "\u{1F6A8}", href: "/antiraid" },
    { name: "Commands", icon: "\u{1F9E9}", href: "/commands" },
    { name: "Economy", icon: "\u{1F4B0}", href: "/economy" },
    { name: "Fishing", icon: "\u{1F3A3}", href: "/fishing" },
    { name: "Welcome", icon: "\u{1F44B}", href: "/welcome" },
    { name: "Logging", icon: "\u{1F4DD}", href: "/logging" },
    { name: "Roles", icon: "\u{1F3AD}", href: "/roles" },
    { name: "Leveling", icon: "\u{1F4C8}", href: "/leveling" },
    { name: "Notification", icon: "\u{1F514}", href: "/notifications" },
    { name: "Forms", icon: "\u{1F4CB}", href: "/forms" },
];

export default function GuildSidebar({ guildId, guildName, guildIcon }: SidebarProps) {
    const pathname = usePathname();
    const basePath = `/dashboard/${guildId}`;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const iconUrl = guildIcon
        ? `https://cdn.discordapp.com/icons/${guildId}/${guildIcon}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [mobileOpen]);

    if (!mounted) {
        return <div className="hidden lg:block w-[260px] bg-[var(--bg-secondary)] border-r border-[var(--border)]" />;
    }

    return (
        <div>
            {/* Mobile Header Bar */}
            <div className="lg:hidden fixed top-16 left-0 right-0 z-50 bg-[var(--bg-primary)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={iconUrl} alt={guildName} className="w-8 h-8 rounded-lg border border-[var(--border)]" />
                    <div className="min-w-0">
                        <h2 className="font-semibold text-white truncate max-w-[150px] text-sm">{guildName}</h2>
                        <span className="text-emerald-400 text-[11px] font-medium">● Online</span>
                    </div>
                </div>
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] transition">
                    {mobileOpen ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-40 pt-[96px]" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed z-[100] transition-all duration-300 ease-out
                top-16 bottom-0 left-0 w-[260px] bg-[var(--bg-primary)] border-r border-[var(--border)]
                lg:top-3 lg:bottom-3 lg:left-3 lg:w-[260px] lg:rounded-xl lg:bg-[var(--bg-secondary)] lg:border lg:border-[var(--border)] lg:shadow-lg
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                overflow-hidden flex flex-col
            `}>
                {/* Server Info */}
                <div className="p-4 border-b border-[var(--border)] hidden lg:block">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={iconUrl} alt={guildName} className="w-10 h-10 rounded-lg border border-[var(--border)]" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--bg-elevated)]merald-500 rounded-full border-2 border-[var(--bg-secondary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-sm text-white truncate">{guildName}</h2>
                            <span className="text-emerald-400 text-[11px] font-medium">● Online</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="p-2 flex-1 overflow-y-auto custom-scrollbar pb-16">
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
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 mb-0.5 ${isActive
                                    ? "bg-[var(--accent-muted)] text-[var(--accent)] border-l-2 border-[var(--accent)]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white"
                                    }`}
                            >
                                <span className="text-base w-5 text-center">{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] text-sm font-medium transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Servers</span>
                    </Link>
                </div>
            </aside>
        </div>
    );
}
