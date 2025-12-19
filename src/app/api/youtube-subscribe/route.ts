import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const YOUTUBE_HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
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

        const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channel_id}`;

        console.log('[YouTube Subscribe] Subscribing to:', { channel_id, topicUrl, callback: CALLBACK_URL });

        // Build form data for PubSubHubbub
        const formData = new URLSearchParams();
        formData.append('hub.callback', CALLBACK_URL);
        formData.append('hub.topic', topicUrl);
        formData.append('hub.verify', 'async');
        formData.append('hub.mode', 'subscribe');
        formData.append('hub.lease_seconds', '432000'); // 5 days

        // Send subscription request to Google's PubSubHubbub hub
        const response = await fetch(YOUTUBE_HUB_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (response.status === 202 || response.status === 204) {
            // Create pending subscription record
            await pool.query(`
                INSERT INTO youtube_subscriptions (channel_id, hub_topic, status)
                VALUES (?, ?, 'pending')
                ON DUPLICATE KEY UPDATE
                    hub_topic = VALUES(hub_topic),
                    status = 'pending',
                    updated_at = CURRENT_TIMESTAMP
            `, [channel_id, topicUrl]);

            console.log('[YouTube Subscribe] Subscription request sent successfully');
            return NextResponse.json({
                success: true,
                message: 'Subscription request sent. Waiting for verification.',
                channel_id,
                callback_url: CALLBACK_URL
            });
        } else {
            const errorText = await response.text();
            console.error('[YouTube Subscribe] Hub returned error:', response.status, errorText);
            return NextResponse.json({
                error: 'Subscription failed',
                status: response.status,
                details: errorText
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

        const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channel_id}`;

        // Build form data for unsubscribe
        const formData = new URLSearchParams();
        formData.append('hub.callback', CALLBACK_URL);
        formData.append('hub.topic', topicUrl);
        formData.append('hub.verify', 'async');
        formData.append('hub.mode', 'unsubscribe');

        const response = await fetch(YOUTUBE_HUB_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (response.status === 202 || response.status === 204) {
            await pool.query(
                'UPDATE youtube_subscriptions SET status = ? WHERE channel_id = ?',
                ['unsubscribed', channel_id]
            );

            return NextResponse.json({
                success: true,
                message: 'Unsubscription request sent',
                channel_id
            });
        } else {
            const errorText = await response.text();
            return NextResponse.json({
                error: 'Unsubscription failed',
                details: errorText
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[YouTube Unsubscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
