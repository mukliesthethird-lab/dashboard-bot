import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "The legal framework and operational guidelines for the Don Pollo premium ecosystem."
};

export default function TOSPage() {
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
                        Terms of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-primary)]/40">
                            Service.
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-[var(--text-secondary)] font-medium max-w-xl mx-auto">
                        The operational framework and guidelines for using the Don Pollo ecosystem.
                    </p>
                    <div className="mt-8 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">
                        Revision Date: May 15, 2026
                    </div>
                </div>

                {/* Core Rules Card */}
                <div className="group bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/30 rounded-[40px] p-10 md:p-14 mb-16 animate-fade-up shadow-2xl transition-all duration-500 overflow-hidden relative" style={{ animationDelay: '100ms' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[var(--accent)]/10 transition-all" />
                    <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        Executive Mandates
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            "Users must strictly adhere to Discord's Platform Rules.",
                            "Virtual assets have zero real-world monetary value.",
                            "Exploitation of system glitches is strictly prohibited.",
                            "We reserve the right to terminate access for violations."
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

                    {/* Section 1: Eligibility */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">01</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Access Eligibility</h2>
                        </div>
                        <div className="bg-[var(--bg-secondary)]/30 p-8 rounded-3xl border border-[var(--border)]">
                            <p className="text-[var(--text-secondary)] font-medium leading-relaxed mb-8">
                                To interact with the Don Pollo Service, you must meet the following baseline requirements:
                            </p>
                            <div className="grid sm:grid-cols-3 gap-4">
                                {[
                                    { label: "Age", val: "13+ Years" },
                                    { label: "Status", val: "Verified Discord" },
                                    { label: "Standing", val: "Good Account" }
                                ].map((item, i) => (
                                    <div key={i} className="px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{item.label}</div>
                                        <div className="text-sm font-black text-white">{item.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 2: Virtual Economy */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">02</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Virtual Economy Mechanics</h2>
                        </div>
                        <div className="p-10 rounded-[40px] bg-red-600/[0.03] border border-red-500/20">
                            <h3 className="text-red-400 font-black text-xs uppercase tracking-[0.3em] mb-6">Monetary Disclaimer</h3>
                            <p className="text-[var(--text-secondary)] text-lg leading-relaxed font-medium mb-8">
                                All in-game assets, including virtual currency, items, and rankings, are purely for entertainment. They:
                            </p>
                            <ul className="grid sm:grid-cols-2 gap-4">
                                {[
                                    "Hold no real-world financial value.",
                                    "Cannot be redeemed for legal tender.",
                                    "Are subject to periodic balance wipes.",
                                    "Are not considered private property."
                                ].map((rule, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-red-200/60 font-medium">
                                        <span className="text-red-400">×</span> {rule}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 3: Prohibited Actions */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">03</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Zero Tolerance Protocol</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                { title: "Exploitation", desc: "Abusing system vulnerabilities or glitches for competitive advantage." },
                                { title: "Automation", desc: "Using third-party scripts, macros, or bots to interact with our API." },
                                { title: "Farming", desc: "Utilizing multiple accounts (alts) to generate unfair rewards." },
                                { title: "RMT", desc: "Attempting to trade virtual assets for real-world currency." }
                            ].map((item, i) => (
                                <div key={i} className="p-8 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)] group hover:border-red-500/20 transition-all">
                                    <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-3 group-hover:text-red-400 transition-colors">{item.title}</h3>
                                    <p className="text-[var(--text-tertiary)] text-sm font-medium leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                    {/* Section 4: Liability */}
                    <section className="space-y-10">
                        <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-[var(--accent)]/20">04</span>
                            <h2 className="text-3xl font-black text-white tracking-tight">Service Liability</h2>
                        </div>
                        <div className="p-10 rounded-[40px] bg-white/[0.02] border border-[var(--border)]">
                            <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-6">"As-Is" Provision</h3>
                            <p className="text-[var(--text-secondary)] text-lg leading-relaxed font-medium">
                                Don Pollo is provided "AS IS" and "AS AVAILABLE". We disclaim all warranties, express or implied.
                                We are not responsible for data loss, downtime, or the actions of third-party users within our ecosystem.
                            </p>
                        </div>
                    </section>

                    {/* Acceptance */}
                    <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[40px] p-12 md:p-16 text-center">
                        <h3 className="text-3xl font-black text-white mb-6">Agreement Acceptance</h3>
                        <p className="text-[var(--text-secondary)] font-medium mb-10 max-w-md mx-auto">
                            By continuing to use Don Pollo, you explicitly agree to all terms outlined in this document.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex px-12 py-5 rounded-3xl bg-[var(--accent)] text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl"
                        >
                            Confirm Acceptance
                        </Link>
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
