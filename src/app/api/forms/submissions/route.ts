import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDiscordToken } from '@/lib/discord-token';

export const dynamic = 'force-dynamic';

// GET - List submissions for a form
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const formId = searchParams.get('formId') || searchParams.get('form_id');
        const guildId = searchParams.get('guildId') || searchParams.get('guild_id');
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

        return NextResponse.json({ submissions, total: submissions.length });
    } catch (error: any) {
        console.error('Form Submissions API GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper for Discord DM notifications
async function sendStatusDM(userId: string, status: string, reason: string | null, reviewer: string) {
    const token = getDiscordToken();
    if (!token) return;

    try {
        // Create DM
        const dmChannelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_id: userId })
        });
        const dmChannel = await dmChannelRes.json();
        if (!dmChannel.id) return;

        // Send Embed
        await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: status === 'approved' ? '✅ Submission Approved' : '❌ Submission Denied',
                    description: status === 'approved' 
                        ? `Congratulations! Your form submission has been **approved**.`
                        : `We regret to inform you that your form submission has been **denied**.`,
                    color: status === 'approved' ? 0x248046 : 0xDA373C,
                    fields: [
                        ...(reason ? [{ name: "Reason", value: reason }] : []),
                        { name: "Reviewed By", value: reviewer, inline: true }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: { text: "Don Pollo Dashboard" }
                }]
            })
        });
    } catch (err) {
        console.error('Failed to send status DM:', err);
    }
}

// PATCH - Update submission status (approve/deny) - Supports single or bulk
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ids, guild_id, status, reviewed_by, reason } = body;
        const targetIds = ids || (id ? [id] : []);

        if (targetIds.length === 0 || !guild_id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const reviewerName = reviewed_by || session.user.name || 'Admin';

        // 1. Get user_ids for notifications
        const [users]: any = await pool.query(
            'SELECT user_id FROM form_submissions WHERE id IN (?) AND guild_id = ?',
            [targetIds, guild_id]
        );

        // 2. Update status
        await pool.query(`
            UPDATE form_submissions SET
                status = ?,
                reviewed_by = ?,
                reason = ?,
                reviewed_at = NOW()
            WHERE id IN (?) AND guild_id = ?
        `, [status, reviewerName, reason || null, targetIds, guild_id]);

        // 3. Send notifications asynchronously
        if (users && users.length > 0) {
            users.forEach((u: any) => sendStatusDM(u.user_id, status, reason, reviewerName));
        }

        // Log the action
        await pool.query(
            'INSERT INTO dashboard_logs (guild_id, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            [guild_id, 'admin', reviewerName, `Forms: Submission ${status}`, `Target IDs: ${targetIds.join(', ')}`]
        ).catch(() => { });

        return NextResponse.json({ success: true, message: `Successfully updated ${targetIds.length} submissions!` });
    } catch (error: any) {
        console.error('Form Submissions API PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete submissions - Supports single or bulk
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ids, guild_id } = body;
        const targetIds = ids || (id ? [id] : []);

        if (targetIds.length === 0 || !guild_id) {
            return NextResponse.json({ error: 'id(s) and guild_id are required' }, { status: 400 });
        }

        await pool.query(
            'DELETE FROM form_submissions WHERE id IN (?) AND guild_id = ?',
            [targetIds, guild_id]
        );

        return NextResponse.json({ success: true, message: `Successfully deleted ${targetIds.length} submissions!` });
    } catch (error: any) {
        console.error('Form Submissions API DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
