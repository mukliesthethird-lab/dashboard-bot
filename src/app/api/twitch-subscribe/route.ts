import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
const TWITCH_WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET || 'your-webhook-secret-here';
const CALLBACK_URL = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/twitch-webhook`
    : 'https://dashboard-bot-virid.vercel.app/api/twitch-webhook';

/**
 * Twitch EventSub Subscription Management
 * 
 * POST: Subscribe to stream.online events
 * DELETE: Unsubscribe
 * GET: List subscriptions
 */

// Cache for app access token
let appAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAppAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (appAccessToken && Date.now() < tokenExpiresAt) {
        return appAccessToken;
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[Twitch] Token error:', error);
        throw new Error('Failed to get Twitch app access token');
    }

    const data = await response.json();
    appAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    return appAccessToken!;
}

// GET: List subscriptions or get events
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'events') {
        // Get unprocessed events
        const limit = parseInt(searchParams.get('limit') || '50');
        const [rows]: any = await pool.query(
            'SELECT * FROM twitch_live_events WHERE is_processed = FALSE ORDER BY created_at DESC LIMIT ?',
            [limit]
        );
        return NextResponse.json(rows);
    }

    if (action === 'subscriptions') {
        // Get all subscriptions from database
        const [rows]: any = await pool.query(
            'SELECT * FROM twitch_subscriptions ORDER BY created_at DESC'
        );
        return NextResponse.json(rows);
    }

    // Get user ID from username
    const username = searchParams.get('username');
    if (username) {
        try {
            const token = await getAppAccessToken();
            const response = await fetch(
                `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Client-Id': TWITCH_CLIENT_ID
                    }
                }
            );

            if (!response.ok) {
                return NextResponse.json({ error: 'Failed to fetch user' }, { status: 400 });
            }

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                return NextResponse.json(data.data[0]);
            }
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    return NextResponse.json({
        status: 'ok',
        message: 'Use ?action=events or ?action=subscriptions or ?username=xxx'
    });
}

// POST: Subscribe to stream.online event
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { broadcaster_id, action } = body;

        if (!broadcaster_id) {
            return NextResponse.json({ error: 'broadcaster_id is required' }, { status: 400 });
        }

        // Mark event as processed
        if (action === 'mark_processed') {
            const { event_id } = body;
            await pool.query(
                'UPDATE twitch_live_events SET is_processed = TRUE, processed_at = NOW() WHERE id = ?',
                [event_id]
            );
            return NextResponse.json({ success: true });
        }

        if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
            return NextResponse.json({
                error: 'Twitch credentials not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET.'
            }, { status: 500 });
        }

        const token = await getAppAccessToken();

        // Subscribe to stream.online event
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Client-Id': TWITCH_CLIENT_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'stream.online',
                version: '1',
                condition: {
                    broadcaster_user_id: broadcaster_id
                },
                transport: {
                    method: 'webhook',
                    callback: CALLBACK_URL,
                    secret: TWITCH_WEBHOOK_SECRET
                }
            })
        });

        const resultData = await response.json();

        if (response.ok) {
            const subscription = resultData.data?.[0];
            if (subscription) {
                // Store in database
                await pool.query(`
                    INSERT INTO twitch_subscriptions (subscription_id, broadcaster_id, subscription_type, status)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP
                `, [
                    subscription.id,
                    broadcaster_id,
                    'stream.online',
                    subscription.status
                ]);
            }

            console.log('[Twitch] Subscription created for broadcaster:', broadcaster_id);
            return NextResponse.json({
                success: true,
                message: 'Subscription created',
                subscription: subscription
            });
        } else {
            console.error('[Twitch] Subscription error:', resultData);
            return NextResponse.json({
                error: 'Subscription failed',
                details: resultData
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('[Twitch Subscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Unsubscribe from events
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { subscription_id } = body;

        if (!subscription_id) {
            return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
        }

        const token = await getAppAccessToken();

        const response = await fetch(
            `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscription_id}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Client-Id': TWITCH_CLIENT_ID
                }
            }
        );

        if (response.ok || response.status === 204) {
            await pool.query(
                'DELETE FROM twitch_subscriptions WHERE subscription_id = ?',
                [subscription_id]
            );

            return NextResponse.json({ success: true, message: 'Unsubscribed' });
        } else {
            const error = await response.text();
            return NextResponse.json({ error: 'Unsubscribe failed', details: error }, { status: 400 });
        }

    } catch (error: any) {
        console.error('[Twitch Unsubscribe] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
