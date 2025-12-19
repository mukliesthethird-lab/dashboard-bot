import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GuildSidebar from "@/components/GuildSidebar";
import ModerationSettings from "@/components/ModerationSettings";
import DashboardHeader from "@/components/DashboardHeader";
import https from "https";
import { getDiscordToken } from "@/lib/discord-token";

function fetchGuildName(guildId: string, token: string): Promise<{ name: string; icon: string | null }> {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/guilds/${guildId}`,
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
                    const g = JSON.parse(data);
                    resolve({ name: g.name, icon: g.icon });
                } else {
                    resolve({ name: "Server", icon: null });
                }
            });
        });
        req.on('error', () => resolve({ name: "Server", icon: null }));
        req.end();
    });
}

export default async function ModerationPage({
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
    const guild = token ? await fetchGuildName(guildId, token) : { name: "Server", icon: null };

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />
            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <DashboardHeader
                        title="Moderation System"
                        subtitle="Manage automated moderation, cases, and punishments"
                        icon="🛡️"
                    />

                    <ModerationSettings guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
