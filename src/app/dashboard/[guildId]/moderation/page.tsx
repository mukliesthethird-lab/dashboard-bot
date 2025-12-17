import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GuildSidebar from "@/components/GuildSidebar";
import ModerationSettings from "@/components/ModerationSettings";
import fs from "fs";
import path from "path";
import https from "https";

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

    const token = getTokenFromFile();
    const guild = token ? await fetchGuildName(guildId, token) : { name: "Server", icon: null };

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guild.name} guildIcon={guild.icon} />
            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <ModerationSettings guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
