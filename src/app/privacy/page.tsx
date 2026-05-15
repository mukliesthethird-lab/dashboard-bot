import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Learn how Don Pollo protects your data while providing a premium, paywall-free experience."
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pt-32 pb-24 px-6 md:px-12 relative overflow-x-hidden font-sans selection:bg-[var(--accent)]/30">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03]" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-24 animate-fade-up">

                    <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[1] tracking-tighter">
                        Privacy <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-primary)]/40">
                            Protocol.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-xl mx-auto">
                        How we process, protect, and handle your data in the era of high-performance community management.
                    </p>
                    <div className="mt-8 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">
                        Revision Date: May 15, 2026
                    </div>
                </div>

                {/* Quick Summary Card */}
                <div className="group bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-[40px] p-10 md:p-14 mb-16 animate-fade-up shadow-2xl transition-all duration-500 overflow-hidden relative" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[var(--accent)]/10 transition-all" />
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        Executive Summary
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            "Data is only collected for core bot functionality.",
                            "Strict zero-sale policy for user information.",
                            "On-demand data eradication upon request.",
                            "Full compliance with Discord's developer TOS."
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-[0_0_10px_var(--accent)]" />
                                <span className="text-[var(--text-secondary)] font-medium leading-relaxed">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-24 animate-fade-up" style={{ animationDelay: '200ms' }}>

                    {/* Section 1: Data Collection */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">01</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Information Gathering</h2>
                        </div>

                        <div className="space-y-12">
                            <div className="bg-[var(--bg-secondary)]/30 p-8 rounded-3xl border border-[var(--border)]">
                                <h3 className="text-lg font-black text-white mb-4 uppercase tracking-widest">Automatic Collection</h3>
                                <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-6">
                                    When you interact with Don Pollo, the following metadata is captured for system stability and service execution:
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {["Discord User ID", "Display Username", "Server (Guild) Metadata", "Channel Configurations"].map((id, i) => (
                                        <div key={i} className="px-5 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-[13px] font-bold text-white/60">
                                            {id}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[var(--bg-secondary)]/30 p-8 rounded-3xl border border-[var(--border)]">
                                <h3 className="text-lg font-black text-white mb-4 uppercase tracking-widest">Interactive Data</h3>
                                <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-6">
                                    Specific features store user-provided data to maintain state across sessions:
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        { title: "Economy Stats", desc: "Balances, transaction logs, and global trading history." },
                                        { title: "Activity Logs", desc: "Fishing progress, rod configurations, and inventory states." },
                                        { title: "Server Settings", desc: "Custom embeds, logging triggers, and auto-moderation rules." }
                                    ].map((item, i) => (
                                        <li key={i} className="flex flex-col gap-1">
                                            <span className="text-white font-black text-xs uppercase tracking-widest">{item.title}</span>
                                            <span className="text-[var(--text-tertiary)] text-sm font-medium">{item.desc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 2: Usage */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">02</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Data Utilization</h2>
                        </div>
                        <div className="p-10 rounded-[40px] bg-white/[0.02] border border-[var(--border)]">
                            <p className="text-[var(--text-secondary)] text-lg leading-relaxed font-medium mb-10">
                                We utilize your information strictly to power the high-performance features of the Don Pollo ecosystem:
                            </p>
                            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                                {[
                                    "State persistence for RPG and economy mechanics.",
                                    "Real-time leaderboards and competitive ranking.",
                                    "Automated moderation enforcement and security.",
                                    "Infrastructure optimization and performance tuning."
                                ].map((usage, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2.5 shrink-0" />
                                        <span className="text-[var(--text-tertiary)] font-medium">{usage}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 3: Security */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">03</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Security Infrastructure</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-4">Encryption</h3>
                                <p className="text-[var(--text-tertiary)] text-sm font-medium leading-relaxed">
                                    All data in transit and at rest is protected using industry-standard encryption protocols.
                                </p>
                            </div>
                            <div className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-4">Retention</h3>
                                <p className="text-[var(--text-tertiary)] text-sm font-medium leading-relaxed">
                                    Server-specific data is automatically purged 30 days after bot removal from a guild.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 4: Your Rights */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">04</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">User Rights</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 hover:border-blue-500/30 transition-all group">
                                <div className="text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </div>
                                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">Request Access</h4>
                                <p className="text-[var(--text-tertiary)] text-xs font-medium leading-relaxed">Obtain a full export of all data associated with your unique Discord ID.</p>
                            </div>
                            <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 hover:border-red-500/30 transition-all group">
                                <div className="text-red-400 mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </div>
                                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-2">Request Erasure</h4>
                                <p className="text-[var(--text-tertiary)] text-xs font-medium leading-relaxed">Permanently delete your profile and all associated data from our global databases.</p>
                            </div>
                        </div>
                    </section>

                    {/* Support Link */}
                    <div className="bg-gradient-to-br from-[var(--accent)]/10 to-transparent border border-[var(--accent)]/20 rounded-[40px] p-12 md:p-16 text-center">
                        <h3 className="text-3xl font-black text-white mb-6">Need Legal Support?</h3>
                        <p className="text-[var(--text-secondary)] font-medium mb-10 max-w-md mx-auto">
                            Our compliance team is ready to assist with any data-related queries or requests.
                        </p>
                        <a
                            href="https://bit.ly/bantengfam"
                            target="_blank"
                            className="inline-flex px-12 py-5 rounded-3xl bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl"
                        >
                            Open Support Case
                        </a>
                    </div>
                </div>

                {/* Back Link */}
                <div className="mt-32 text-center animate-fade-up" style={{ animationDelay: '300ms' }}>
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-4 px-10 py-5 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[var(--bg-hover)] transition-all backdrop-blur-md"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:-translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Return to Hub
                    </Link>
                </div>
            </div>
        </main>
    );
}
