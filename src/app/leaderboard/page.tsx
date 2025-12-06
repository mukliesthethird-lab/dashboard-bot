"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
    user_id: string;
    username: string;
    avatar: string | null;
    total: number;
}

export default function Leaderboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/leaderboard")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setUsers(data);
                } else {
                    setError(data.error || "Failed to fetch data");
                }
                setLoading(false);
            })
            .catch(() => {
                setError("Network Error");
                setLoading(false);
            });
    }, []);

    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl md:text-6xl font-black text-stone-800 mb-3">
                        🏆 Leaderboard
                    </h1>
                    <p className="text-lg text-amber-700 font-bold">
                        Top 10 Richest Players
                    </p>
                </div>

                {/* Leaderboard List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20 bg-white/80 rounded-2xl backdrop-blur-sm">
                            <div className="text-6xl animate-bounce">⏳</div>
                            <p className="text-stone-500 font-bold mt-4 text-xl">Loading...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 rounded-2xl border-2 border-red-200">
                            <div className="text-4xl">❌</div>
                            <p className="text-red-500 font-bold mt-4">{error}</p>
                        </div>
                    ) : (
                        users.map((user, index) => {
                            // RANK 1 - GOLD CHAMPION 👑
                            if (index === 0) {
                                return (
                                    <div
                                        key={user.user_id}
                                        className="relative p-6 rounded-3xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 border-4 border-yellow-500 shadow-2xl transform hover:scale-[1.02] transition-all duration-300 animate-pulse-slow"
                                        style={{
                                            boxShadow: "0 0 40px rgba(251, 191, 36, 0.6), 0 0 80px rgba(251, 191, 36, 0.3)"
                                        }}
                                    >
                                        {/* Sparkles */}
                                        <div className="absolute -top-3 -left-3 text-3xl animate-bounce">✨</div>
                                        <div className="absolute -top-3 -right-3 text-3xl animate-bounce" style={{ animationDelay: "0.2s" }}>✨</div>
                                        <div className="absolute -bottom-3 left-1/2 text-2xl animate-bounce" style={{ animationDelay: "0.4s" }}>⭐</div>

                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 flex items-center justify-center text-5xl bg-white rounded-2xl shadow-lg border-4 border-yellow-500 animate-pulse">
                                                👑
                                            </div>
                                            <div className="relative flex-shrink-0">
                                                <img
                                                    src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                    alt={user.username}
                                                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl ring-4 ring-yellow-400"
                                                />
                                                <span className="absolute -top-3 -right-1 text-3xl animate-bounce">👑</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-2xl md:text-3xl font-black text-stone-900 truncate">
                                                    {user.username}
                                                </div>
                                                <div className="text-yellow-800 font-bold text-lg">🏆 CHAMPION</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl md:text-4xl font-black text-stone-900">
                                                    ${user.total.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // RANK 2 - SILVER 🥈
                            if (index === 1) {
                                return (
                                    <div
                                        key={user.user_id}
                                        className="relative p-5 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border-4 border-slate-400 shadow-xl transform hover:scale-[1.01] transition-all duration-300"
                                        style={{
                                            boxShadow: "0 0 25px rgba(148, 163, 184, 0.5)"
                                        }}
                                    >
                                        <div className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 flex items-center justify-center text-4xl bg-white rounded-xl shadow-md border-2 border-slate-400">
                                                🥈
                                            </div>
                                            <div className="relative">
                                                <img
                                                    src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                    alt={user.username}
                                                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-slate-300"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xl md:text-2xl font-black text-stone-800 truncate">
                                                    {user.username}
                                                </div>
                                                <div className="text-slate-500 font-bold text-sm">2ND PLACE</div>
                                            </div>
                                            <div className="text-2xl md:text-3xl font-black text-slate-700">
                                                ${user.total.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // RANK 3 - BRONZE 🥉
                            if (index === 2) {
                                return (
                                    <div
                                        key={user.user_id}
                                        className="relative p-5 rounded-2xl bg-gradient-to-r from-orange-200 via-orange-100 to-orange-200 border-4 border-orange-400 shadow-xl transform hover:scale-[1.01] transition-all duration-300"
                                        style={{
                                            boxShadow: "0 0 25px rgba(251, 146, 60, 0.4)"
                                        }}
                                    >
                                        <div className="absolute -top-2 -left-2 text-xl animate-pulse">🔥</div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 flex items-center justify-center text-4xl bg-white rounded-xl shadow-md border-2 border-orange-400">
                                                🥉
                                            </div>
                                            <div className="relative">
                                                <img
                                                    src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                    alt={user.username}
                                                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-orange-300"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xl md:text-2xl font-black text-stone-800 truncate">
                                                    {user.username}
                                                </div>
                                                <div className="text-orange-600 font-bold text-sm">3RD PLACE</div>
                                            </div>
                                            <div className="text-2xl md:text-3xl font-black text-orange-700">
                                                ${user.total.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // RANK 4-10 - Normal
                            return (
                                <div
                                    key={user.user_id}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/90 border-2 border-amber-100 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200 hover:shadow-md"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center text-xl font-black text-stone-500 bg-amber-50 rounded-lg border border-amber-200">
                                        #{index + 1}
                                    </div>
                                    <img
                                        src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                        alt={user.username}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                    <span className="flex-1 font-bold text-lg text-stone-800 truncate">
                                        {user.username}
                                    </span>
                                    <span className="text-xl font-black text-amber-600">
                                        ${user.total.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Back Button */}
                <div className="mt-10 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-amber-50 text-amber-600 font-bold rounded-full shadow-md hover:shadow-lg transition border-2 border-amber-200 hover:border-amber-400"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>

            {/* Custom Animation Styles */}
            <style jsx>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.9; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s ease-in-out infinite;
                }
            `}</style>
        </main>
    );
}
