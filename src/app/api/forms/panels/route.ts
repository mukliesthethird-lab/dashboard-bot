import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

        if (id) {
            // Update existing panel
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
                message_id || null,
                message_content || '',
                embed_data ? JSON.stringify(embed_data) : null,
                JSON.stringify(components || []),
                webhook_name || null,
                webhook_avatar_url || null,
                is_sticky ? 1 : 0,
                id,
                guild_id
            ]);

            return NextResponse.json({ success: true, message: 'Panel updated successfully!', id });
        } else {
            // Create new panel
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
                message_id || null,
                message_content || '',
                embed_data ? JSON.stringify(embed_data) : null,
                JSON.stringify(components || []),
                webhook_name || null,
                webhook_avatar_url || null,
                is_sticky ? 1 : 0
            ]);

            return NextResponse.json({ success: true, message: 'Panel created successfully!', id: result.insertId });
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
