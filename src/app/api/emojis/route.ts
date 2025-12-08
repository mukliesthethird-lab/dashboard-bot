import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get("guild_id");

    if (!guildId) {
        return NextResponse.json({ error: "Missing guild_id" }, { status: 400 });
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
            headers: {
                Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch emojis: ${response.status} ${response.statusText}`);
            return NextResponse.json({ emojis: [] }, { status: 200 }); // Return empty on error to avoid breaking UI
        }

        const emojis = await response.json();
        return NextResponse.json(emojis);
    } catch (error) {
        console.error("Error fetching emojis:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
