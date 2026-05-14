import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDiscordToken } from "@/lib/discord-token";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: number;
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
            <main className="min-h-screen pt-24 pb-16 px-4">
                <div className="max-w-sm mx-auto text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                    <div className="text-4xl mb-3">😵</div>
                    <h2 className="text-lg font-bold text-[var(--error)] mb-1">Failed to Load Servers</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-4">Please try logging in again.</p>
                    <Link href="/api/auth/signout" className="inline-block px-5 py-2 bg-[var(--error)] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition">
                        Re-Login
                    </Link>
                </div>
            </main>
        );
    }

    const userGuilds: Guild[] = await userGuildsRes.json();

    const token = getDiscordToken();
    let botGuilds: Guild[] = [];
    if (token) {
        const botGuildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 60 }
        });
        if (botGuildsRes.ok) botGuilds = await botGuildsRes.json();
    }

    const botGuildIds = new Set(Array.isArray(botGuilds) ? botGuilds.map((g) => g.id) : []);
    const adminGuilds = userGuilds.filter((guild) => {
        const perm = guild.permissions;
        return (perm & 0x20) === 0x20 || (perm & 0x8) === 0x8;
    });

    let clientId = '';
    if (token) { try { clientId = Buffer.from(token.split('.')[0], 'base64').toString(); } catch { } }

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        <span className="gradient-text">Dashboard</span>
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">Select a server to manage</p>

                    <div className="mt-4 inline-flex items-center gap-3 bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border)]">
                        <img
                            src={session.user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt="User"
                            className="w-8 h-8 rounded-lg border border-[var(--border)]"
                        />
                        <span className="font-medium text-sm text-white">{session.user?.name}</span>
                        <span className="text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md text-xs font-semibold">
                            {adminGuilds.length} Server{adminGuilds.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Server List */}
                <div className="space-y-2">
                    {adminGuilds.length === 0 ? (
                        <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                            <div className="text-4xl mb-3">🤷‍♂️</div>
                            <h2 className="text-lg font-semibold text-white mb-1">No Servers Found</h2>
                            <p className="text-[var(--text-secondary)] text-sm">You need Admin permissions in a server to manage Don Pollo.</p>
                        </div>
                    ) : (
                        adminGuilds.map((guild) => {
                            const isBotIn = botGuildIds.has(guild.id);
                            const iconUrl = guild.icon
                                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                                : "https://cdn.discordapp.com/embed/avatars/0.png";

                            if (isBotIn) {
                                return (
                                    <div key={guild.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all group">
                                        <div className="relative">
                                            <img src={iconUrl} alt={guild.name} className="w-12 h-12 rounded-xl border border-emerald-500/30 object-cover" />
                                            {guild.owner && <span className="absolute -bottom-1 -right-1 text-xs">👑</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{guild.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-emerald-400 bg-[var(--success-muted)] px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                                                    ● Active
                                                </span>
                                                {guild.owner && (
                                                    <span className="text-[var(--accent)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-md text-[10px] font-semibold">Owner</span>
                                                )}
                                            </div>
                                        </div>
                                        <Link
                                            href={`/dashboard/${guild.id}`}
                                            className="px-4 py-2 bg-[var(--success)] hover:brightness-110 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            Manage
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                );
                            }

                            return (
                                <div key={guild.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] opacity-75 hover:opacity-100 transition-all">
                                    <div className="relative">
                                        <img src={iconUrl} alt={guild.name} className="w-10 h-10 rounded-lg border border-[var(--border)] object-cover grayscale-[30%]" />
                                        {guild.owner && <span className="absolute -bottom-1 -right-1 text-xs">👑</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-[var(--text-secondary)] truncate">{guild.name}</h3>
                                        <span className="text-[var(--text-tertiary)] text-[10px] font-semibold uppercase tracking-wider">● Not Configured</span>
                                    </div>
                                    <a
                                        href={`https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                                        target="_blank"
                                        className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        Invite Bot
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Total Servers", value: adminGuilds.length, cls: "gradient-text" },
                            { label: "Active", value: adminGuilds.filter(g => botGuildIds.has(g.id)).length, cls: "text-emerald-400" },
                            { label: "Pending", value: adminGuilds.filter(g => !botGuildIds.has(g.id)).length, cls: "text-[var(--text-tertiary)]" },
                            { label: "Owned", value: adminGuilds.filter(g => g.owner).length, cls: "gradient-text" },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3 text-center">
                                <div className={`text-2xl font-bold ${stat.cls}`}>{stat.value}</div>
                                <div className="text-[var(--text-tertiary)] text-xs font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
