import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import FormsSettings from "@/components/FormsSettings";
import DashboardHeader from "@/components/DashboardHeader";
import { getDiscordToken } from "@/lib/discord-token";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

function fetchGuild(guildId: string, token: string): Promise<Guild> {
    return new Promise((resolve) => {
        const defaultGuild = { id: guildId, name: "Server", icon: null };
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10/guilds/${guildId}`,
            method: 'GET',
            headers: { 'Authorization': `Bot ${token}`, 'User-Agent': 'DonPolloBot/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(JSON.parse(data));
                else resolve(defaultGuild);
            });
        });
        req.on('error', () => resolve(defaultGuild));
        req.end();
    });
}

export default async function FormsPage({
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

            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <DashboardHeader
                        title="Forms Builder"
                        subtitle={`Create and manage forms for ${guild.name}`}
                        icon="📋"
                    />

                    {/* Forms Settings Component */}
                    <FormsSettings guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
