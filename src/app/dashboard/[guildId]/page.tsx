import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import ActivityLog from "@/components/ActivityLog";

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
        <div className="flex min-h-screen pt-20">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />

            <main className="flex-1 ml-72 p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <img
                                src={iconUrl}
                                alt={guild.name}
                                className="w-16 h-16 rounded-2xl border-4 border-white shadow-xl"
                            />
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-stone-800">
                                    {guild.name}
                                </h1>
                                <p className="text-amber-700 font-bold">Server Overview</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-amber-100 shadow-md">
                            <div className="text-4xl mb-2">👥</div>
                            <div className="text-2xl font-black text-stone-800">
                                {guild.approximate_member_count?.toLocaleString() || "—"}
                            </div>
                            <div className="text-stone-500 text-sm font-bold">Members</div>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-emerald-100 shadow-md">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="text-2xl font-black text-emerald-600">Online</div>
                            <div className="text-stone-500 text-sm font-bold">Bot Status</div>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-blue-100 shadow-md">
                            <div className="text-4xl mb-2">🆔</div>
                            <div className="text-lg font-black text-blue-600 truncate">{guildId}</div>
                            <div className="text-stone-500 text-sm font-bold">Server ID</div>
                        </div>
                    </div>

                    {/* Recent Activity - Now using real component */}
                    <ActivityLog guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
