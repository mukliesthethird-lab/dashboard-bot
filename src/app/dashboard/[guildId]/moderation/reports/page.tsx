import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ModerationReports from "@/components/ModerationReports";
import GuildSidebar from "@/components/GuildSidebar";

interface PageProps {
    params: {
        guildId: string;
    };
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

    const { guildId } = params;

    // Fetch guild details for sidebar title
    const guildDetails = await fetchGuildName(guildId, session.accessToken as string);

    // If guild not found or user not in it
    if (!guildDetails) {
        return (
            <div className="flex h-screen items-center justify-center bg-stone-50 text-stone-600 font-bold">
                Guild not found or access denied.
            </div>
        );
    }

    return (
        <div className="flex bg-stone-50 min-h-screen font-sans text-stone-900 selection:bg-amber-100 selection:text-amber-900">
            {/* Sidebar */}
            <GuildSidebar guildId={guildId} guildName={guildDetails.name} guildIcon={guildDetails.icon} />

            {/* Main Content Area */}
            <main className="flex-1 ml-72 p-8 overflow-y-auto h-screen">
                <div className="max-w-6xl mx-auto">
                    <ModerationReports guildId={guildId} />
                </div>
            </main>
        </div>
    );
}
