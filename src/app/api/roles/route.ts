import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import https from 'https';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';



function fetchDiscordAPI(apiPath: string, token: string, method = 'GET', body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : undefined;
        const req = https.request({
            hostname: 'discord.com',
            path: `/api/v10${apiPath}`,
            method,
            headers: {
                'Authorization': `Bot ${token}`,
                'User-Agent': 'DonPolloBot/1.0',
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch {
                        resolve({});
                    }
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode} - ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function buildDiscordEmbed(embed: any, reactions: any[], roles: any[]) {
    // Replace ${reactionroles} with actual list
    let description = embed.description || '';
    if (description.includes('${reactionroles}')) {
        const rolesList = reactions.map(r => {
            const role = roles.find((ro: any) => ro.id === r.role_id);
            return `${r.emoji} - ${role?.name || 'Unknown Role'}`;
        }).join('\n');
        description = description.replace('${reactionroles}', rolesList);
    }

    const discordEmbed: any = {};
    if (embed.title) discordEmbed.title = embed.title;
    if (description) discordEmbed.description = description;
    if (embed.color) discordEmbed.color = parseInt(embed.color.replace('#', ''), 16);
    if (embed.thumbnail_url && embed.thumbnail_url.startsWith('http')) discordEmbed.thumbnail = { url: embed.thumbnail_url };
    if (embed.image_url && embed.image_url.startsWith('http')) discordEmbed.image = { url: embed.image_url };

    if (embed.footer_text) {
        discordEmbed.footer = { text: embed.footer_text };
        if (embed.footer_icon_url && embed.footer_icon_url.startsWith('http')) {
            discordEmbed.footer.icon_url = embed.footer_icon_url;
        }
    }

    if (embed.author_name) {
        discordEmbed.author = { name: embed.author_name };
        if (embed.author_icon_url && embed.author_icon_url.startsWith('http')) {
            discordEmbed.author.icon_url = embed.author_icon_url;
        }
    }

    if (embed.fields && Array.isArray(embed.fields)) {
        discordEmbed.fields = embed.fields.map((f: any) => ({
            name: f.name || 'Field',
            value: f.value || 'Value',
            inline: !!f.inline
        })).slice(0, 25); // Limit 25 fields
    }

    return discordEmbed;
}

function parseEmoji(emojiStr: string) {
    if (!emojiStr) return undefined;

    // Check for custom emoji format <:name:id> or <a:name:id>
    const customMatch = emojiStr.match(/<(a?):(\w+):(\d+)>/);
    if (customMatch) {
        const [_, animated, name, id] = customMatch;
        return {
            name: name,
            id: id,
            animated: !!animated
        };
    }

    // Standard unicode emoji
    return { name: emojiStr };
}

function buildDiscordComponents(rows: any[]) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) return [];

    return rows.map(row => ({
        type: 1, // Action Row
        components: row.map((comp: any) => {
            if (comp.type === 2) {
                // Button
                const btn: any = {
                    type: 2,
                    style: comp.style || 1,
                    label: comp.label || 'Button',
                };
                if (comp.emoji) btn.emoji = parseEmoji(comp.emoji);
                if (comp.style === 5) {
                    btn.url = comp.url || 'https://discord.com';
                } else {
                    btn.custom_id = comp.custom_id || `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
                return btn;
            } else if (comp.type === 3) {
                // Select Menu - validate and filter options
                const validOptions = (comp.options || [])
                    .filter((opt: any) => opt.label && opt.label.trim()) // Must have label
                    .map((opt: any, idx: number) => ({
                        label: opt.label.substring(0, 100), // Max 100 chars
                        value: (opt.value && opt.value.trim()) ? opt.value.substring(0, 100) : `option_${idx}_${Date.now()}`, // Auto-generate if empty
                        description: opt.description ? opt.description.substring(0, 100) : undefined,
                        emoji: opt.emoji ? parseEmoji(opt.emoji) : undefined
                    }));

                // Skip select menu if no valid options
                if (validOptions.length === 0) {
                    return null;
                }

                return {
                    type: 3, // String Select
                    custom_id: comp.custom_id || `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    options: validOptions,
                    placeholder: comp.placeholder || 'Select an option',
                    min_values: comp.min_values || 1,
                    max_values: Math.min(comp.max_values || 1, validOptions.length), // max_values can't exceed options count
                };
            }
            return null;
        }).filter(Boolean)
    }));
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const token = getDiscordToken();

        if (action === 'channels') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const channels = await fetchDiscordAPI(`/guilds/${guildId}/channels`, token);
            // Return both Text (0) and Voice (2) channels
            const validChannels = (channels || []).filter((c: any) => c.type === 0 || c.type === 2);
            return NextResponse.json(validChannels.map((c: any) => ({
                id: c.id, name: c.name, type: c.type, position: c.position
            })).sort((a: any, b: any) => a.position - b.position));
        }

        if (action === 'roles') {
            if (!token) return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            const roles = await fetchDiscordAPI(`/guilds/${guildId}/roles`, token);
            return NextResponse.json((roles || [])
                .filter((r: any) => r.name !== '@everyone' && !r.managed)
                .map((r: any) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
                .sort((a: any, b: any) => b.position - a.position));
        }

        if (action === 'messages') {
            const [rows]: any = await pool.query(
                'SELECT * FROM reaction_role_messages WHERE guild_id = ? ORDER BY created_at DESC',
                [guildId]
            );
            return NextResponse.json(rows.map((r: any) => ({
                ...r,
                embeds: JSON.parse(r.embeds || '[]'),
                reactions: JSON.parse(r.reactions || '[]'),
                component_rows: JSON.parse(r.component_rows || '[]')
            })));
        }

        // Get roles settings
        const [rows]: any = await pool.query(
            'SELECT * FROM roles_settings WHERE guild_id = ?',
            [guildId]
        );

        if (rows.length === 0) {
            return NextResponse.json({
                guild_id: guildId,
                join_roles_enabled: false,
                join_roles: [],
                wait_for_screening: true,
                delay_assignment: false,
                delay_seconds: 0,
                bot_roles: [],
                reaction_roles_enabled: false,
                auto_add_reactions: true,
                auto_remove_reactions: false
            });
        }

        const settings = rows[0];
        return NextResponse.json({
            ...settings,
            join_roles: JSON.parse(settings.join_roles || '[]'),
            bot_roles: JSON.parse(settings.bot_roles || '[]')
        });
    } catch (error: any) {
        console.error('Roles API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'save_settings') {
            const {
                guild_id,
                join_roles_enabled,
                join_roles,
                wait_for_screening,
                delay_assignment,
                delay_seconds,
                bot_roles,
                reaction_roles_enabled,
                auto_add_reactions,
                auto_remove_reactions
            } = body;

            if (!guild_id) {
                return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
            }

            await pool.query(`
                INSERT INTO roles_settings 
                (guild_id, join_roles_enabled, join_roles, wait_for_screening, delay_assignment, 
                 delay_seconds, bot_roles, reaction_roles_enabled, auto_add_reactions, auto_remove_reactions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    join_roles_enabled = VALUES(join_roles_enabled),
                    join_roles = VALUES(join_roles),
                    wait_for_screening = VALUES(wait_for_screening),
                    delay_assignment = VALUES(delay_assignment),
                    delay_seconds = VALUES(delay_seconds),
                    bot_roles = VALUES(bot_roles),
                    reaction_roles_enabled = VALUES(reaction_roles_enabled),
                    auto_add_reactions = VALUES(auto_add_reactions),
                    auto_remove_reactions = VALUES(auto_remove_reactions),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                guild_id,
                join_roles_enabled ? 1 : 0,
                JSON.stringify(join_roles || []),
                wait_for_screening ? 1 : 0,
                delay_assignment ? 1 : 0,
                delay_seconds || 0,
                JSON.stringify(bot_roles || []),
                reaction_roles_enabled ? 1 : 0,
                auto_add_reactions ? 1 : 0,
                auto_remove_reactions ? 1 : 0
            ]);

            return NextResponse.json({ success: true, message: 'Settings saved!' });
        }

        if (action === 'send_message') {
            const { guild_id, channel_id, message_content, embeds, reactions, component_rows } = body;
            const token = getDiscordToken();

            if (!token) {
                return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
            }

            // Get roles for building embed
            const rolesData = await fetchDiscordAPI(`/guilds/${guild_id}/roles`, token);

            // Build message payload
            const messagePayload: any = {};
            if (message_content) messagePayload.content = message_content;
            if (embeds && embeds.length > 0) {
                messagePayload.embeds = embeds.map((e: any) => buildDiscordEmbed(e, reactions, rolesData));
            }
            if (component_rows && component_rows.length > 0) {
                messagePayload.components = buildDiscordComponents(component_rows);
            }

            // Send message to channel
            const sentMessage = await fetchDiscordAPI(
                `/channels/${channel_id}/messages`,
                token,
                'POST',
                messagePayload
            );

            if (!sentMessage.id) {
                return NextResponse.json({ error: 'Failed to send message: ' + JSON.stringify(sentMessage) }, { status: 500 });
            }

            // ADD REACTIONS LOGIC REMOVED/UPDATED TO BE OPTIONAL IF COMPONENTS EXIST
            // For now, keep existing logic but warn if mixed? 
            // Actually, keep reactions logic as is, they can coexist.
            if (reactions && reactions.length > 0) {
                for (const reaction of reactions) {
                    try {
                        const encodedEmoji = reaction.emoji.includes(':') ? reaction.emoji : encodeURIComponent(reaction.emoji);
                        await fetchDiscordAPI(`/channels/${channel_id}/messages/${sentMessage.id}/reactions/${encodedEmoji}/@me`, token, 'PUT');
                        await new Promise(r => setTimeout(r, 300));
                    } catch (e) { console.error('Failed to add reaction:', e); }
                }
            }

            // Save to database
            await pool.query(`
                INSERT INTO reaction_role_messages (guild_id, channel_id, message_id, message_content, embeds, reactions, component_rows)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                guild_id,
                channel_id,
                sentMessage.id,
                message_content || '',
                JSON.stringify(embeds || []),
                JSON.stringify(reactions || []),
                JSON.stringify(component_rows || [])
            ]);

            return NextResponse.json({ success: true, message: 'Message sent!', message_id: sentMessage.id });
        }

        if (action === 'update_message') {
            const { id, channel_id, message_id, message_content, embeds, reactions, component_rows } = body;
            const token = getDiscordToken();

            // Get message details from DB if not provided
            let msgChannelId = channel_id;
            let msgMessageId = message_id;

            if (!msgChannelId || !msgMessageId) {
                const [rows]: any = await pool.query('SELECT channel_id, message_id FROM reaction_role_messages WHERE id = ?', [id]);
                if (rows.length > 0) {
                    msgChannelId = rows[0].channel_id;
                    msgMessageId = rows[0].message_id;
                }
            }

            if (token && msgMessageId) {
                // Get roles for building embed
                const [settingsRows]: any = await pool.query('SELECT guild_id FROM reaction_role_messages WHERE id = ?', [id]);
                if (settingsRows.length > 0) {
                    const guildId = settingsRows[0].guild_id;
                    const rolesData = await fetchDiscordAPI(`/guilds/${guildId}/roles`, token);

                    // Update Discord message
                    const messagePayload: any = {};
                    if (message_content !== undefined) messagePayload.content = message_content || '';
                    if (embeds && embeds.length > 0) {
                        messagePayload.embeds = embeds.map((e: any) => buildDiscordEmbed(e, reactions, rolesData));
                    }
                    if (component_rows && component_rows.length > 0) {
                        messagePayload.components = buildDiscordComponents(component_rows);
                    } else {
                        // If explicit empty array sent, clear components
                        messagePayload.components = [];
                    }

                    try {
                        await fetchDiscordAPI(
                            `/channels/${msgChannelId}/messages/${msgMessageId}`,
                            token,
                            'PATCH',
                            messagePayload
                        );
                    } catch (e) {
                        console.error('Failed to update Discord message:', e);
                    }
                }
            }

            // Update database
            await pool.query(
                'UPDATE reaction_role_messages SET message_content = ?, embeds = ?, reactions = ?, component_rows = ? WHERE id = ?',
                [message_content || '', JSON.stringify(embeds || []), JSON.stringify(reactions || []), JSON.stringify(component_rows || []), id]
            );

            return NextResponse.json({ success: true, message: 'Message updated!' });
        }

        if (action === 'delete_message') {
            const { id } = body;
            const token = getDiscordToken();

            // Get message details
            const [rows]: any = await pool.query('SELECT channel_id, message_id FROM reaction_role_messages WHERE id = ?', [id]);

            if (rows.length > 0 && token && rows[0].message_id) {
                try {
                    await fetchDiscordAPI(
                        `/channels/${rows[0].channel_id}/messages/${rows[0].message_id}`,
                        token,
                        'DELETE'
                    );
                } catch (e) {
                    console.error('Failed to delete Discord message:', e);
                }
            }

            await pool.query('DELETE FROM reaction_role_messages WHERE id = ?', [id]);

            return NextResponse.json({ success: true, message: 'Message deleted!' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Roles API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
