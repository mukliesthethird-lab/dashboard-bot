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
                        <PremiumCard title="Members" description="Total community size" icon={<span className="text-xl">👥</span>}>
                            <div className="text-2xl font-bold text-white mt-1">
                                {guild.approximate_member_count?.toLocaleString() || "—"}
                            </div>
                        </PremiumCard>

                        <PremiumCard title="Bot Status" description="System heartbeat" icon={<span className="text-xl">✅</span>} badge="Active">
                            <div className="text-2xl font-bold text-emerald-400 mt-1">Online</div>
                        </PremiumCard>

                        <PremiumCard title="Server ID" description="Unique identifier" icon={<span className="text-xl">🆔</span>}>
                            <div className="text-sm font-medium text-[var(--text-tertiary)] mt-2 break-all">{guildId}</div>
                        </PremiumCard>
                    </div>

                    {/* Analytics */}
                    <div className="mb-6">
                        <PremiumCard title="Server Analytics" description="Real-time visualizations of community growth" icon={<span className="text-xl text-blue-400">📊</span>}>
                            <AnalyticsCharts guildId={guildId} />
                        </PremiumCard>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-6 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-[var(--bg-hover)] rounded-lg text-amber-500">
                                <span className="text-xl">⚡</span>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Fast Navigation</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Quick access to server configuration modules</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                                { href: 'welcome', icon: '👋', label: 'Welcome' },
                                { href: 'roles', icon: '🎭', label: 'Roles' },
                                { href: 'moderation', icon: '🛡️', label: 'Moderation' },
                                { href: 'logging', icon: '📋', label: 'Logging' },
                                { href: 'economy', icon: '💰', label: 'Economy' },
                                { href: 'fishing', icon: '🎣', label: 'Fishing' },
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
