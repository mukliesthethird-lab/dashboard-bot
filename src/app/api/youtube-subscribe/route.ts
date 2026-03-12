import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

import { subscribeToWebSub, unsubscribeFromWebSub } from '@/lib/youtube';

const CALLBACK_URL = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/youtube-webhook`
    : 'https://dashboard-bot-virid.vercel.app/api/youtube-webhook';

/**
 * YouTube PubSubHubbub Subscription Management
 * 
 * POST: Subscribe to a YouTube channel
 * DELETE: Unsubscribe from a YouTube channel
 * GET: Get subscription status
 */

// GET: Check subscription status for a channel
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channel_id');
    const action = searchParams.get('action');

    if (action === 'list') {
        // List all active subscriptions
        const [rows]: any = await pool.query(
            'SELECT * FROM youtube_subscriptions WHERE status = ? ORDER BY subscribed_at DESC',
            ['active']
        );
        return NextResponse.json(rows);
    }

    if (action === 'events') {
        // Get unprocessed events
        const limit = parseInt(searchParams.get('limit') || '50');
        const [rows]: any = await pool.query(
            'SELECT * FROM youtube_live_events WHERE is_processed = FALSE ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        return NextResponse.json(rows);
    }

    if (!channelId) {
        return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
    }

    const [rows]: any = await pool.query(
        'SELECT * FROM youtube_subscriptions WHERE channel_id = ?',
        [channelId]
    );

    if (rows.length === 0) {
        return NextResponse.json({ status: 'not_subscribed', channelId });
    }

    return NextResponse.json(rows[0]);
}

// POST: Subscribe to a YouTube channel
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channel_id, action } = body;

        if (!channel_id) {
            return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
        }

        // Mark event as processed (for bot usage)
        if (action === 'mark_processed') {
            const { video_id } = body;
            await pool.query(
                'UPDATE youtube_live_events SET is_processed = TRUE, processed_at = NOW() WHERE video_id = ?',
                [video_id]
            );
            return NextResponse.json({ success: true, message: 'Event marked as processed' });
        }

        // Use shared utility for subscription
        const success = await subscribeToWebSub(channel_id);

        if (success) {
            console.log('[YouTube Subscribe] Subscription request sent successfully');
            return NextResponse.json({
                success: true,
                message: 'Subscription request sent. Waiting for verification.',
                channel_id,
                callback_url: CALLBACK_URL
            });
        } else {
            return NextResponse.json({
                error: 'Subscription failed',
                details: 'Check server logs for hub error'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[YouTube Subscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Unsubscribe from a YouTube channel
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { channel_id } = body;

        if (!channel_id) {
            return NextResponse.json({ error: 'channel_id is required' }, { status: 400 });
        }

        // Use shared utility for unsubscription
        const success = await unsubscribeFromWebSub(channel_id);

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Unsubscription request sent',
                channel_id
            });
        } else {
            return NextResponse.json({
                error: 'Unsubscription failed',
                details: 'Check server logs for hub error'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[YouTube Unsubscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
