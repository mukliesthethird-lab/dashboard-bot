"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="text-center max-w-md">
                {/* Animated 404 */}
                <div className="relative mb-8">
                    <div className="text-[150px] md:text-[200px] font-black text-amber-200 leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-8xl animate-bounce">
                            🐔
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-4">
                    Oops! Page Not Found
                </h1>

                <p className="text-stone-500 text-lg mb-8 leading-relaxed">
                    Looks like Don Pollo got lost! The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <span>🏠</span>
                        <span>Go Home</span>
                    </Link>
                    <Link
                        href="/dashboard"
                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-stone-700 font-bold border-2 border-stone-200 hover:border-amber-400 transition shadow-md flex items-center justify-center gap-2"
                    >
                        <span>📊</span>
                        <span>Dashboard</span>
                    </Link>
                </div>

                {/* Fun message */}
                <p className="mt-12 text-stone-400 text-sm">
                    Error Code: 🐔 PAGE_FLEW_AWAY
                </p>
            </div>
        </div>
    );
}
