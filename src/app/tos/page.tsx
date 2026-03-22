import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Terms of Service for Don Pollo Discord Bot - Rules and guidelines for using our bot"
};

export default function TOSPage() {
    return (
        <main className="min-h-screen bg-[#030305] text-white pt-28 pb-16 px-4 md:px-8 relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-up">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-rose-400 to-amber-400">
                            Terms of Service
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 font-medium">
                        Last updated: December 17, 2024
                    </p>
                </div>

                {/* Quick Summary */}
                <div className="glass-card bg-purple-500/5 border-purple-500/20 rounded-3xl p-8 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-3">
                        <span className="text-3xl">📜</span> Core Precepts
                    </h2>
                    <ul className="text-gray-300 space-y-3 text-lg">
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400" /> Use the bot responsibly and follow Discord's rules</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400" /> Virtual currency has absolutely zero real-world value</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400" /> Do not exploit bugs, duplicate items, or abuse the service</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400" /> We reserve the right to terminate access for violations</li>
                    </ul>
                </div>

                {/* Content */}
                <div className="glass-card rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-white/5 space-y-12 animate-fade-up" style={{ animationDelay: '200ms' }}>

                    {/* Introduction */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Introduction</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            Welcome to Don Pollo! These Terms of Service ("Terms") govern your use of the Don Pollo Discord
                            Bot ("Bot", "Service", "we", "us", or "our"). By using the Bot, you agree to be bound by these
                            Terms. If you do not agree to these Terms, please do not use the Bot.
                        </p>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            These Terms constitute a legally binding agreement between you and Don Pollo. Please read
                            them carefully before using our Service.
                        </p>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Eligibility */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6"><span className="text-purple-400">1.</span> Eligibility</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            To use the Bot, you must:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-3 ml-4 marker:text-purple-400">
                            <li><strong className="text-gray-200">Age Requirement:</strong> Be at least 13 years old, or the minimum age required in your country</li>
                            <li><strong className="text-gray-200">Account Standing:</strong> Have a valid Discord account in good standing</li>
                            <li><strong className="text-gray-200">Compliance:</strong> Comply with Discord's Terms of Service and Community Guidelines</li>
                        </ul>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Description of Service */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6"><span className="text-rose-400">2.</span> Description of Service</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            Don Pollo is a Discord bot that provides entertainment and utility features for Discord servers:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">💰 Economy System</h4>
                                <p className="text-gray-400">Virtual currency, work commands, gambling, shops, and global trading.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">🎣 Fishing Game</h4>
                                <p className="text-gray-400">Catch fish, upgrade rods, collect artifacts, and dominate leaderboards.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">🛡️ Moderation</h4>
                                <p className="text-gray-400">Warnings, bans, kicks, mutes, tickets, and automated protection.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">⚙️ Server Core</h4>
                                <p className="text-gray-400">Welcome messages, persistent logging, and reaction roles architecture.</p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* User Responsibilities */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6"><span className="text-amber-400">3.</span> User Responsibilities</h2>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-3 ml-4 marker:text-amber-400">
                            <li>Follow Discord's Terms of Service and Community Guidelines at all times</li>
                            <li>Not use the Bot for any illegal, harmful, or malicious purposes</li>
                            <li>Not attempt to exploit, hack, or abuse the Bot's features</li>
                            <li>Not use automated scripts, macros, or tools to interact with the Bot</li>
                            <li>Not spam commands or intentionally overload the Bot's infrastructure</li>
                            <li>Not harass, threaten, or abuse other users through the Bot's mechanics</li>
                        </ul>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Prohibited Activities */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6"><span className="text-red-400">4.</span> Zero Tolerance Policy</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            The following activities are strictly prohibited and will result in immediate global blacklisting:
                        </p>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                            <ul className="text-red-200 space-y-3 text-lg">
                                <li className="flex gap-3"><span className="text-red-400 mt-1">❌</span> <span>Exploiting bugs, duping items, or glitching for unfair advantage.</span></li>
                                <li className="flex gap-3"><span className="text-red-400 mt-1">❌</span> <span>Using multiple accounts (alts) to bypass restrictions or farm rewards.</span></li>
                                <li className="flex gap-3"><span className="text-red-400 mt-1">❌</span> <span>Selling, buying, or trading virtual currency for real-world money.</span></li>
                                <li className="flex gap-3"><span className="text-red-400 mt-1">❌</span> <span>Attempting to reverse engineer, clone, or scrape the Bot's codebase.</span></li>
                            </ul>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Virtual Currency */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">5. Virtual Economy Mechanics</h2>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
                            <p className="text-amber-300 font-bold text-lg">
                                ⚠️ IMPORTANT: All virtual currency, items, and in-game assets are completely fictional. They hold NO real-world monetary value, cannot be redeemed for cash, and are not an investment.
                            </p>
                        </div>

                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-3 ml-4 marker:text-white/50">
                            <li>Virtual currency ("coins", "balance") is strictly for entertainment utility.</li>
                            <li>We reserve the right to modify, inflate, reset, or wipe balances at any time to preserve economic stability.</li>
                            <li>Lost or stolen virtual currency (e.g. from getting scammed by another user) will not be refunded.</li>
                            <li>Trading between users is at your own risk.</li>
                        </ul>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Termination & Liability */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">6. Termination & Liability</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            We reserve the right to terminate or suspend your access to the Bot at any time,
                            without prior notice, for any violation of these Terms.
                        </p>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            <strong className="text-white">Limitation of Liability:</strong> The Bot is provided "AS IS" and "AS AVAILABLE".
                            We disclaim all warranties. We are not liable for any indirect, incidental, or consequential damages resulting from downtime, data loss, or server incidents.
                        </p>
                    </section>

                </div>

                {/* Back Button */}
                <div className="mt-16 text-center animate-fade-up" style={{ animationDelay: '300ms' }}>
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-3 px-8 py-4 glass hover:bg-white/10 text-white font-bold rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/10"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Headquarters
                    </Link>
                </div>
            </div>
        </main>
    );
}
