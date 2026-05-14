"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ProfileSettings from "./ProfileSettings";

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isGuildDashboard = pathname?.startsWith("/dashboard/") && pathname !== "/dashboard";

    return (
        <>
            <nav className={`fixed z-[110] transition-all duration-300 ${isGuildDashboard
                ? (scrolled ? 'top-0 left-0 right-0 lg:top-4 lg:left-[304px] lg:right-6 flex justify-center' : 'top-0 left-0 right-0 lg:left-[288px] flex justify-center')
                : (scrolled ? 'top-0 left-0 right-0 md:top-4 md:left-4 md:right-4 lg:left-8 lg:right-8 flex justify-center' : 'top-0 left-0 right-0 flex justify-center')
                }`}>
                <div className={`w-full ${isGuildDashboard ? 'max-w-none' : 'max-w-6xl'} h-16 px-4 md:px-6 flex items-center justify-between transition-all duration-300 ${scrolled
                    ? 'bg-[var(--bg-primary)]/90 backdrop-blur-xl shadow-md border-b md:border border-[var(--border)] md:rounded-2xl'
                    : 'bg-transparent border-transparent'
                    }`}>
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
                        <div className="relative">
                            <img
                                src="/donpollo-icon.jpg"
                                alt="Don Pollo"
                                className="w-8 h-8 rounded-[8px] group-hover:scale-105 transition-all"
                            />
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight">
                            DON POLLO
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link
                            href="/leaderboard"
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${pathname === '/leaderboard'
                                ? 'bg-[var(--bg-hover)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Leaderboard
                        </Link>

                        <Link
                            href="/commands"
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${pathname === '/commands'
                                ? 'bg-[var(--bg-hover)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Commands
                        </Link>

                        <Link
                            href="/status"
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${pathname === '/status'
                                ? 'bg-[var(--bg-hover)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Status
                        </Link>

                        <Link
                            href="/market"
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1 ${pathname === '/market'
                                ? 'bg-[var(--bg-hover)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Market
                        </Link>

                        <Link
                            href={pathname?.includes('/dashboard/') ? `${pathname.split('/').slice(0, 3).join('/')}/casino` : '/casino'}
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1 ${pathname?.includes('/casino')
                                ? 'bg-[var(--bg-hover)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Casino
                        </Link>

                        <Link
                            href="/donate"
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${pathname === '/donate'
                                ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                                }`}
                        >
                            Donate
                        </Link>

                        {session ? (
                            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[var(--border)]">
                                {pathname !== '/dashboard' && (
                                    <Link
                                        href="/dashboard"
                                        className="px-4 py-1.5 rounded text-sm bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors"
                                    >
                                        Dashboard
                                    </Link>
                                )}
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowProfileModal(true)} className="hover:opacity-80 transition-opacity">
                                        <img
                                            src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                            alt="User"
                                            className={`w-8 h-8 rounded-full border border-[var(--border)] transition-all`}
                                        />
                                    </button>
                                    <button
                                        onClick={() => setShowLogoutModal(true)}
                                        className="text-[var(--text-secondary)] hover:text-[#da373c] font-semibold text-sm transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                className="ml-2 px-4 py-1.5 rounded text-sm bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors"
                            >
                                Login
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-xl hover:bg-[var(--bg-hover)] transition"
                    >
                        {mobileMenuOpen ? (
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

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-[#05050a]/95 backdrop-blur-xl border-t border-[var(--border)] animate-slide-down">
                        <div className="px-4 py-4 space-y-3">
                            <Link
                                href="/leaderboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/leaderboard'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                🏆 Leaderboard
                            </Link>

                            <Link
                                href="/commands"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/commands'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                📜 Commands Wiki
                            </Link>

                            <Link
                                href="/encyclopedia"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/encyclopedia'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                🎣 Fishing Encyclopedia
                            </Link>

                            <Link
                                href="/status"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/status'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                ⚡ System Status
                            </Link>

                            <Link
                                href="/market"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/market'
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                📈 Live Market
                            </Link>

                            <Link
                                href={pathname?.includes('/dashboard/') ? `${pathname.split('/').slice(0, 3).join('/')}/casino` : '/casino'}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname?.includes('/casino')
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                🎰 Casino Games
                            </Link>

                            <Link
                                href="/donate"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl font-bold transition ${pathname === '/donate'
                                    ? 'bg-[var(--bg-secondary)]mber-500/20 text-amber-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                                    }`}
                            >
                                ☕ Donate to Creator
                            </Link>

                            {session ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block px-4 py-3 rounded-xl bg-[#5865F2] text-white font-bold text-center"
                                    >
                                        Dashboard
                                    </Link>
                                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-tertiary)] rounded-xl">
                                        <button onClick={() => { setMobileMenuOpen(false); setShowProfileModal(true); }} className="flex items-center gap-3 text-left">
                                            <img
                                                src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                                alt="User"
                                                className="w-8 h-8 rounded-full border border-[var(--border)] transition-all"
                                            />
                                            <span className="font-semibold text-white">{session.user?.name}</span>
                                        </button>
                                        <button
                                            onClick={() => { setMobileMenuOpen(false); setShowLogoutModal(true); }}
                                            className="text-[#da373c] font-semibold text-sm"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); setShowLoginModal(true); }}
                                    className="w-full px-4 py-3 rounded-xl bg-[#5865F2] text-white font-bold"
                                >
                                    Login with Discord
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                <span className="text-5xl">🐔</span>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Welcome to Don Pollo!</h2>
                            <p className="text-[var(--text-secondary)] mb-6">Login with your Discord account to access the dashboard and manage your servers.</p>

                            <button
                                onClick={() => {
                                    setShowLoginModal(false);
                                    signIn("discord");
                                }}
                                className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition flex items-center justify-center gap-3 shadow-lg hover:shadow-[#5865F2]/25"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                </svg>
                                Continue with Discord
                            </button>

                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="mt-4 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] font-medium text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Logout?</h2>
                            <p className="text-[var(--text-secondary)] mb-6">Are you sure you want to logout from Don Pollo Dashboard?</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 py-3 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] text-white font-bold rounded-xl transition border border-[var(--border)]"
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

            {/* Profile Settings Modal */}
            <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
        </>
    );
}

