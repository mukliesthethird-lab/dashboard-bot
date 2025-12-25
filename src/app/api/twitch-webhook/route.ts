import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TWITCH_WEBHOOK_SECRET = process.env.TWITCH_WEBHOOK_SECRET || 'your-webhook-secret-here';

/**
 * Twitch EventSub Webhook Endpoint
 * 
 * Handles:
 * 1. POST with challenge header: Subscription verification
 * 2. POST with notification: Stream online/offline events
 */

// Verify Twitch signature
function verifyTwitchSignature(
    messageId: string,
    timestamp: string,
    body: string,
    signature: string
): boolean {
    const message = messageId + timestamp + body;
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', TWITCH_WEBHOOK_SECRET)
        .update(message)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();

        // Get Twitch headers
        const messageId = request.headers.get('Twitch-Eventsub-Message-Id') || '';
        const timestamp = request.headers.get('Twitch-Eventsub-Message-Timestamp') || '';
        const signature = request.headers.get('Twitch-Eventsub-Message-Signature') || '';
        const messageType = request.headers.get('Twitch-Eventsub-Message-Type') || '';

        console.log('[Twitch Webhook] Received:', { messageType, messageId });

        // Verify signature
        if (signature && !verifyTwitchSignature(messageId, timestamp, rawBody, signature)) {
            console.error('[Twitch Webhook] Invalid signature');
            return new NextResponse('Invalid signature', { status: 403 });
        }

        const data = JSON.parse(rawBody);

        // Handle subscription verification challenge
        if (messageType === 'webhook_callback_verification') {
            const challenge = data.challenge;
            console.log('[Twitch Webhook] Verification challenge received');

            // Update subscription status in database
            const subscription = data.subscription;
            if (subscription) {
                await pool.query(`
                    INSERT INTO twitch_subscriptions (subscription_id, broadcaster_id, subscription_type, status)
                    VALUES (?, ?, ?, 'enabled')
                    ON DUPLICATE KEY UPDATE status = 'enabled', updated_at = CURRENT_TIMESTAMP
                `, [
                    subscription.id,
                    subscription.condition?.broadcaster_user_id || '',
                    subscription.type
                ]);
            }

            return new NextResponse(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // Handle notification
        if (messageType === 'notification') {
            const subscription = data.subscription;
            const event = data.event;

            console.log('[Twitch Webhook] Event received:', {
                type: subscription?.type,
                broadcaster: event?.broadcaster_user_login
            });

            if (subscription?.type === 'stream.online') {
                // Stream went online
                await pool.query(`
                    INSERT INTO twitch_live_events 
                    (broadcaster_id, broadcaster_login, broadcaster_name, started_at, event_type, raw_json)
                    VALUES (?, ?, ?, ?, 'stream.online', ?)
                `, [
                    event.broadcaster_user_id,
                    event.broadcaster_user_login,
                    event.broadcaster_user_name,
                    event.started_at ? new Date(event.started_at) : new Date(),
                    rawBody.substring(0, 10000)
                ]);

                console.log('[Twitch Webhook] Stream online event stored for:', event.broadcaster_user_login);
            }

            if (subscription?.type === 'stream.offline') {
                // Stream went offline
                await pool.query(`
                    INSERT INTO twitch_live_events 
                    (broadcaster_id, broadcaster_login, broadcaster_name, event_type, raw_json)
                    VALUES (?, ?, ?, 'stream.offline', ?)
                `, [
                    event.broadcaster_user_id,
                    event.broadcaster_user_login,
                    event.broadcaster_user_name,
                    rawBody.substring(0, 10000)
                ]);

                console.log('[Twitch Webhook] Stream offline event stored');
            }

            return NextResponse.json({ status: 'received' });
        }

        // Handle revocation
        if (messageType === 'revocation') {
            const subscription = data.subscription;
            console.log('[Twitch Webhook] Subscription revoked:', subscription?.id);

            if (subscription?.id) {
                await pool.query(
                    'UPDATE twitch_subscriptions SET status = ? WHERE subscription_id = ?',
                    ['disabled', subscription.id]
                );
            }

            return NextResponse.json({ status: 'acknowledged' });
        }

        return NextResponse.json({ status: 'unknown_message_type' });

    } catch (error: any) {
        console.error('[Twitch Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET: Health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'twitch-webhook',
        timestamp: new Date().toISOString()
    });
}
