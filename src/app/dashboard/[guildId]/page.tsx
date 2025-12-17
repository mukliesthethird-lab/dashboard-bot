import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import ActivityLog from "@/components/ActivityLog";
import SettingsExportImport from "@/components/SettingsExportImport";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    approximate_member_count?: number;
}

function getTokenFromFile(): string {
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');

    for (const envPath of [rootEnvPath, localEnvPath]) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/DISCORD_TOKEN\s*=\s*(.+)/);
            if (match) {
                return match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    }
    return '';
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

    const token = getTokenFromFile();
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
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={iconUrl}
                                        alt={guild.name}
                                        className="w-16 h-16 rounded-2xl border-2 border-white/20 shadow-xl"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-black text-white">
                                        {guild.name}
                                    </h1>
                                    <p className="text-amber-400 font-bold">Server Overview</p>
                                </div>
                            </div>
                            <SettingsExportImport guildId={guildId} />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        <div className="glass-card rounded-2xl p-5">
                            <div className="text-4xl mb-2">👥</div>
                            <div className="text-2xl font-black text-white">
                                {guild.approximate_member_count?.toLocaleString() || "—"}
                            </div>
                            <div className="text-gray-400 text-sm font-bold">Members</div>
                        </div>
                        <div className="glass-card rounded-2xl p-5">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="text-2xl font-black text-emerald-400">Online</div>
                            <div className="text-gray-400 text-sm font-bold">Bot Status</div>
                        </div>
                        <div className="glass-card rounded-2xl p-5">
                            <div className="text-4xl mb-2">🆔</div>
                            <div className="text-lg font-black gradient-text truncate">{guildId}</div>
                            <div className="text-gray-400 text-sm font-bold">Server ID</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="glass-card rounded-3xl p-6 mb-8">
                        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                            <span className="text-2xl">⚡</span> Quick Actions
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <a href={`/dashboard/${guildId}/welcome`} className="group p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">👋</div>
                                <div className="font-bold text-gray-300 text-xs">Welcome</div>
                            </a>
                            <a href={`/dashboard/${guildId}/roles`} className="group p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">🎭</div>
                                <div className="font-bold text-gray-300 text-xs">Roles</div>
                            </a>
                            <a href={`/dashboard/${guildId}/moderation`} className="group p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">🛡️</div>
                                <div className="font-bold text-gray-300 text-xs">Moderation</div>
                            </a>
                            <a href={`/dashboard/${guildId}/logging`} className="group p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">📋</div>
                                <div className="font-bold text-gray-300 text-xs">Logging</div>
                            </a>
                            <a href={`/dashboard/${guildId}/economy`} className="group p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">💰</div>
                                <div className="font-bold text-gray-300 text-xs">Economy</div>
                            </a>
                            <a href={`/dashboard/${guildId}/fishing`} className="group p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/20 transition text-center">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition">🎣</div>
                                <div className="font-bold text-gray-300 text-xs">Fishing</div>
                            </a>
                        </div>
                    </div>

                    {/* Recent Activity - Now using real component */}
                    <ActivityLog guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
