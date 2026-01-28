import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all forms for a guild
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const guildId = searchParams.get('guild_id');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        const [rows]: any = await pool.query(`
            SELECT f.*, 
                   COUNT(DISTINCT fs.id) as submission_count,
                   MAX(fs.submitted_at) as last_submission
            FROM forms f
            LEFT JOIN form_submissions fs ON f.id = fs.form_id
            WHERE f.guild_id = ?
            GROUP BY f.id
            ORDER BY f.created_at DESC
        `, [guildId]);

        // Parse JSON fields
        const forms = rows.map((row: any) => ({
            ...row,
            pages: typeof row.pages === 'string' ? JSON.parse(row.pages) : row.pages || [],
            ping_roles: typeof row.ping_roles === 'string' ? JSON.parse(row.ping_roles) : row.ping_roles || [],
            add_roles_on_submit: typeof row.add_roles_on_submit === 'string' ? JSON.parse(row.add_roles_on_submit) : row.add_roles_on_submit || [],
            remove_roles_on_submit: typeof row.remove_roles_on_submit === 'string' ? JSON.parse(row.remove_roles_on_submit) : row.remove_roles_on_submit || [],
        }));

        return NextResponse.json(forms);
    } catch (error: any) {
        console.error('Forms API GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create or update a form
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
            title,
            description,
            is_enabled,
            submission_type,
            submission_channel_id,
            ping_roles,
            add_roles_on_submit,
            remove_roles_on_submit,
            cooldown_seconds,
            max_submissions_per_user,
            pages
        } = body;

        if (!guild_id || !name || !title) {
            return NextResponse.json({ error: 'Missing required fields: guild_id, name, title' }, { status: 400 });
        }

        if (id) {
            // Update existing form
            await pool.query(`
                UPDATE forms SET
                    name = ?,
                    title = ?,
                    description = ?,
                    is_enabled = ?,
                    submission_type = ?,
                    submission_channel_id = ?,
                    ping_roles = ?,
                    add_roles_on_submit = ?,
                    remove_roles_on_submit = ?,
                    cooldown_seconds = ?,
                    max_submissions_per_user = ?,
                    pages = ?
                WHERE id = ? AND guild_id = ?
            `, [
                name,
                title,
                description || null,
                is_enabled ? 1 : 0,
                submission_type || 'default',
                submission_channel_id || null,
                JSON.stringify(ping_roles || []),
                JSON.stringify(add_roles_on_submit || []),
                JSON.stringify(remove_roles_on_submit || []),
                cooldown_seconds || 0,
                max_submissions_per_user || 0,
                JSON.stringify(pages || []),
                id,
                guild_id
            ]);

            // Log the action
            await pool.query(
                'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                [guild_id, 'admin', session.user.name || 'Admin', 'Forms: Updated', `Updated form: ${name}`]
            ).catch(() => { });

            return NextResponse.json({ success: true, message: 'Form updated successfully!', id });
        } else {
            // Create new form
            const [result]: any = await pool.query(`
                INSERT INTO forms (
                    guild_id, name, title, description, is_enabled,
                    submission_type, submission_channel_id, ping_roles,
                    add_roles_on_submit, remove_roles_on_submit,
                    cooldown_seconds, max_submissions_per_user, pages
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                guild_id,
                name,
                title,
                description || null,
                is_enabled !== false ? 1 : 0,
                submission_type || 'default',
                submission_channel_id || null,
                JSON.stringify(ping_roles || []),
                JSON.stringify(add_roles_on_submit || []),
                JSON.stringify(remove_roles_on_submit || []),
                cooldown_seconds || 0,
                max_submissions_per_user || 0,
                JSON.stringify(pages || [{ id: 'page_1', components: [] }])
            ]);

            // Log the action
            await pool.query(
                'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
                [guild_id, 'admin', session.user.name || 'Admin', 'Forms: Created', `Created form: ${name}`]
            ).catch(() => { });

            return NextResponse.json({ success: true, message: 'Form created successfully!', id: result.insertId });
        }
    } catch (error: any) {
        console.error('Forms API POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a form
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

        // Get form name before deleting for logging
        const [formRows]: any = await pool.query(
            'SELECT name FROM forms WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );
        const formName = formRows[0]?.name || 'Unknown';

        await pool.query(
            'DELETE FROM forms WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guildId, 'admin', session.user.name || 'Admin', 'Forms: Deleted', `Deleted form: ${formName}`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: 'Form deleted successfully!' });
    } catch (error: any) {
        console.error('Forms API DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
