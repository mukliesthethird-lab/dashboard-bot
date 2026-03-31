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

    const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />

            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex-1">
                            <DashboardHeader
                                title={guild.name}
                                subtitle="Server Overview & Statistics"
                                gradientFrom="indigo-400"
                                gradientTo="purple-500"
                            />
                        </div>
                        <SettingsExportImport guildId={guildId} />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <PremiumCard
                            title="Members"
                            description="Total community size"
                            icon={<span className="text-2xl">👥</span>}
                            gradientFrom="blue-500"
                            gradientTo="cyan-500"
                        >
                            <div className="text-3xl font-black text-white mt-2">
                                {guild.approximate_member_count?.toLocaleString() || "—"}
                            </div>
                        </PremiumCard>

                        <PremiumCard
                            title="Bot Status"
                            description="System heartbeat"
                            icon={<span className="text-2xl">✅</span>}
                            gradientFrom="emerald-500"
                            gradientTo="teal-500"
                            badge="Active"
                        >
                            <div className="text-3xl font-black text-emerald-400 mt-2">
                                Online
                            </div>
                        </PremiumCard>

                        <PremiumCard
                            title="Server ID"
                            description="Unique identifier"
                            icon={<span className="text-2xl">🆔</span>}
                            gradientFrom="purple-500"
                            gradientTo="indigo-500"
                        >
                            <div className="text-lg font-black text-white/70 mt-4 break-all opacity-80">
                                {guildId}
                            </div>
                        </PremiumCard>
                    </div>

                    {/* Analytics Section - THE NEW CENTERPIECE */}
                    <div className="mb-8">
                        <PremiumCard
                            title="Server Analytics"
                            description="Real-time visualizations of community growth and activity"
                            icon={<span className="text-2xl text-blue-400">📊</span>}
                        >
                            <AnalyticsCharts guildId={guildId} />
                        </PremiumCard>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-8 p-[1px] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[8px]">
                        <div className="bg-[#0a0a0f] rounded-[8px] p-6 border border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-white/5 rounded-xl text-yellow-500">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Fast Navigation</h3>
                                    <p className="text-sm text-gray-400 font-medium">Quick access to server configuration modules</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                                {[
                                    { href: 'welcome', icon: '👋', label: 'Welcome', color: 'emerald' },
                                    { href: 'roles', icon: '🎭', label: 'Roles', color: 'purple' },
                                    { href: 'moderation', icon: '🛡️', label: 'Moderation', color: 'red' },
                                    { href: 'logging', icon: '📋', label: 'Logging', color: 'cyan' },
                                    { href: 'economy', icon: '💰', label: 'Economy', color: 'indigo' },
                                    { href: 'fishing', icon: '🎣', label: 'Fishing', color: 'blue' },
                                ].map((item) => (
                                    <a 
                                        key={item.href} 
                                        href={`/dashboard/${guildId}/${item.href}`} 
                                        className="group flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300"
                                    >
                                        <div className="text-2xl mb-2 group-hover:scale-110 group-hover:-rotate-3 transition duration-300">{item.icon}</div>
                                        <div className="font-bold text-gray-400 text-xs uppercase tracking-widest group-hover:text-white transition-colors">{item.label}</div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity - Now using real component */}
                    <div className="mb-8">
                        <ActivityLog guildId={guildId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
