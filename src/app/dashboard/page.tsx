import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: number;
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

export default async function Dashboard() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.accessToken) {
        redirect("/");
    }

    const userGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        next: { revalidate: 0 }
    });

    if (!userGuildsRes.ok) {
        return (
            <main className="min-h-screen pt-28 pb-16 px-4">
                <div className="max-w-md mx-auto text-center py-20 glass-card rounded-3xl">
                    <div className="text-6xl mb-4">😵</div>
                    <h2 className="text-2xl font-black text-red-400 mb-2">Failed to Load Servers</h2>
                    <p className="text-gray-400">Please try logging in again.</p>
                    <Link href="/api/auth/signout" className="mt-6 inline-block px-6 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition">
                        Re-Login
                    </Link>
                </div>
            </main>
        );
    }

    const userGuilds: Guild[] = await userGuildsRes.json();

    const token = getTokenFromFile();
    let botGuilds: Guild[] = [];
    if (token) {
        const botGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 60 }
        });
        if (botGuildsRes.ok) {
            botGuilds = await botGuildsRes.json();
        }
    }

    const botGuildIds = new Set(Array.isArray(botGuilds) ? botGuilds.map((g) => g.id) : []);

    const adminGuilds = userGuilds.filter((guild) => {
        const perm = guild.permissions;
        return (perm & 0x20) === 0x20 || (perm & 0x8) === 0x8;
    });

    let clientId = '';
    if (token) {
        try {
            clientId = Buffer.from(token.split('.')[0], 'base64').toString();
        } catch { }
    }

    return (
        <main className="min-h-screen pt-28 pb-16 px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-black mb-3">
                        <span className="text-white">🎛️ </span>
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p className="text-lg text-gray-400 font-medium">
                        Select a server to manage
                    </p>

                    {/* User Info Card */}
                    <div className="mt-6 inline-flex items-center gap-4 glass px-6 py-3 rounded-full">
                        <img
                            src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt="User"
                            className="w-10 h-10 rounded-full border-2 border-white/20"
                        />
                        <span className="font-bold text-white">{session.user?.name}</span>
                        <span className="text-amber-400 font-bold bg-amber-500/20 px-3 py-1 rounded-full text-sm">
                            {adminGuilds.length} Server{adminGuilds.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Server Grid */}
                <div className="space-y-4">
                    {adminGuilds.length === 0 ? (
                        <div className="text-center py-20 glass-card rounded-3xl">
                            <div className="text-6xl mb-4">🤷‍♂️</div>
                            <h2 className="text-2xl font-black text-gray-300 mb-2">No Servers Found</h2>
                            <p className="text-gray-500">You need Admin permissions in a server to manage Don Pollo.</p>
                        </div>
                    ) : (
                        adminGuilds.map((guild) => {
                            const isBotIn = botGuildIds.has(guild.id);
                            const iconUrl = guild.icon
                                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                                : "https://cdn.discordapp.com/embed/avatars/0.png";

                            // Active servers get special styling
                            if (isBotIn) {
                                return (
                                    <div
                                        key={guild.id}
                                        className="relative p-5 rounded-2xl server-card-active hover:scale-[1.01] transition-all duration-300"
                                    >
                                        <div className="absolute -top-2 -right-2 text-2xl animate-pulse">✅</div>
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <img
                                                    src={iconUrl}
                                                    alt={guild.name}
                                                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-lg"
                                                />
                                                {guild.owner && (
                                                    <span className="absolute -bottom-1 -right-1 text-lg">👑</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xl md:text-2xl font-black text-white truncate">
                                                    {guild.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-emerald-400 bg-emerald-500/20 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        ● Active
                                                    </span>
                                                    {guild.owner && (
                                                        <span className="text-amber-400 bg-amber-500/20 px-3 py-0.5 rounded-full text-xs font-bold">
                                                            Owner
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/dashboard/${guild.id}`}
                                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2"
                                            >
                                                <span>Manage</span>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            }

                            // Inactive servers
                            return (
                                <div
                                    key={guild.id}
                                    className="flex items-center gap-4 p-4 rounded-xl glass hover:bg-white/10 transition-all duration-200"
                                >
                                    <div className="relative">
                                        <img
                                            src={iconUrl}
                                            alt={guild.name}
                                            className="w-14 h-14 rounded-xl object-cover border-2 border-white/10 grayscale-[30%] opacity-80"
                                        />
                                        {guild.owner && (
                                            <span className="absolute -bottom-1 -right-1 text-sm">👑</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-gray-300 truncate">{guild.name}</h3>
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                                            ● Not Configured
                                        </span>
                                    </div>
                                    <a
                                        href={`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                                        target="_blank"
                                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25 text-black font-bold rounded-lg transition-all flex items-center gap-2"
                                    >
                                        <span>Invite Bot</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Quick Stats */}
                {adminGuilds.length > 0 && (
                    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass-card rounded-2xl p-4 text-center">
                            <div className="text-3xl font-black gradient-text">{adminGuilds.length}</div>
                            <div className="text-gray-500 text-sm font-bold">Total Servers</div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 text-center">
                            <div className="text-3xl font-black text-emerald-400">{adminGuilds.filter(g => botGuildIds.has(g.id)).length}</div>
                            <div className="text-gray-500 text-sm font-bold">Active</div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 text-center">
                            <div className="text-3xl font-black text-gray-500">{adminGuilds.filter(g => !botGuildIds.has(g.id)).length}</div>
                            <div className="text-gray-500 text-sm font-bold">Pending</div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 text-center">
                            <div className="text-3xl font-black gradient-text">{adminGuilds.filter(g => g.owner).length}</div>
                            <div className="text-gray-500 text-sm font-bold">Owned</div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
