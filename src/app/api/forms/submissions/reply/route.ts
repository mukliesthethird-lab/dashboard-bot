import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { submission_id, guild_id, message } = body;

        if (!submission_id || !guild_id || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get the user_id from the submission
        const [rows]: any = await pool.query(
            'SELECT user_id, username FROM form_submissions WHERE id = ? AND guild_id = ?',
            [submission_id, guild_id]
        );

        if (!rows || rows.length === 0) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const userId = rows[0].user_id;
        const discordToken = getDiscordToken();

        if (!discordToken) {
            return NextResponse.json({ error: 'Discord token not configured' }, { status: 500 });
        }

        // 2. Create a DM channel with the user
        const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${discordToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'DonPolloDashboard/1.0'
            },
            body: JSON.stringify({ recipient_id: userId })
        });
        
        const dmChannel = await dmRes.json();
        
        if (!dmChannel.id) {
            console.error('Discord DM Channel Error:', dmChannel);
            return NextResponse.json({ 
                error: 'Failed to create DM channel', 
                details: dmChannel,
                userId: userId
            }, { status: 500 });
        }

        // 3. Send the message to the DM channel
        const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${discordToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'DonPolloDashboard/1.0'
            },
            body: JSON.stringify({
                embeds: [
                    {
                        title: "📨 New Reply from Staff",
                        description: message,
                        color: 0x5865F2,
                        fields: [
                            {
                                name: "Sent By",
                                value: session.user.name || 'Administrator',
                                inline: true
                            }
                        ],
                        footer: {
                            text: "Don Pollo Dashboard"
                        },
                        timestamp: new Date().toISOString()
                    }
                ]
            })
        });

        const result = await msgRes.json();

        if (!result.id) {
            return NextResponse.json({ error: 'Failed to send DM message', details: result }, { status: 500 });
        }

        // 4. Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', session.user.name || 'Admin', 'Forms: Replied to Submission', `User: ${rows[0].username} (#${submission_id})`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: 'Reply sent successfully via DM!' });

    } catch (error: any) {
        console.error('Reply API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
