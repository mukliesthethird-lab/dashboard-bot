import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import ActivityLog from "@/components/ActivityLog";
import SettingsExportImport from "@/components/SettingsExportImport";
import DashboardHeader from "@/components/DashboardHeader";
import PremiumCard from "@/components/PremiumCard";
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
                                gradientFrom="amber-400"
                                gradientTo="orange-500"
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

                    {/* Quick Actions */}
                    <PremiumCard
                        title="Quick Actions"
                        description="Frequently used tools and settings"
                        icon={<span className="text-2xl">⚡</span>}
                        className="mb-8"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
                            <a href={`/dashboard/${guildId}/welcome`} className="group p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">👋</div>
                                <div className="font-bold text-gray-300 text-xs">Welcome</div>
                            </a>
                            <a href={`/dashboard/${guildId}/roles`} className="group p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">🎭</div>
                                <div className="font-bold text-gray-300 text-xs">Roles</div>
                            </a>
                            <a href={`/dashboard/${guildId}/moderation`} className="group p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">🛡️</div>
                                <div className="font-bold text-gray-300 text-xs">Moderation</div>
                            </a>
                            <a href={`/dashboard/${guildId}/logging`} className="group p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">📋</div>
                                <div className="font-bold text-gray-300 text-xs">Logging</div>
                            </a>
                            <a href={`/dashboard/${guildId}/economy`} className="group p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">💰</div>
                                <div className="font-bold text-gray-300 text-xs">Economy</div>
                            </a>
                            <a href={`/dashboard/${guildId}/fishing`} className="group p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 transition-all duration-300 text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 group-hover:-rotate-6 transition">🎣</div>
                                <div className="font-bold text-gray-300 text-xs">Fishing</div>
                            </a>
                        </div>
                    </PremiumCard>

                    {/* Recent Activity - Now using real component */}
                    <ActivityLog guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
