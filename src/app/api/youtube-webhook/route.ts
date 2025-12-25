import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

/**
 * Check if a video is a live broadcast using YouTube Data API
 * Returns: 'upcoming' | 'live' | 'none'
 */
async function checkLiveBroadcastStatus(videoId: string): Promise<'upcoming' | 'live' | 'none'> {
    if (!YOUTUBE_API_KEY) {
        console.warn('[YouTube Webhook] No API key, cannot check broadcast status');
        return 'none';
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.error('[YouTube Webhook] API error:', response.status);
            return 'none';
        }

        const data = await response.json();
        const items = data.items || [];

        if (items.length === 0) {
            return 'none';
        }

        const snippet = items[0].snippet || {};
        const liveBroadcastContent = snippet.liveBroadcastContent; // 'upcoming', 'live', or 'none'

        console.log(`[YouTube Webhook] Video ${videoId} broadcast status: ${liveBroadcastContent}`);
        return liveBroadcastContent || 'none';

    } catch (error) {
        console.error('[YouTube Webhook] Error checking broadcast status:', error);
        return 'none';
    }
}

/**
 * YouTube PubSubHubbub Webhook Endpoint
 * 
 * Handles:
 * 1. GET: Hub verification (challenge response)
 * 2. POST: Receive feed updates when a channel goes live or uploads
 */

// GET: Handle PubSubHubbub subscription verification
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const topic = searchParams.get('hub.topic');
    const challenge = searchParams.get('hub.challenge');
    const leaseSeconds = searchParams.get('hub.lease_seconds');

    console.log('[YouTube Webhook] Verification request:', { mode, topic, challenge: challenge?.substring(0, 10) + '...' });

    if (mode === 'subscribe' || mode === 'unsubscribe') {
        if (!challenge) {
            console.error('[YouTube Webhook] No challenge provided');
            return new NextResponse('Missing challenge', { status: 400 });
        }

        // Extract channel ID from topic URL
        // Topic format: https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID
        const channelIdMatch = topic?.match(/channel_id=([^&]+)/);
        const channelId = channelIdMatch ? channelIdMatch[1] : null;

        if (channelId) {
            try {
                const now = new Date();
                const expiresAt = leaseSeconds
                    ? new Date(now.getTime() + parseInt(leaseSeconds) * 1000)
                    : new Date(now.getTime() + 432000 * 1000); // 5 days default

                await pool.query(`
                    INSERT INTO youtube_subscriptions (channel_id, hub_topic, hub_lease_seconds, subscribed_at, expires_at, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        hub_topic = VALUES(hub_topic),
                        hub_lease_seconds = VALUES(hub_lease_seconds),
                        subscribed_at = VALUES(subscribed_at),
                        expires_at = VALUES(expires_at),
                        status = VALUES(status),
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    channelId,
                    topic,
                    leaseSeconds || 432000,
                    now,
                    expiresAt,
                    mode === 'subscribe' ? 'active' : 'unsubscribed'
                ]);

                console.log(`[YouTube Webhook] ${mode} confirmed for channel: ${channelId}`);
            } catch (error) {
                console.error('[YouTube Webhook] Database error:', error);
            }
        }

        // Return the challenge to confirm subscription
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    return new NextResponse('Invalid request', { status: 400 });
}

// POST: Receive feed updates (live stream / new video notifications)
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('application/atom+xml') && !contentType.includes('text/xml')) {
            console.warn('[YouTube Webhook] Unexpected content type:', contentType);
        }

        const rawBody = await request.text();
        console.log('[YouTube Webhook] Received notification, body length:', rawBody.length);

        // Parse the Atom XML feed
        const videoData = parseAtomFeed(rawBody);

        if (videoData && videoData.videoId) {
            console.log('[YouTube Webhook] Parsed video:', {
                videoId: videoData.videoId,
                channelId: videoData.channelId,
                title: videoData.title?.substring(0, 50) + '...'
            });

            // Check if this is a deletion notification
            if (rawBody.includes('at:deleted-entry')) {
                console.log('[YouTube Webhook] Video deleted notification, ignoring');
                return NextResponse.json({ status: 'ignored', reason: 'deleted' });
            }

            // Check live broadcast status via YouTube API
            const eventType = await checkLiveBroadcastStatus(videoData.videoId);
            console.log(`[YouTube Webhook] Determined event type: ${eventType}`);

            // Store the event in database for bot to process
            await pool.query(`
                INSERT INTO youtube_live_events 
                (channel_id, video_id, video_title, channel_name, published_at, event_type, raw_xml)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    video_title = VALUES(video_title),
                    channel_name = VALUES(channel_name),
                    event_type = VALUES(event_type),
                    raw_xml = VALUES(raw_xml)
            `, [
                videoData.channelId,
                videoData.videoId,
                videoData.title,
                videoData.authorName,
                videoData.published ? new Date(videoData.published) : new Date(),
                eventType, // Now using actual broadcast status: 'upcoming', 'live', or 'none' (video)
                rawBody.substring(0, 10000) // Limit raw XML size
            ]);

            console.log('[YouTube Webhook] Event stored successfully with type:', eventType);
            return NextResponse.json({
                status: 'received',
                videoId: videoData.videoId,
                eventType: eventType
            });
        }

        console.warn('[YouTube Webhook] Could not parse video data from feed');
        return NextResponse.json({ status: 'parsed', message: 'No video data found' });

    } catch (error: any) {
        console.error('[YouTube Webhook] Error processing notification:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Parse Atom XML feed from YouTube PubSubHubbub
 */
function parseAtomFeed(xml: string): {
    videoId: string | null;
    channelId: string | null;
    title: string | null;
    authorName: string | null;
    published: string | null;
    updated: string | null;
    link: string | null;
} | null {
    try {
        // Extract video ID
        const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        // Extract channel ID
        const channelIdMatch = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
        const channelId = channelIdMatch ? channelIdMatch[1] : null;

        // Extract title
        const titleMatch = xml.match(/<title>([^<]+)<\/title>/);
        const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : null;

        // Extract author name
        const authorMatch = xml.match(/<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/);
        const authorName = authorMatch ? decodeXmlEntities(authorMatch[1]) : null;

        // Extract published date
        const publishedMatch = xml.match(/<published>([^<]+)<\/published>/);
        const published = publishedMatch ? publishedMatch[1] : null;

        // Extract updated date
        const updatedMatch = xml.match(/<updated>([^<]+)<\/updated>/);
        const updated = updatedMatch ? updatedMatch[1] : null;

        // Extract link
        const linkMatch = xml.match(/<link rel="alternate" href="([^"]+)"/);
        const link = linkMatch ? linkMatch[1] : null;

        return { videoId, channelId, title, authorName, published, updated, link };
    } catch (error) {
        console.error('[YouTube Webhook] XML parsing error:', error);
        return null;
    }
}

/**
 * Decode XML entities
 */
function decodeXmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}
