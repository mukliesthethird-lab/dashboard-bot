import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Privacy Policy for Don Pollo Discord Bot - Learn how we collect, use, and protect your data"
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black text-stone-800 mb-3">
                        🔒 Privacy Policy
                    </h1>
                    <p className="text-stone-500">
                        Last updated: December 17, 2024
                    </p>
                </div>

                {/* Quick Summary */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold text-amber-800 mb-2">📋 Quick Summary</h2>
                    <ul className="text-amber-700 space-y-1 text-sm">
                        <li>✓ We only collect data necessary for bot functionality</li>
                        <li>✓ We never sell your data to third parties</li>
                        <li>✓ You can request data deletion at any time</li>
                        <li>✓ We comply with Discord's Terms of Service</li>
                    </ul>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-200 space-y-10">

                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">Introduction</h2>
                        <p className="text-stone-600 leading-relaxed">
                            Don Pollo ("we", "us", "our", or "the Bot") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                            when you use our Discord bot. Please read this policy carefully. By using the Bot, you
                            consent to the data practices described in this policy.
                        </p>
                    </section>

                    {/* Data Collection */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">1. Information We Collect</h2>

                        <h3 className="text-lg font-bold text-stone-700 mt-4 mb-2">1.1 Information Collected Automatically</h3>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            When you interact with the Bot, we automatically collect certain information:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li><strong>Discord User ID</strong> - A unique identifier assigned by Discord to identify your account</li>
                            <li><strong>Discord Username</strong> - Your current display name (for leaderboards and UI)</li>
                            <li><strong>Server (Guild) ID</strong> - Identifier for the Discord server where the bot is used</li>
                            <li><strong>Channel ID</strong> - Identifier for channels where certain features are configured</li>
                            <li><strong>Command Usage Data</strong> - Which commands you use (for functionality, not analytics)</li>
                        </ul>

                        <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">1.2 Information You Provide</h3>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            Some features require you to provide additional information:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li><strong>Economy Data</strong> - Virtual currency balance, transaction history, inventory items</li>
                            <li><strong>Fishing Data</strong> - Caught fish, rods, buffs, and game progress</li>
                            <li><strong>Configuration Settings</strong> - Welcome messages, logging preferences, moderation settings</li>
                            <li><strong>Custom Messages</strong> - Embeds and messages you create through the dashboard</li>
                        </ul>

                        <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">1.3 Message Content</h3>
                        <p className="text-stone-600 leading-relaxed">
                            The Bot may access message content only when:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4 mt-2">
                            <li>You explicitly enable the message logging feature</li>
                            <li>Processing commands that require message analysis</li>
                            <li>Auto-moderation features are enabled by server administrators</li>
                        </ul>
                        <p className="text-stone-600 leading-relaxed mt-2">
                            <strong>Note:</strong> We do not store message content for analytics or marketing purposes.
                        </p>
                    </section>

                    {/* How We Use Data */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">2. How We Use Your Information</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            We use the collected information for the following purposes:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li><strong>Bot Functionality</strong> - To provide and maintain the bot's features</li>
                            <li><strong>Economy System</strong> - To track balances, transactions, and game progress</li>
                            <li><strong>Leaderboards</strong> - To display rankings and statistics</li>
                            <li><strong>Moderation</strong> - To enforce server rules when enabled by administrators</li>
                            <li><strong>Logging</strong> - To record server events when configured by administrators</li>
                            <li><strong>Service Improvement</strong> - To fix bugs and improve functionality</li>
                        </ul>
                    </section>

                    {/* Data Storage */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">3. Data Storage and Security</h2>

                        <h3 className="text-lg font-bold text-stone-700 mt-4 mb-2">3.1 Storage Location</h3>
                        <p className="text-stone-600 leading-relaxed">
                            All data is stored in secure database servers. We implement industry-standard security
                            measures to protect your data from unauthorized access, alteration, or destruction.
                        </p>

                        <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">3.2 Data Retention</h3>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>User data is retained as long as you actively use the bot</li>
                            <li>Server data may be deleted 30 days after the bot is removed from a server</li>
                            <li>Inactive user data (no interaction for 1 year) may be automatically purged</li>
                            <li>Logging data is retained according to server administrator settings</li>
                        </ul>

                        <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">3.3 Security Measures</h3>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>Encrypted database connections</li>
                            <li>Regular security updates and patches</li>
                            <li>Limited access to raw data</li>
                            <li>Regular backups with encryption</li>
                        </ul>
                    </section>

                    {/* Data Sharing */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">4. Data Sharing and Disclosure</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            We do <strong>NOT</strong> sell, trade, or rent your personal information to third parties.
                            Your data may only be shared in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li><strong>Public Leaderboards</strong> - Username and balance may be displayed publicly</li>
                            <li><strong>Server Administrators</strong> - Admins may access logs and moderation data for their server</li>
                            <li><strong>Legal Requirements</strong> - If required by law or to protect our rights</li>
                            <li><strong>Discord</strong> - Data is transmitted through Discord's API</li>
                        </ul>
                    </section>

                    {/* Your Rights */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">5. Your Rights and Choices</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            You have the following rights regarding your data:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">📥 Access Your Data</h4>
                                <p className="text-stone-600 text-sm">Request a copy of all data we have about you</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">🗑️ Delete Your Data</h4>
                                <p className="text-stone-600 text-sm">Request complete deletion of your data</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">📝 Correct Your Data</h4>
                                <p className="text-stone-600 text-sm">Request correction of inaccurate information</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">🚫 Opt Out</h4>
                                <p className="text-stone-600 text-sm">Opt out of optional data collection features</p>
                            </div>
                        </div>

                        <p className="text-stone-600 leading-relaxed mt-4">
                            To exercise these rights, please contact us on our Discord support server.
                        </p>
                    </section>

                    {/* Children's Privacy */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">6. Children's Privacy</h2>
                        <p className="text-stone-600 leading-relaxed">
                            The Bot is intended for users who meet Discord's minimum age requirement (13 years or older,
                            or the minimum age in your country). We do not knowingly collect personal information from
                            children under the applicable age. If we become aware that we have collected data from a child
                            under the minimum age, we will take steps to delete that information.
                        </p>
                    </section>

                    {/* Third Party Services */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">7. Third-Party Services</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            The Bot operates through Discord and is subject to:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>
                                <a href="https://discord.com/privacy" target="_blank" className="text-amber-600 hover:text-amber-700 font-semibold">
                                    Discord's Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a href="https://discord.com/terms" target="_blank" className="text-amber-600 hover:text-amber-700 font-semibold">
                                    Discord's Terms of Service
                                </a>
                            </li>
                        </ul>
                        <p className="text-stone-600 leading-relaxed mt-3">
                            By using this Bot, you also agree to Discord's policies regarding data handling.
                        </p>
                    </section>

                    {/* Updates */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">8. Changes to This Policy</h2>
                        <p className="text-stone-600 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify users of any significant
                            changes by posting an announcement on our Discord support server. Your continued use of the
                            Bot after any changes indicates your acceptance of the updated policy.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">9. Contact Us</h2>
                        <p className="text-stone-600 leading-relaxed mb-4">
                            If you have questions about this Privacy Policy or wish to exercise your data rights,
                            please contact us through:
                        </p>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <p className="text-amber-800">
                                <strong>Discord Support Server:</strong>{" "}
                                <a href="https://bit.ly/bantengfam" target="_blank" className="text-amber-600 hover:text-amber-700 font-bold">
                                    bit.ly/bantengfam
                                </a>
                            </p>
                        </div>
                    </section>

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
        </main>
    );
}
