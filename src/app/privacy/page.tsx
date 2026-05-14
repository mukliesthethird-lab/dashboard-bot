import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Privacy Policy for Don Pollo Discord Bot - Learn how we collect, use, and protect your data"
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-secondary)] text-white pt-28 pb-16 px-4 md:px-8 relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[40vw] h-[40vh] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-up">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400">
                            Privacy Policy
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400 font-medium">
                        Last updated: December 17, 2024
                    </p>
                </div>

                {/* Quick Summary */}
                <div className="glass-card bg-indigo-500/5 border-indigo-500/20 rounded-3xl p-8 mb-12 animate-fade-up" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-2xl font-bold text-indigo-400 mb-4 flex items-center gap-3">
                        <span className="text-3xl">🛡️</span> Quick Summary
                    </h2>
                    <ul className="text-gray-300 space-y-3 text-lg">
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-400" /> We only collect data necessary for bot functionality</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-400" /> We never sell your data to third parties</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-400" /> You can request data deletion at any time</li>
                        <li className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-400" /> We comply with Discord's Terms of Service</li>
                    </ul>
                </div>

                {/* Content */}
                <div className="glass-card rounded-[2.5rem] p-8 md:p-12 shadow-2xl border-white/5 space-y-12 animate-fade-up" style={{ animationDelay: '200ms' }}>

                    {/* Introduction */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Introduction</h2>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            Don Pollo ("we", "us", "our", or "the Bot") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                            when you use our Discord bot. Please read this policy carefully. By using the Bot, you
                            consent to the data practices described in this policy.
                        </p>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Data Collection */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-8"><span className="text-indigo-400">1.</span> Information We Collect</h2>

                        <h3 className="text-xl font-bold text-white mt-6 mb-4">1.1 Information Collected Automatically</h3>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            When you interact with the Bot, we automatically collect certain information:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-2 ml-4 mb-8 marker:text-indigo-400">
                            <li><strong className="text-gray-200">Discord User ID</strong> - A unique identifier assigned by Discord to identify your account</li>
                            <li><strong className="text-gray-200">Discord Username</strong> - Your current display name (for leaderboards and UI)</li>
                            <li><strong className="text-gray-200">Server (Guild) ID</strong> - Identifier for the Discord server where the bot is used</li>
                            <li><strong className="text-gray-200">Channel ID</strong> - Identifier for channels where certain features are configured</li>
                            <li><strong className="text-gray-200">Command Usage Data</strong> - Which commands you use (for functionality, not analytics)</li>
                        </ul>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">1.2 Information You Provide</h3>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            Some features require you to provide additional information:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-2 ml-4 mb-8 marker:text-indigo-400">
                            <li><strong className="text-gray-200">Economy Data</strong> - Virtual currency balance, transaction history, inventory items</li>
                            <li><strong className="text-gray-200">Fishing Data</strong> - Caught fish, rods, buffs, and game progress</li>
                            <li><strong className="text-gray-200">Configuration Settings</strong> - Welcome messages, logging preferences, moderation settings</li>
                            <li><strong className="text-gray-200">Custom Messages</strong> - Embeds and messages you create through the dashboard</li>
                        </ul>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">1.3 Message Content</h3>
                        <p className="text-gray-400 text-lg leading-relaxed mb-4">
                            The Bot may access message content only when:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-2 ml-4 mt-2 marker:text-indigo-400">
                            <li>You explicitly enable the message logging feature</li>
                            <li>Processing commands that require message analysis</li>
                            <li>Auto-moderation features are enabled by server administrators</li>
                        </ul>
                        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/80 italic">
                            <strong>Note:</strong> We do not store message content for analytics or marketing purposes.
                        </div>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* How We Use Data */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6"><span className="text-fuchsia-400">2.</span> How We Use Your Information</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-6">
                            We use the collected information for the following purposes:
                        </p>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-3 ml-4 marker:text-fuchsia-400">
                            <li><strong className="text-gray-200">Bot Functionality</strong> - To provide and maintain the bot's features</li>
                            <li><strong className="text-gray-200">Economy System</strong> - To track balances, transactions, and game progress</li>
                            <li><strong className="text-gray-200">Leaderboards</strong> - To display rankings and statistics</li>
                            <li><strong className="text-gray-200">Moderation</strong> - To enforce server rules when enabled by administrators</li>
                            <li><strong className="text-gray-200">Logging</strong> - To record server events when configured by administrators</li>
                            <li><strong className="text-gray-200">Service Improvement</strong> - To fix bugs and improve functionality</li>
                        </ul>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Data Storage */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-8"><span className="text-emerald-400">3.</span> Data Storage and Security</h2>

                        <h3 className="text-xl font-bold text-white mt-6 mb-4">3.1 Storage Location</h3>
                        <p className="text-gray-400 text-lg leading-relaxed mb-8">
                            All data is stored in secure database servers. We implement industry-standard security
                            measures to protect your data from unauthorized access, alteration, or destruction.
                        </p>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">3.2 Data Retention</h3>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-2 ml-4 mb-8 marker:text-emerald-400">
                            <li>User data is retained as long as you actively use the bot</li>
                            <li>Server data may be deleted 30 days after the bot is removed from a server</li>
                            <li>Inactive user data (no interaction for 1 year) may be automatically purged</li>
                            <li>Logging data is retained according to server administrator settings</li>
                        </ul>

                        <h3 className="text-xl font-bold text-white mt-8 mb-4">3.3 Security Measures</h3>
                        <ul className="list-disc list-inside text-gray-400 text-lg space-y-2 ml-4 marker:text-emerald-400">
                            <li>Encrypted database connections</li>
                            <li>Regular security updates and patches</li>
                            <li>Limited access to raw data</li>
                            <li>Regular backups with encryption</li>
                        </ul>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Your Rights and Choices</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-8">
                            You have full control over your data. You can exercise the following rights:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">📥 Access</h4>
                                <p className="text-gray-400">Request a copy of all data we have attached to your account ID.</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-red-500/30 transition-colors">
                                <h4 className="font-bold text-white text-xl mb-2 flex items-center gap-2">🗑️ Deletion</h4>
                                <p className="text-gray-400">Request complete eradication of your data from our systems.</p>
                            </div>
                        </div>

                        <p className="text-gray-400 text-lg leading-relaxed mt-8">
                            To exercise these rights, please contact our support team.
                        </p>
                    </section>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Contact */}
                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Contact Us</h2>
                        <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20 flex flex-col items-center text-center">
                            <p className="text-gray-300 text-lg mb-4">
                                Need help with your data or have questions regarding this policy?
                            </p>
                            <a href="https://bit.ly/bantengfam" target="_blank" className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-full transition-colors">
                                Join Support Server
                            </a>
                        </div>
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
