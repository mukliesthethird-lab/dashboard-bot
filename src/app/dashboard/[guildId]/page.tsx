import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import ActivityLog from "@/components/ActivityLog";
import SettingsExportImport from "@/components/SettingsExportImport";
import DashboardHeader from "@/components/DashboardHeader";
import PremiumCard from "@/components/PremiumCard";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { getDiscordToken } from "@/lib/discord-token";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    approximate_member_count?: number;
}

function fetchGuild(guildId: string, token: string): Promise<Guild> {
    return new Promise((resolve) => {
        const defaultGuild = { id: guildId, name: "Server", icon: null };
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/guilds/${guildId}?with_counts=true`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${token}`,
                'User-Agent': 'DonPolloBot/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    resolve(defaultGuild);
                }
            });
        });
        req.on('error', () => resolve(defaultGuild));
        req.end();
    });
}

export default async function GuildDashboard({
    params,
}: {
    params: Promise<{ guildId: string }>;
}) {
    const { guildId } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        redirect("/");
    }

    const token = getDiscordToken();
    const guild = token ? await fetchGuild(guildId, token) : { id: guildId, name: "Server", icon: null };

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />

            <main className="lg:ml-[272px] pt-32 lg:pt-20 p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <DashboardHeader
                            title={guild.name}
                            subtitle="Server Overview & Statistics"
                            gradientFrom="indigo-400"
                            gradientTo="purple-500"
                        />
                        <SettingsExportImport guildId={guildId} />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                        <PremiumCard title="Members" description="Total community size" icon={<svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}>
                            <div className="text-2xl font-bold text-white mt-1">
                                {guild.approximate_member_count?.toLocaleString() || "—"}
                            </div>
                        </PremiumCard>

                        <PremiumCard title="Bot Status" description="System heartbeat" icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} badge="Active">
                            <div className="text-2xl font-bold text-emerald-400 mt-1">Online</div>
                        </PremiumCard>

                        <PremiumCard title="Server ID" description="Unique identifier" icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}>
                            <div className="text-sm font-medium text-[var(--text-tertiary)] mt-2 break-all">{guildId}</div>
                        </PremiumCard>
                    </div>

                    {/* Analytics */}
                    <div className="mb-6">
                        <PremiumCard title="Server Analytics" description="Real-time visualizations of community growth" icon={<svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}>
                            <AnalyticsCharts guildId={guildId} />
                        </PremiumCard>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[var(--bg-hover)] rounded-lg text-amber-500">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Fast Navigation</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Quick access to server configuration modules</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                                { href: 'welcome', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Welcome' },
                                { href: 'roles', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Roles' },
                                { href: 'moderation', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: 'Moderation' },
                                { href: 'logging', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" /></svg>, label: 'Logging' },
                                { href: 'economy', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Economy' },
                                { href: 'fishing', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>, label: 'Fishing' },
                            ].map((item) => (
                                <a
                                    key={item.href}
                                    href={`/dashboard/${guildId}/${item.href}`}
                                    className="group flex flex-col items-center justify-center p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-white/8 transition-all"
                                >
                                    <div className="text-xl mb-1.5 group-hover:scale-110 transition">{item.icon}</div>
                                    <div className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase tracking-wider group-hover:text-white transition-colors">{item.label}</div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="mb-6">
                        <ActivityLog guildId={guildId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
