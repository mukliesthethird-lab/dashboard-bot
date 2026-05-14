import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ModerationReports from "@/components/ModerationReports";
import GuildSidebar from "@/components/GuildSidebar";

interface PageProps {
    params: Promise<{ guildId: string }>;
}

async function fetchGuildName(guildId: string, accessToken: string) {
    try {
        const response = await fetch(`https://discord.com/api/users/@me/guilds`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) return null;

        const guilds = await response.json();
        const guild = guilds.find((g: any) => g.id === guildId);
        return guild ? { name: guild.name, icon: guild.icon } : null;
    } catch (error) {
        console.error("Error fetching guild:", error);
        return null;
    }
}

export default async function ModerationReportsPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/");
    }

    const { guildId } = await params;

    const guildDetails = await fetchGuildName(guildId, session.accessToken as string);

    if (!guildDetails) {
        return (
            <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] font-bold">
                Guild not found or access denied.
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <GuildSidebar guildId={guildId} guildName={guildDetails.name} guildIcon={guildDetails.icon} />
            <main className="lg:ml-[272px] pt-32 lg:pt-20 p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <ModerationReports guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
