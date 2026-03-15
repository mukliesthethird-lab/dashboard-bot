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
        const dmChannel: any = await discordRequest('/users/@me/channels', 'POST', { recipient_id: userId }, discordToken);
        
        if (!dmChannel.id) {
            console.error('Discord DM Channel Error:', dmChannel);
            return NextResponse.json({ 
                error: 'Failed to create DM channel', 
                details: dmChannel,
                userId: userId
            }, { status: 500 });
        }

        // 3. Send the message to the DM channel
        const result: any = await discordRequest(`/channels/${dmChannel.id}/messages`, 'POST', {
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
        }, discordToken);

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

function discordRequest(path: string, method: string, body: any, token: string) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(body);
        const req = https.request({
            hostname: 'discord.com',
            port: 443,
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': bodyStr.length,
                'User-Agent': 'DonPolloDashboard/1.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}
