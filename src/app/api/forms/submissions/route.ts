import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List submissions for a form
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const formId = searchParams.get('form_id');
        const guildId = searchParams.get('guild_id');
        const status = searchParams.get('status');

        if (!guildId) {
            return NextResponse.json({ error: 'guild_id is required' }, { status: 400 });
        }

        let query = 'SELECT * FROM form_submissions WHERE guild_id = ?';
        const params: any[] = [guildId];

        if (formId) {
            query += ' AND form_id = ?';
            params.push(formId);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY submitted_at DESC';

        const [rows]: any = await pool.query(query, params);

        // Parse JSON fields
        const submissions = rows.map((row: any) => ({
            ...row,
            responses: typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses || {},
        }));

        return NextResponse.json(submissions);
    } catch (error: any) {
        console.error('Form Submissions API GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - Update submission status (approve/deny)
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, guild_id, status, reviewed_by } = body;

        if (!id || !guild_id || !status) {
            return NextResponse.json({ error: 'Missing required fields: id, guild_id, status' }, { status: 400 });
        }

        if (!['pending', 'approved', 'denied'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Must be: pending, approved, or denied' }, { status: 400 });
        }

        await pool.query(`
            UPDATE form_submissions SET
                status = ?,
                reviewed_by = ?,
                reviewed_at = NOW()
            WHERE id = ? AND guild_id = ?
        `, [status, reviewed_by || null, id, guild_id]);

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', session.user.name || 'Admin', `Forms: Submission ${status}`, `Submission ID: ${id}`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: `Submission ${status} successfully!` });
    } catch (error: any) {
        console.error('Form Submissions API PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a submission
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
            'DELETE FROM form_submissions WHERE id = ? AND guild_id = ?',
            [id, guildId]
        );

        return NextResponse.json({ success: true, message: 'Submission deleted successfully!' });
    } catch (error: any) {
        console.error('Form Submissions API DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
