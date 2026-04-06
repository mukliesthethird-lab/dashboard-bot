import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const [rows]: any = await pool.query(
            'SELECT * FROM automation_rules WHERE guild_id = ? ORDER BY id DESC',
            [guildId]
        );

        return NextResponse.json(rows);
    } catch (error: any) {
        console.error('Automations API error:', error);
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
        const {
            id,
            guild_id,
            name,
            active,
            trigger_type,
            trigger_value,
            conditions,
            actions
        } = body;

        if (!guild_id) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        if (id) {
            // Update existing rule
            await pool.query(`
                UPDATE automation_rules SET
                    name = ?,
                    active = ?,
                    trigger_type = ?,
                    trigger_value = ?,
                    conditions = ?,
                    actions = ?
                WHERE id = ? AND guild_id = ?
            `, [
                name,
                active ? 1 : 0,
                trigger_type,
                trigger_value || '',
                JSON.stringify(conditions || []),
                JSON.stringify(actions || []),
                id,
                guild_id
            ]);
            console.log(`[Automation Updated] Guild: ${guild_id} | Rule: ${name} (ID: ${id})`);
            return NextResponse.json({ success: true, message: 'Automation rule updated!' });
        } else {
            // Create new rule
            await pool.query(`
                INSERT INTO automation_rules 
                (guild_id, name, active, trigger_type, trigger_value, conditions, actions)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                guild_id,
                name || 'New Rule',
                active ? 1 : 0,
                trigger_type || 'message_contains',
                trigger_value || '',
                JSON.stringify(conditions || []),
                JSON.stringify(actions || [])
            ]);
            console.log(`[Automation Created] Guild: ${guild_id} | Rule: ${name || 'New Rule'}`);
            return NextResponse.json({ success: true, message: 'Automation rule created!' });
        }
    } catch (error: any) {
        console.error('Automations API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

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
            'DELETE FROM automation_rules WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );

        console.log(`[Automation Delete] Guild: ${guildId} | Rule ID: ${id}`);

        return NextResponse.json({ success: true, message: 'Automation rule deleted!' });
    } catch (error: any) {
        console.error('Automations API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
