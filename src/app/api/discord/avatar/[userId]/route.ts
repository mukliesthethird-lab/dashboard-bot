import { NextResponse } from 'next/server';
import { getDiscordToken } from '@/lib/discord-token';

export async function GET(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId;
        const token = getDiscordToken();

        if (!token) {
            return NextResponse.json({ error: 'Discord token not configured' }, { status: 500 });
        }

        // Fetch user from Discord API
        const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${token}`,
                'User-Agent': 'DonPolloDashboard/1.0'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = await response.json();
        
        // Construct avatar URL
        let avatarUrl = '';
        if (user.avatar) {
            const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.${extension}?size=128`;
        } else {
            // Default avatar
            const index = (BigInt(userId) >> 22n) % 6n;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
        }

        return NextResponse.json({ avatarUrl });
    } catch (error: any) {
        console.error('Avatar Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
