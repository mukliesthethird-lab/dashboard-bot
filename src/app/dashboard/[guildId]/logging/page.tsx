import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import GuildSidebar from "@/components/GuildSidebar";
import LoggingSettings from "@/components/LoggingSettings";

interface PageProps {
    params: Promise<{ guildId: string }>;
}

async function getGuildInfo(guildId: string, accessToken: string) {
    try {
        const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: "no-store",
        });
        if (!res.ok) return null;
        const guilds = await res.json();
        return guilds.find((g: any) => g.id === guildId) || null;
    } catch {
        return null;
    }
}

export default async function LoggingPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
        redirect("/");
    }

    const { guildId } = await params;
    const guild = await getGuildInfo(guildId, session.accessToken);

    if (!guild) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen">
            <GuildSidebar
                guildId={guildId}
                guildName={guild.name}
                guildIcon={guild.icon}
            />

            <main className="lg:ml-72 pt-36 lg:pt-24 p-4 md:p-8">
                <div className="max-w-5xl mx-auto">
                    <LoggingSettings guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
