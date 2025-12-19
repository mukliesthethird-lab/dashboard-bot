import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Terms of Service for Don Pollo Discord Bot - Rules and guidelines for using our bot"
};

export default function TOSPage() {
    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-3">
                        <span className="mr-2">📜</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            Terms of Service
                        </span>
                    </h1>
                    <p className="text-stone-500">
                        Last updated: December 17, 2024
                    </p>
                </div>

                {/* Quick Summary */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold text-amber-800 mb-2">📋 Quick Summary</h2>
                    <ul className="text-amber-700 space-y-1 text-sm">
                        <li>✓ Use the bot responsibly and follow Discord's rules</li>
                        <li>✓ Virtual currency has no real-world value</li>
                        <li>✓ Don't exploit bugs or abuse the service</li>
                        <li>✓ We may terminate access for violations</li>
                    </ul>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-200 space-y-10">

                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">Introduction</h2>
                        <p className="text-stone-600 leading-relaxed">
                            Welcome to Don Pollo! These Terms of Service ("Terms") govern your use of the Don Pollo Discord
                            Bot ("Bot", "Service", "we", "us", or "our"). By using the Bot, you agree to be bound by these
                            Terms. If you do not agree to these Terms, please do not use the Bot.
                        </p>
                        <p className="text-stone-600 leading-relaxed mt-3">
                            These Terms constitute a legally binding agreement between you and Don Pollo. Please read
                            them carefully before using our Service.
                        </p>
                    </section>

                    {/* Eligibility */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">1. Eligibility</h2>
                        <p className="text-stone-600 leading-relaxed">
                            To use the Bot, you must:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4 mt-3">
                            <li>Be at least 13 years old, or the minimum age required in your country to use Discord</li>
                            <li>Have a valid Discord account in good standing</li>
                            <li>Comply with Discord's Terms of Service and Community Guidelines</li>
                            <li>Have the legal capacity to enter into this agreement</li>
                        </ul>
                    </section>

                    {/* Description of Service */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">2. Description of Service</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            Don Pollo is a Discord bot that provides entertainment and utility features for Discord servers, including but not limited to:
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">💰 Economy System</h4>
                                <p className="text-stone-600 text-sm">Virtual currency, work commands, gambling, shops, and trading</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">🎣 Fishing Game</h4>
                                <p className="text-stone-600 text-sm">Catch fish, upgrade rods, collect items, and compete on leaderboards</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">🛡️ Moderation</h4>
                                <p className="text-stone-600 text-sm">Warnings, bans, kicks, mutes, and auto-moderation</p>
                            </div>
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                                <h4 className="font-bold text-stone-800 mb-2">⚙️ Server Management</h4>
                                <p className="text-stone-600 text-sm">Welcome messages, logging, reaction roles, and more</p>
                            </div>
                        </div>
                    </section>

                    {/* User Responsibilities */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">3. User Responsibilities</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            When using the Bot, you agree to:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>Follow Discord's Terms of Service and Community Guidelines at all times</li>
                            <li>Not use the Bot for any illegal, harmful, or malicious purposes</li>
                            <li>Not attempt to exploit, hack, or abuse the Bot's features</li>
                            <li>Not use automated scripts, bots, or tools to interact with the Bot</li>
                            <li>Not attempt to gain unauthorized access to our systems or data</li>
                            <li>Report any bugs or vulnerabilities to us responsibly</li>
                            <li>Not spam commands or intentionally overload the Bot</li>
                            <li>Not harass, threaten, or abuse other users through the Bot</li>
                        </ul>
                    </section>

                    {/* Prohibited Activities */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">4. Prohibited Activities</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            The following activities are strictly prohibited and may result in immediate termination:
                        </p>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                            <ul className="text-red-700 space-y-2">
                                <li>🚫 Exploiting bugs or glitches for unfair advantage</li>
                                <li>🚫 Using multiple accounts to bypass restrictions or farm rewards</li>
                                <li>🚫 Selling or trading virtual currency for real money</li>
                                <li>🚫 Attempting to reverse engineer or clone the Bot</li>
                                <li>🚫 Using the Bot to distribute malware, phishing links, or harmful content</li>
                                <li>🚫 Impersonating Bot staff or administrators</li>
                                <li>🚫 Circumventing cooldowns, rate limits, or other restrictions</li>
                                <li>🚫 Using the Bot in servers that violate Discord's Terms</li>
                            </ul>
                        </div>
                    </section>

                    {/* Virtual Currency */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">5. Virtual Currency and Items</h2>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <p className="text-amber-800 font-bold">
                                ⚠️ Important: All virtual currency, items, and in-game assets have NO real-world monetary value.
                            </p>
                        </div>

                        <p className="text-stone-600 leading-relaxed mb-3">
                            Regarding the economy system:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>Virtual currency ("coins", "balance") is for entertainment purposes only</li>
                            <li>You may not sell, trade, or exchange virtual currency for real money</li>
                            <li>You may not purchase virtual currency with real money (unless officially offered)</li>
                            <li>We reserve the right to modify, reset, or remove balances at any time</li>
                            <li>Lost or stolen virtual currency will not be refunded</li>
                            <li>Trading between users is at your own risk</li>
                        </ul>
                    </section>

                    {/* Service Availability */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">6. Service Availability</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            We strive to provide reliable service, but we do not guarantee:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>Uninterrupted or error-free operation</li>
                            <li>Compatibility with all devices or Discord configurations</li>
                            <li>Preservation of data in case of technical failures</li>
                            <li>Timely fixes for all bugs or issues</li>
                        </ul>
                        <p className="text-stone-600 leading-relaxed mt-3">
                            We may perform maintenance, updates, or modifications that may temporarily affect service
                            availability. We are not liable for any downtime or data loss.
                        </p>
                    </section>

                    {/* Intellectual Property */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">7. Intellectual Property</h2>
                        <p className="text-stone-600 leading-relaxed">
                            All content, features, and functionality of the Bot, including but not limited to text,
                            graphics, logos, and code, are owned by Don Pollo and are protected by intellectual property
                            laws. You may not copy, modify, distribute, or create derivative works based on our Bot
                            without our explicit written permission.
                        </p>
                    </section>

                    {/* Termination */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">8. Termination</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            We reserve the right to terminate or suspend your access to the Bot at any time,
                            without prior notice, for any reason, including but not limited to:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>Violation of these Terms</li>
                            <li>Violation of Discord's Terms of Service</li>
                            <li>Abusive or harmful behavior</li>
                            <li>Suspected fraud or exploitation</li>
                            <li>At our sole discretion</li>
                        </ul>
                        <p className="text-stone-600 leading-relaxed mt-3">
                            Upon termination, all rights granted to you under these Terms will immediately cease,
                            and any data associated with your account may be deleted.
                        </p>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">9. Limitation of Liability</h2>
                        <p className="text-stone-600 leading-relaxed mb-3">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                        </p>
                        <ul className="list-disc list-inside text-stone-600 space-y-2 ml-4">
                            <li>The Bot is provided "AS IS" and "AS AVAILABLE" without warranties of any kind</li>
                            <li>We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose</li>
                            <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages</li>
                            <li>We are not responsible for actions of other users</li>
                            <li>Our total liability shall not exceed the amount you paid to us (if any)</li>
                        </ul>
                    </section>

                    {/* Indemnification */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">10. Indemnification</h2>
                        <p className="text-stone-600 leading-relaxed">
                            You agree to indemnify and hold harmless Don Pollo and its operators from any claims,
                            damages, losses, liabilities, or expenses arising from your use of the Bot, your violation
                            of these Terms, or your violation of any rights of third parties.
                        </p>
                    </section>

                    {/* Modifications */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">11. Modifications to Terms</h2>
                        <p className="text-stone-600 leading-relaxed">
                            We reserve the right to modify these Terms at any time. Changes will be effective immediately
                            upon posting. We will notify users of significant changes through our Discord support server.
                            Your continued use of the Bot after any modifications constitutes your acceptance of the
                            updated Terms.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">12. Governing Law</h2>
                        <p className="text-stone-600 leading-relaxed">
                            These Terms shall be governed by and construed in accordance with applicable laws.
                            Any disputes arising from these Terms or your use of the Bot shall be resolved through
                            good faith negotiation first, and if necessary, through appropriate legal channels.
                        </p>
                    </section>

                    {/* Severability */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">13. Severability</h2>
                        <p className="text-stone-600 leading-relaxed">
                            If any provision of these Terms is found to be unenforceable or invalid, that provision
                            shall be limited or eliminated to the minimum extent necessary, and the remaining provisions
                            shall remain in full force and effect.
                        </p>
                    </section>

                    {/* Contact */}
                    <section>
                        <h2 className="text-2xl font-bold text-stone-800 mb-4">14. Contact Us</h2>
                        <p className="text-stone-600 leading-relaxed mb-4">
                            If you have questions about these Terms of Service, please contact us through:
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

                    {/* Acknowledgment */}
                    <section className="border-t border-stone-200 pt-8">
                        <p className="text-stone-500 text-center italic">
                            By using Don Pollo, you acknowledge that you have read, understood, and agree to be
                            bound by these Terms of Service.
                        </p>
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
