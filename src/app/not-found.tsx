"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg-primary)]">
            <div className="text-center max-w-md">
                <div className="relative mb-8">
                    <div className="text-[120px] md:text-[160px] font-extrabold text-white/5 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-7xl">🐔</div>
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Page Not Found
                </h1>
                <p className="text-[var(--text-secondary)] text-sm mb-8 leading-relaxed">
                    Looks like Don Pollo got lost! The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition flex items-center justify-center gap-2">
                        🏠 Go Home
                    </Link>
                    <Link href="/dashboard" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--bg-secondary)] text-white font-semibold text-sm border border-[var(--border)] hover:border-[var(--border-hover)] transition flex items-center justify-center gap-2">
                        📊 Dashboard
                    </Link>
                </div>

                <p className="mt-10 text-[var(--text-muted)] text-xs">
                    Error Code: 🐔 PAGE_FLEW_AWAY
                </p>
            </div>
        </div>
    );
}
