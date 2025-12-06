"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    return (
        <>
            <nav className="fixed top-0 w-full z-50 bg-amber-50/90 backdrop-blur-md border-b border-amber-200/50 shadow-sm h-20">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition">P</div>
                        <span className="text-2xl font-black text-amber-500 tracking-tighter group-hover:text-amber-600 transition">
                            DON POLLO
                        </span>
                    </Link>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/leaderboard"
                            className={`px-4 py-2 rounded-full font-bold transition ${pathname === '/leaderboard'
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-stone-600 hover:text-amber-600 hover:bg-amber-50'
                                }`}
                        >
                            🏆 Leaderboard
                        </Link>

                        {session ? (
                            <div className="flex items-center gap-3 pl-4 border-l border-amber-200">
                                {pathname !== '/dashboard' && (
                                    <Link
                                        href="/dashboard"
                                        className="px-5 py-2 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-500 transition shadow-sm"
                                    >
                                        Dashboard
                                    </Link>
                                )}
                                <img
                                    src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                    alt="User"
                                    className="w-9 h-9 rounded-full border-2 border-amber-300"
                                />
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    className="text-stone-500 hover:text-red-500 font-bold text-sm transition"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="px-6 py-2 rounded-full bg-amber-400 text-stone-900 font-bold hover:bg-amber-500 transition shadow-sm"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-amber-200 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🐔</div>
                            <h2 className="text-2xl font-black text-stone-800 mb-2">Welcome to Don Pollo!</h2>
                            <p className="text-stone-500 mb-6">Login with your Discord account to access the dashboard and manage your servers.</p>

                            <button
                                onClick={() => {
                                    setShowLoginModal(false);
                                    signIn("discord");
                                }}
                                className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Continue with Discord
                            </button>

                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="mt-4 text-stone-400 hover:text-stone-600 font-medium text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-4 border-red-100 animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-stone-800 mb-2">Logout?</h2>
                            <p className="text-stone-500 mb-6">Are you sure you want to logout from Don Pollo Dashboard?</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutModal(false);
                                        signOut();
                                    }}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition shadow-lg"
                                >
                                    Yes, Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
