import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import https from "https";
import GuildSidebar from "@/components/GuildSidebar";
import WelcomeSettings from "@/components/WelcomeSettings";

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

export default async function WelcomePage({
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
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />

            <main className="ml-72 pt-24 p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-2">
                            👋 Welcome Settings
                        </h1>
                        <p className="text-amber-700 font-bold">
                            Configure welcome and leave messages for {guild.name}
                        </p>
                    </div>

                    {/* Welcome Settings Component */}
                    <WelcomeSettings guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
