import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import EconomyActions from "@/components/EconomyActions";
import DashboardHeader from "@/components/DashboardHeader";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

function getTokenFromFile(): string {
    const rootEnvPath = path.resolve(process.cwd(), '../.env');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    for (const envPath of [rootEnvPath, localEnvPath]) {
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const match = content.match(/DISCORD_TOKEN\s*=\s*(.+)/);
            if (match) return match[1].trim().replace(/^["']|["']$/g, '');
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

export default async function EconomyPage({
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

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />

            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <DashboardHeader
                        title="Economy Management"
                        subtitle="Manage your server's virtual economy"
                        icon="💰"
                    />

                    {/* Economy Actions Component (Client-side with modals) */}
                    <EconomyActions guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
