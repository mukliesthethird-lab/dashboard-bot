import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';

async function sendDiscordRequest(method: 'POST' | 'PATCH' | 'GET' | 'DELETE', path: string, body: any) {
    const token = getDiscordToken();
    if (!token) throw new Error('Bot token not configured');

    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(body);
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'DonPolloDashboard/1.0',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(resData ? JSON.parse(resData) : { success: true });
                    } catch (e) {
                        resolve({ success: true });
                    }
                } else {
                    reject(new Error(`Discord API Error: ${res.statusCode} ${resData}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(bodyStr);
        req.end();
    });
}

// GET - Get panels for a form
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const formId = searchParams.get('form_id');
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        let query = 'SELECT * FROM form_panels WHERE guild_id = ?';
        const params: any[] = [guildId];

        if (formId) {
            query += ' AND form_id = ?';
            params.push(formId);
        }

        query += ' ORDER BY created_at DESC';

        const [rows]: any = await pool.query(query, params);

        // Parse JSON fields
        const panels = rows.map((row: any) => ({
            ...row,
            embed_data: typeof row.embed_data === 'string' ? JSON.parse(row.embed_data) : row.embed_data,
            components: typeof row.components === 'string' ? JSON.parse(row.components) : row.components || [],
        }));

        return NextResponse.json(panels);
    } catch (error: any) {
        console.error('Form Panels API GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create or update a panel
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            id,
            form_id,
            guild_id,
            channel_id,
            message_id,
            message_content,
            embed_data,
            components,
            webhook_name,
            webhook_avatar_url,
            is_sticky
        } = body;

        if (!form_id || !guild_id || !channel_id) {
            return NextResponse.json({ error: 'Missing required fields: form_id, guild_id, channel_id' }, { status: 400 });
        }

        // Prepare Discord payload
        const discordPayload = {
            content: message_content || '',
            embeds: embed_data ? [embed_data] : [],
            components: components || []
        };

        if (id) {
            // Update existing panel
            // First, try to update the message on Discord if we have a message_id
            let newMessageId = message_id;
            
            if (message_id && channel_id) {
                try {
                    await sendDiscordRequest('PATCH', `/channels/${channel_id}/messages/${message_id}`, discordPayload);
                } catch (err: any) {
                    console.error('Failed to update Discord message, sending new one:', err.message);
                    // If patch fails (e.g. message deleted), send a new one
                    const discordRes: any = await sendDiscordRequest('POST', `/channels/${channel_id}/messages`, discordPayload);
                    newMessageId = discordRes.id;
                }
            } else {
                // No message_id, send a new one
                const discordRes: any = await sendDiscordRequest('POST', `/channels/${channel_id}/messages`, discordPayload);
                newMessageId = discordRes.id;
            }

            await pool.query(`
                UPDATE form_panels SET
                    channel_id = ?,
                    message_id = ?,
                    message_content = ?,
                    embed_data = ?,
                    components = ?,
                    webhook_name = ?,
                    webhook_avatar_url = ?,
                    is_sticky = ?
                WHERE id = ? AND guild_id = ?
            `, [
                channel_id,
                newMessageId || null,
                message_content || '',
                embed_data ? JSON.stringify(embed_data) : null,
                JSON.stringify(components || []),
                webhook_name || null,
                webhook_avatar_url || null,
                is_sticky ? 1 : 0,
                id,
                guild_id
            ]);

            return NextResponse.json({ success: true, message: 'Panel updated and synced with Discord!', id });
        } else {
            // Create new panel
            // 1. Send to Discord first
            const discordRes: any = await sendDiscordRequest('POST', `/channels/${channel_id}/messages`, discordPayload);
            const newMessageId = discordRes.id;

            // 2. Save to database
            const [result]: any = await pool.query(`
                INSERT INTO form_panels (
                    form_id, guild_id, channel_id, message_id,
                    message_content, embed_data, components,
                    webhook_name, webhook_avatar_url, is_sticky
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                form_id,
                guild_id,
                channel_id,
                newMessageId || null,
                message_content || '',
                embed_data ? JSON.stringify(embed_data) : null,
                JSON.stringify(components || []),
                webhook_name || null,
                webhook_avatar_url || null,
                is_sticky ? 1 : 0
            ]);

            return NextResponse.json({ success: true, message: 'Panel created and sent to Discord!', id: result.insertId });
        }
    } catch (error: any) {
        console.error('Form Panels API POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a panel
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const guildId = searchParams.get('guild_id');

        if (!id || !guildId) {
            return NextResponse.json({ error: 'id and guild_id are required' }, { status: 400 });
        }

        await pool.query(
            'DELETE FROM form_panels WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );

        return NextResponse.json({ success: true, message: 'Panel deleted successfully!' });
    } catch (error: any) {
        console.error('Form Panels API DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
